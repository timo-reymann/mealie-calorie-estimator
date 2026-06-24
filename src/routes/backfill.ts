import type { FastifyInstance } from "fastify"
import { getAllRecipes, getRecipe, patchRecipe } from "../services/mealie-client.js"
import {
  computeIngredientHash,
  hasManualCalories,
  buildManualAckPatch,
} from "../services/estimator.js"
import { perServingFromRecipeNutrition, tagsAreComplete, resolveAndMergeTags, estimateAndTag } from "../services/tagging.js"
import { logger } from "../utils/logger.js"

async function processBackfill(): Promise<void> {
  try {
    const allSlugs = await getAllRecipes()
    let processed = 0
    let updated = 0
    let skipped = 0
    let manual = 0
    let errors = 0
    let tagOnly = 0

    for (const slug of allSlugs) {
      processed++

      try {
        const recipe = await getRecipe(slug)
        const hash = computeIngredientHash(recipe)
        const existingHash = recipe.extras?.calorie_estimator_hash

        if (existingHash === hash) {
          if (tagsAreComplete(recipe)) {
            skipped++
            continue
          }

          const perServing = perServingFromRecipeNutrition(recipe.nutrition)
          const { tags, tagSlugs } = await resolveAndMergeTags(recipe, perServing, recipe.householdId)
          await patchRecipe(slug, {
            tags,
            extras: { ...recipe.extras, calorie_estimator_tags: JSON.stringify(tagSlugs) },
          }, recipe.householdId)
          tagOnly++
          continue
        }

        if (hasManualCalories(recipe)) {
          const patch = buildManualAckPatch(recipe, hash)
          await patchRecipe(slug, patch, recipe.householdId)
          manual++
          continue
        }

        await estimateAndTag(recipe, hash, recipe.householdId)
        updated++
      } catch (err) {
        errors++
        logger.error({ slug, err }, "Backfill error for recipe")
      }

      if (processed % 10 === 0) {
        logger.info({ processed, total: allSlugs.length, updated, skipped, manual, tagOnly, errors }, "Backfill progress")
      }
    }

    logger.info({ processed, total: allSlugs.length, updated, skipped, manual, tagOnly, errors }, "Backfill complete")
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
