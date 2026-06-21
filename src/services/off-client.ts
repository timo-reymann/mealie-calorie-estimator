import { config } from "../config.js"
import { logger } from "../utils/logger.js"
import { getCachedNutrients, setCachedNutrients } from "../utils/cache.js"
import { waitForRateLimit, RateLimitType } from "../utils/rate-limiter.js"
import type { OffNutriments, OffProduct, OffSearchResult, NutrientSet } from "../types.js"

export interface OffLookupResult {
  nutrients: NutrientSet | null
  matched: boolean
  productName: string | null
}

const OFF_NUTRIENT_FIELDS = ["product_name", "nutriments"].join(",")

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

async function fetchWithRetry(url: string, query: string): Promise<Response | null> {
  const { maxRetries, retryBackoffMs, userAgent } = config.openFoodFacts
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = retryBackoffMs * 2 ** (attempt - 1)
      logger.debug({ query, attempt, delay }, "Retrying OFF search after backoff")
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    try {
      const res = await fetch(url, { headers: { "User-Agent": userAgent } })
      if (res.ok || !RETRYABLE_STATUS.has(res.status)) {
        return res
      }
      lastResponse = res
      logger.debug({ query, attempt, status: res.status }, "OFF search returned retryable status")
    } catch (err) {
      lastResponse = null
      logger.debug({ query, attempt, err: (err as Error).message }, "OFF search request failed")
    }
  }

  return lastResponse
}

function extractNutrients(n: OffNutriments): NutrientSet {
  const fat = n["fat_100g"] ?? null
  const saturated = n["saturated-fat_100g"] ?? null
  const trans = n["trans-fat_100g"] ?? null

  let unsaturated: number | null = null
  if (fat !== null) {
    const s = saturated ?? 0
    const t = trans ?? 0
    unsaturated = Math.round((fat - s - t) * 10) / 10
  }

  return {
    kcalPer100g: n["energy-kcal_100g"] ?? null,
    proteinPer100g: n["proteins_100g"] ?? null,
    carbsPer100g: n["carbohydrates_100g"] ?? null,
    fatPer100g: fat,
    saturatedFatPer100g: saturated,
    transFatPer100g: trans,
    unsaturatedFatPer100g: unsaturated,
    fiberPer100g: n["fiber_100g"] ?? null,
    sugarPer100g: n["sugars_100g"] ?? null,
    sodiumPer100g: n["sodium_100g"] ?? null,
    cholesterolPer100g: n["cholesterol_100g"] ?? null,
  }
}

async function searchProduct(query: string): Promise<OffProduct | null> {
  const params = new URLSearchParams({
    q: query,
    langs: config.openFoodFacts.language,
    page_size: "1",
    fields: OFF_NUTRIENT_FIELDS,
  })

  const url = `${config.openFoodFacts.searchBaseUrl}/search?${params}`

  await waitForRateLimit(RateLimitType.Search)

  const res = await fetchWithRetry(url, query)

  if (!res) {
    logger.warn({ query }, "OFF search failed after retries")
    return null
  }

  if (!res.ok) {
    logger.warn({ status: res.status, query }, "OFF search returned error")
    return null
  }

  let data: OffSearchResult
  try {
    data = (await res.json()) as OffSearchResult
  } catch {
    logger.warn({ query }, "OFF returned non-JSON response")
    return null
  }

  if (!data.hits || data.hits.length === 0) {
    return null
  }

  return data.hits[0]
}

export async function lookupNutrients(foodName: string, unitName?: string): Promise<OffLookupResult> {
  const cached = getCachedNutrients(foodName)
  if (cached) {
    logger.debug({ foodName }, "Cache hit for food")
    return { nutrients: cached, matched: true, productName: foodName }
  }

  let searchTerm = foodName
  if (unitName && searchTerm.toLowerCase().startsWith(unitName.toLowerCase())) {
    searchTerm = searchTerm.slice(unitName.length).trim()
  }

  const product = await searchProduct(searchTerm)

  if (!product) {
    logger.debug({ foodName }, "No OFF match found")
    return { nutrients: null, matched: false, productName: null }
  }

  if (!product.nutriments) {
    logger.debug({ foodName, product: product.product_name }, "OFF match has no nutrient data")
    return { nutrients: null, matched: false, productName: product.product_name }
  }

  const nutrients = extractNutrients(product.nutriments)

  if (nutrients.kcalPer100g === null) {
    logger.debug({ foodName, product: product.product_name }, "OFF match has no kcal data")
    return { nutrients: null, matched: false, productName: product.product_name }
  }

  logger.debug({ foodName, product: product.product_name }, "OFF match found")
  setCachedNutrients(foodName, nutrients)
  return { nutrients, matched: true, productName: product.product_name }
}
