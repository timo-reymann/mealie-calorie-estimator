import type { FastifyInstance } from "fastify"
import { getAllRecipes, getRecipe, getRecipeHouseholdId, patchRecipe } from "../services/mealie-client.js"
import {
  computeIngredientHash,
  hasManualCalories,
  buildManualAckPatch,
  shouldEstimate,
} from "../services/estimator.js"
import { perServingFromRecipeNutrition, tagsAreComplete, resolveAndMergeTags, estimateAndTag } from "../services/tagging.js"
import { logger } from "../utils/logger.js"
import { slugQueue } from "../utils/slug-queue.js"

async function processBackfill(): Promise<void> {
  try {
    const allSlugs = await getAllRecipes()
    let processed = 0
    let updated = 0
    let skipped = 0
    let manual = 0
    let errors = 0
    let tagOnly = 0
    let filtered = 0

    for (const slug of allSlugs) {
      processed++

      try {
        await slugQueue.runNow(slug, async () => {
          const recipe = await getRecipe(slug)

          if (!shouldEstimate(recipe)) {
            filtered++
            return
          }

          const householdId = getRecipeHouseholdId(recipe)
          const hash = computeIngredientHash(recipe)
          const existingHash = recipe.extras?.calorie_estimator_hash

          if (existingHash === hash) {
            if (tagsAreComplete(recipe)) {
              skipped++
              return
            }

            const perServing = perServingFromRecipeNutrition(recipe.nutrition)
            const { tags, tagSlugs } = await resolveAndMergeTags(recipe, perServing, householdId)
            await patchRecipe(slug, {
              tags,
              extras: { ...recipe.extras, calorie_estimator_tags: JSON.stringify(tagSlugs) },
            }, householdId)
            tagOnly++
            return
          }

          if (hasManualCalories(recipe)) {
            const patch = buildManualAckPatch(recipe, hash)
            await patchRecipe(slug, patch, householdId)
            manual++
            return
          }

          await estimateAndTag(recipe, hash, householdId)
          updated++
        })
      } catch (err) {
        errors++
        logger.error({ slug, err }, "Backfill error for recipe")
      }

      if (processed % 10 === 0) {
        logger.info({ processed, total: allSlugs.length, updated, skipped, manual, tagOnly, filtered, errors }, "Backfill progress")
      }
    }

    logger.info({ processed, total: allSlugs.length, updated, skipped, manual, tagOnly, filtered, errors }, "Backfill complete")
  } catch (err) {
    logger.error({ err }, "Backfill background processing failed")
  }
}

export async function backfillRoutes(app: FastifyInstance): Promise<void> {
  app.post("/backfill", async (req, reply) => {
    logger.info("Backfill requested")

    reply.status(202).send({ status: "accepted" })

    setImmediate(() => processBackfill())
  })
}
