import { config } from "../config.js"
import { logger } from "../utils/logger.js"
import { getCachedNutrients, setCachedNutrients } from "../utils/cache.js"
import { waitForRateLimit, RateLimitType } from "../utils/rate-limiter.js"
import type { OffNutriments, OffProduct, NutrientSet } from "../types.js"

export interface OffLookupResult {
  nutrients: NutrientSet | null
  matched: boolean
  productName: string | null
}

const OFF_NUTRIENT_FIELDS = [
  "product_name",
  "nutriments.energy-kcal_100g",
  "nutriments.proteins_100g",
  "nutriments.carbohydrates_100g",
  "nutriments.fat_100g",
  "nutriments.saturated-fat_100g",
  "nutriments.trans-fat_100g",
  "nutriments.fiber_100g",
  "nutriments.sugars_100g",
  "nutriments.sodium_100g",
  "nutriments.cholesterol_100g",
].join(",")

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
    search_terms: query,
    lang: config.openFoodFacts.language,
    page_size: "1",
    json: "1",
    fields: OFF_NUTRIENT_FIELDS,
  })

  const url = `${config.openFoodFacts.baseUrl}/cgi/search.pl?${params}`

  await waitForRateLimit(RateLimitType.Search)

  const res = await fetch(url, {
    headers: { "User-Agent": config.openFoodFacts.userAgent },
  })

  if (!res.ok) {
    logger.warn({ status: res.status, query }, "OFF search returned error")
    return null
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    logger.warn({ query }, "OFF returned non-JSON response")
    return null
  }

  if (!data.products || data.products.length === 0) {
    return null
  }

  return data.products[0] as OffProduct
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
