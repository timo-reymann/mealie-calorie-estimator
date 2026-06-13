import type { FastifyInstance } from "fastify"
import { getAllRecipes, getRecipe, patchRecipe } from "../services/mealie-client.js"
import {
  computeIngredientHash,
  estimateRecipe,
  buildNutritionPatch,
  hasManualCalories,
  buildManualAckPatch,
} from "../services/estimator.js"
import { perServingFromRecipeNutrition, resolveAutoTags, mergeTags } from "../services/tagging.js"
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
          const perServing = perServingFromRecipeNutrition(recipe.nutrition)
          const { tags: autoTags } = await resolveAutoTags(recipe, perServing)
          const existingAutoSlugs: string[] = JSON.parse(recipe.extras?.calorie_estimator_tags || "[]")
          const currentTagSlugs = (recipe.tags || []).map(t => t.slug)

          if (existingAutoSlugs.length > 0 && existingAutoSlugs.every(s => currentTagSlugs.includes(s))) {
            skipped++
            continue
          }

          const merged = mergeTags(recipe, autoTags, existingAutoSlugs)
          await patchRecipe(slug, {
            tags: merged,
            extras: {
              ...recipe.extras,
              calorie_estimator_tags: JSON.stringify(autoTags.map(t => t.slug)),
            },
          })
          tagOnly++
          continue
        }

        if (hasManualCalories(recipe)) {
          const patch = buildManualAckPatch(recipe, hash)
          await patchRecipe(slug, patch)
          manual++
          continue
        }

        const result = await estimateRecipe(recipe)
        const nutritionPatch = buildNutritionPatch(result, hash, recipe.recipeYield)

        const { tags: autoTags, slugs: oldAutoSlugs } = await resolveAutoTags(recipe, result.perServingNutrients)
        const merged = mergeTags(recipe, autoTags, oldAutoSlugs)

        await patchRecipe(slug, {
          ...nutritionPatch,
          tags: merged,
          extras: {
            ...nutritionPatch.extras,
            calorie_estimator_tags: JSON.stringify(autoTags.map(t => t.slug)),
          },
        })
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
