import { config } from "../config.js"
import { logger } from "../utils/logger.js"
import { getCachedLlmEstimate, setCachedLlmEstimate, getCachedLlmNutrients, setCachedLlmNutrients } from "../utils/cache.js"
import { waitForRateLimit, RateLimitType } from "../utils/rate-limiter.js"
import type { NutrientSet } from "../types.js"

export async function estimateGrams(quantity: number, unitName: string, foodName: string): Promise<number | null> {
  if (!config.llm.enabled) return null
  if (!config.llm.apiKey) {
    logger.warn("LLM enabled but LLM_API_KEY is not set")
    return null
  }

  const cached = getCachedLlmEstimate(unitName, foodName)
  if (cached !== undefined) {
    const totalGrams = cached * quantity
    logger.debug({ unitName, foodName, gramsPerUnit: cached, totalGrams }, "LLM estimate cache hit")
    return totalGrams
  }

  const prompt = `Estimate the weight in grams for 1 ${unitName} of ${foodName}. Consider typical packaging sizes and food densities. Return ONLY a single number (the weight in grams). No explanation, no unit, no punctuation. If you cannot estimate, return 0.`

  try {
    await waitForRateLimit(RateLimitType.Llm)

    const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 10,
      }),
    })

    if (!res.ok) {
      logger.warn({ status: res.status, unitName, foodName }, "LLM API returned error")
      return null
    }

    const data: any = await res.json()
    const content = data?.choices?.[0]?.message?.content

    if (content == null) {
      logger.warn({ unitName, foodName }, "LLM returned empty response")
      return null
    }

    const trimmed = content.trim()
    const num = parseInt(trimmed, 10)

    if (isNaN(num) || num <= 0) {
      logger.warn({ unitName, foodName, llmResponse: trimmed }, "LLM returned invalid number")
      return null
    }

    const gramsPerUnit = num
    const totalGrams = gramsPerUnit * quantity

    setCachedLlmEstimate(unitName, foodName, gramsPerUnit)
    logger.debug({ unitName, foodName, gramsPerUnit, totalGrams }, "LLM estimate obtained")

    return totalGrams
  } catch (err) {
    logger.warn({ err, unitName, foodName }, "LLM estimation failed")
    return null
  }
}

export async function estimateNutrients(foodName: string): Promise<NutrientSet | null> {
  if (!config.llm.enabled || !config.llm.apiKey) return null

  const cached = getCachedLlmNutrients(foodName)
  if (cached) {
    logger.debug({ foodName }, "LLM nutrient cache hit")
    return cached
  }

  const prompt = `Estimate nutritional values per 100g for "${foodName}". Return ONLY valid JSON with these keys (all numbers, no units): {"kcal":0,"protein":0,"carbs":0,"fat":0,"saturatedFat":0,"transFat":0,"fiber":0,"sugar":0,"sodium":0,"cholesterol":0}. Use typical values for the food. No explanation, no markdown.`

  try {
    await waitForRateLimit(RateLimitType.Llm)

    const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!res.ok) {
      logger.warn({ status: res.status, foodName }, "LLM nutrient API returned error")
      return null
    }

    const data: any = await res.json()
    const content = data?.choices?.[0]?.message?.content?.trim()

    if (!content) {
      logger.warn({ foodName }, "LLM nutrient returned empty response")
      return null
    }

    const json = JSON.parse(content.replace(/```json\n?|\n?```/g, ""))

    const nutrients: NutrientSet = {
      kcalPer100g: Number(json.kcal) || null,
      proteinPer100g: Number(json.protein) || null,
      carbsPer100g: Number(json.carbs) || null,
      fatPer100g: Number(json.fat) || null,
      saturatedFatPer100g: Number(json.saturatedFat) || null,
      transFatPer100g: Number(json.transFat) || null,
      unsaturatedFatPer100g: null,
      fiberPer100g: Number(json.fiber) || null,
      sugarPer100g: Number(json.sugar) || null,
      sodiumPer100g: Number(json.sodium) || null,
      cholesterolPer100g: Number(json.cholesterol) || null,
    }

    if (nutrients.fatPer100g !== null) {
      const s = nutrients.saturatedFatPer100g ?? 0
      const t = nutrients.transFatPer100g ?? 0
      nutrients.unsaturatedFatPer100g = Math.round((nutrients.fatPer100g - s - t) * 10) / 10
    }

    if (nutrients.kcalPer100g !== null && nutrients.kcalPer100g > 0) {
      setCachedLlmNutrients(foodName, nutrients)
      logger.debug({ foodName, kcal: nutrients.kcalPer100g }, "LLM nutrient estimate obtained")
      return nutrients
    }

    logger.debug({ foodName, content }, "LLM returned zero kcal, discarding")
    return null
  } catch (err) {
    logger.warn({ err, foodName }, "LLM nutrient estimation failed")
    return null
  }
}
