import type { FastifyInstance } from "fastify"
import { getRecipe, getRecipeHouseholdId } from "../services/mealie-client.js"
import { computeIngredientHash, shouldEstimate } from "../services/estimator.js"
import { estimateAndTag } from "../services/tagging.js"
import { logger } from "../utils/logger.js"
import { slugQueue } from "../utils/slug-queue.js"
import { recordStart } from "../utils/execution-history.js"

async function processEstimate(slug: string): Promise<void> {
  const handle = recordStart({ trigger: "estimate", slug })

  try {
    logger.info({ slug }, "On-demand estimation processing")

    const recipe = await getRecipe(slug)
    handle.setRecipe(recipe.name, getRecipeHouseholdId(recipe))

    if (!shouldEstimate(recipe)) {
      logger.info({ slug }, "Recipe skipped (not tagged for estimation)")
      handle.complete("filtered", ["Recipe not tagged for estimation"])
      return
    }

    const householdId = getRecipeHouseholdId(recipe)
    const hash = computeIngredientHash(recipe)
    const { calories, tagSlugs, perServingNutrients, matchedCount, unmatchedCount } =
      await estimateAndTag(recipe, hash, householdId)

    logger.info({ slug, calories, tags: tagSlugs }, "On-demand estimation complete")
    handle.complete("processed", [
      `Set calories: ${calories ?? "?"} kcal/serving`,
      `Auto-tags: ${tagSlugs.join(", ")}`,
    ], { nutrients: perServingNutrients, matchedCount, unmatchedCount })
  } catch (err) {
    logger.error({ slug, err }, "Estimate background processing failed")
    handle.fail(err)
  }
}

export function estimateRoutes(app: FastifyInstance): void {
  app.post<{ Params: { slug: string } }>("/estimate", (req, reply) => {
    const { slug } = (req as any).body.content as any

    logger.info({ slug }, "On-demand estimation requested")

    reply.status(202).send({ status: "accepted" })

    void slugQueue
      .run(slug, "estimate", () => processEstimate(slug))
      .catch((err) => logger.error({ slug, err }, "Estimate task failed"))
  })
}
