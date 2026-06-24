import type { FastifyInstance } from "fastify"
import { getRecipe, getRecipeHouseholdId } from "../services/mealie-client.js"
import { computeIngredientHash } from "../services/estimator.js"
import { estimateAndTag } from "../services/tagging.js"
import { logger } from "../utils/logger.js"

async function processEstimate(slug: string): Promise<void> {
  try {
    logger.info({ slug }, "On-demand estimation processing")

    const recipe = await getRecipe(slug)
    const householdId = getRecipeHouseholdId(recipe)
    const hash = computeIngredientHash(recipe)
    const { calories, tagSlugs } = await estimateAndTag(recipe, hash, householdId)

    logger.info({ slug, calories, tags: tagSlugs }, "On-demand estimation complete")
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
