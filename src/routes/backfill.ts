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
import { recordStart } from "../utils/execution-history.js"

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

    const processSlug = async (slug: string): Promise<void> => {
      processed++
      const handle = recordStart({ trigger: "backfill", slug })

      try {
        await slugQueue.runNow(slug, async () => {
          const recipe = await getRecipe(slug)
          handle.setRecipe(recipe.name, getRecipeHouseholdId(recipe))

          if (!shouldEstimate(recipe)) {
            filtered++
            handle.complete("filtered", ["Recipe not tagged for estimation"])
            return
          }

          const householdId = getRecipeHouseholdId(recipe)
          const hash = computeIngredientHash(recipe)
          const existingHash = recipe.extras?.calorie_estimator_hash

          if (existingHash === hash) {
            if (tagsAreComplete(recipe)) {
              skipped++
              handle.complete("skipped", ["Ingredients unchanged, tags already applied"])
              return
            }

            const perServing = perServingFromRecipeNutrition(recipe.nutrition)
            const { tags, tagSlugs } = await resolveAndMergeTags(recipe, perServing, householdId)
            await patchRecipe(slug, {
              tags,
              extras: { ...recipe.extras, calorie_estimator_tags: JSON.stringify(tagSlugs) },
            }, householdId)
            tagOnly++
            handle.complete("tags-added", [`Added auto-tags: ${tagSlugs.join(", ")}`])
            return
          }

          if (hasManualCalories(recipe)) {
            const patch = buildManualAckPatch(recipe, hash)
            await patchRecipe(slug, patch, householdId)
            manual++
            handle.complete("manual", [
              `Preserved manual calories: ${recipe.nutrition?.calories ?? "?"} kcal`,
            ])
            return
          }

          const { calories, tagSlugs, perServingNutrients, matchedCount, unmatchedCount } =
            await estimateAndTag(recipe, hash, householdId)
          updated++
          handle.complete("processed", [
            `Set calories: ${calories ?? "?"} kcal/serving`,
            `Auto-tags: ${tagSlugs.join(", ")}`,
          ], { nutrients: perServingNutrients, matchedCount, unmatchedCount })
        })
      } catch (err) {
        errors++
        handle.fail(err)
        logger.error({ slug, err }, "Backfill error for recipe")
      }

      if (processed % 10 === 0) {
        logger.info({ processed, total: allSlugs.length, updated, skipped, manual, tagOnly, filtered, errors }, "Backfill progress")
      }
    }

    let pending: Promise<void> = Promise.resolve()
    for (const slug of allSlugs) {
      pending = pending.then(() => processSlug(slug))
    }
    await pending

    logger.info({ processed, total: allSlugs.length, updated, skipped, manual, tagOnly, filtered, errors }, "Backfill complete")
  } catch (err) {
    logger.error({ err }, "Backfill background processing failed")
  }
}

export function backfillRoutes(app: FastifyInstance): void {
  app.post("/backfill", (req, reply) => {
    logger.info("Backfill requested")

    reply.status(202).send({ status: "accepted" })

    setImmediate(() => processBackfill())
  })
}
