import type { FastifyInstance } from "fastify"
import type { AppriseWebhookPayload, EventRecipeData } from "../types.js"
import { getRecipe, getRecipeHouseholdId, patchRecipe } from "../services/mealie-client.js"
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
  const handle = recordStart({ trigger: "webhook", slug })

  try {
    const recipe = await getRecipe(slug)
    handle.setRecipe(recipe.name, getRecipeHouseholdId(recipe))

    if (!shouldEstimate(recipe)) {
      logger.info({ slug }, "Recipe skipped (not tagged for estimation)")
      handle.complete("filtered", ["Recipe not tagged for estimation"])
      return
    }

    const householdId = getRecipeHouseholdId(recipe)

    const hash = computeIngredientHash(recipe)
    const existingHash = recipe.extras?.calorie_estimator_hash

    if (existingHash === hash) {
      if (tagsAreComplete(recipe)) {
        logger.info({ slug }, "Tags up to date, skipping")
        handle.complete("skipped", ["Ingredients unchanged, tags already applied"])
        return
      }

      const perServing = perServingFromRecipeNutrition(recipe.nutrition)
      const { tags, tagSlugs } = await resolveAndMergeTags(recipe, perServing, householdId)
      await patchRecipe(slug, {
        tags,
        extras: { ...recipe.extras, calorie_estimator_tags: JSON.stringify(tagSlugs) },
      }, householdId)
      logger.info({ slug, tags: tagSlugs }, "Added missing auto-tags")
      handle.complete("tags-added", [`Added auto-tags: ${tagSlugs.join(", ")}`])
      return
    }

    if (hasManualCalories(recipe)) {
      logger.info({ slug, calories: recipe.nutrition?.calories }, "Manual calories detected, acknowledging without overwriting")
      const patch = buildManualAckPatch(recipe, hash)
      await patchRecipe(slug, patch, householdId)
      handle.complete("manual", [
        `Preserved manual calories: ${recipe.nutrition?.calories ?? "?"} kcal`,
      ])
      return
    }

    const { calories, tagSlugs, perServingNutrients, matchedCount, unmatchedCount } =
      await estimateAndTag(recipe, hash, householdId)
    logger.info({ slug, calories, tags: tagSlugs }, "Updated recipe nutrition and tags")
    handle.complete("processed", [
      `Set calories: ${calories ?? "?"} kcal/serving`,
      `Auto-tags: ${tagSlugs.join(", ")}`,
    ], { nutrients: perServingNutrients, matchedCount, unmatchedCount })
  } catch (err) {
    logger.error({ slug, err }, "Webhook background processing failed")
    handle.fail(err)
  }
}

export function webhookRoutes(app: FastifyInstance): void {
  app.post<{ Body: AppriseWebhookPayload }>("/webhook", (req, reply) => {
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

    void slugQueue
      .run(slug, "webhook", () => processWebhook(slug))
      .catch((err) => logger.error({ slug, err }, "Webhook task failed"))
  })
}
