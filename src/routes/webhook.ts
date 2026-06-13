import type { FastifyInstance } from "fastify"
import type { AppriseWebhookPayload, EventRecipeData } from "../types.js"
import { getRecipe, patchRecipe } from "../services/mealie-client.js"
import {
  computeIngredientHash,
  estimateRecipe,
  buildNutritionPatch,
  hasManualCalories,
  buildManualAckPatch,
} from "../services/estimator.js"
import { logger } from "../utils/logger.js"

function isEventRecipeData(v: unknown): v is EventRecipeData {
  if (typeof v !== "object" || v === null) return false
  const o = v as Record<string, unknown>
  return typeof (o.recipe_slug ?? o.recipeSlug) === "string"
    && typeof (o.document_type ?? o.documentType) === "string"
}

function normalizeEventData(raw: Record<string, unknown>): EventRecipeData {
  return {
    document_type: String(raw.document_type ?? raw.documentType),
    operation: String(raw.operation ?? ""),
    recipe_slug: String(raw.recipe_slug ?? raw.recipeSlug),
  }
}

async function processWebhook(slug: string): Promise<void> {
  try {
    const recipe = await getRecipe(slug)

    const hash = computeIngredientHash(recipe)
    const existingHash = recipe.extras?.calorie_estimator_hash

    if (existingHash === hash) {
      logger.info({ slug }, "Ingredients and servings unchanged, skipping estimation")
      return
    }

    if (hasManualCalories(recipe)) {
      logger.info({ slug, calories: recipe.nutrition?.calories }, "Manual calories detected, acknowledging without overwriting")
      const patch = buildManualAckPatch(recipe, hash)
      await patchRecipe(slug, patch)
      return
    }

    const result = await estimateRecipe(recipe)
    const patch = buildNutritionPatch(result, hash, recipe.recipeYield)
    await patchRecipe(slug, patch)

    logger.info({ slug, calories: result.perServingNutrients.kcalPer100g }, "Updated recipe nutrition")
  } catch (err) {
    logger.error({ slug, err }, "Webhook background processing failed")
  }
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: AppriseWebhookPayload }>("/webhook", async (req, reply) => {
    const { document_data, event_type } = req.body

    logger.info({ event_type, document_data }, "Received webhook event")

    if (!document_data) {
      logger.warn("Webhook missing document_data")
      return reply.status(400).send({ error: "Missing document_data" })
    }

    let parsed: unknown
    if (typeof document_data === "string") {
      try {
        parsed = JSON.parse(decodeURIComponent(document_data.replace(/\+/g, " ")))
      } catch {
        logger.warn({ document_data }, "Webhook invalid document_data JSON")
        return reply.status(400).send({ error: "Invalid document_data JSON" })
      }
    } else {
      parsed = document_data
    }

    if (!isEventRecipeData(parsed)) {
      logger.warn({ document_data }, "Webhook invalid document_data")
      return reply.status(400).send({ error: "Invalid document_data" })
    }

    const eventData = normalizeEventData(parsed as unknown as Record<string, unknown>)

    if (eventData.document_type !== "recipe") {
      logger.debug({ document_type: eventData.document_type }, "Skipping non-recipe event")
      return reply.status(200).send({ status: "skipped", reason: "not a recipe event" })
    }

    const slug = eventData.recipe_slug

    reply.status(202).send({ status: "accepted" })

    setImmediate(() => processWebhook(slug))
  })
}
