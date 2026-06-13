import type { FastifyInstance } from "fastify"
import { getRecipe, patchRecipe } from "../services/mealie-client.js"
import { computeIngredientHash, estimateRecipe, buildNutritionPatch } from "../services/estimator.js"
import { logger } from "../utils/logger.js"

async function processEstimate(slug: string): Promise<void> {
  try {
    logger.info({ slug }, "On-demand estimation processing")

    const recipe = await getRecipe(slug)
    const hash = computeIngredientHash(recipe)
    const result = await estimateRecipe(recipe)
    const patch = buildNutritionPatch(result, hash, recipe.recipeYield)
    await patchRecipe(slug, patch)

    logger.info({ slug, calories: result.perServingNutrients.kcalPer100g }, "On-demand estimation complete")
  } catch (err) {
    logger.error({ slug, err }, "Estimate background processing failed")
  }
}

export async function estimateRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { slug: string } }>("/estimate", async (req, reply) => {
    const { slug } = (req as any).body.content as any

    logger.info({ slug }, "On-demand estimation requested")

    reply.status(202).send({ status: "accepted" })

    setImmediate(() => processEstimate(slug))
  })
}
