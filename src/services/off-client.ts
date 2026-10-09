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

const OFF_NUTRIENT_FIELDS = [
  "product_name",
  "serving_size",
  "serving_quantity",
  "serving_quantity_unit",
  "nutriments",
  "categories",
  "labels",
  "ingredients_text",
].join(",")

const NON_ITEM_SERVING_UNITS = new Set([
  "g", "gram", "grams", "gramm", "gramme", "kg", "ml", "milliliter", "milliliters",
  "l", "liter", "liters", "cl", "dl", "oz", "ounce", "ounces",
  "portion", "portionen", "serving", "servings", "portion", "cup", "cups",
  "teaspoon", "teaspoons", "tablespoon", "tablespoons",
])

function normalizeServingToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

function parseServingWeightPerUnit(product: OffProduct, unitName: string): number | null {
  const servingSize = product.serving_size?.trim()
  if (!servingSize) return null

  const match = servingSize.match(/^\s*(\d+(?:[.,]\d+)?)\s*([^\d(]+?)(?:\s*\(|\s*[-–—:]|$)/i)
  if (!match) return null

  const count = Number.parseFloat(match[1].replace(",", "."))
  const servingUnit = normalizeServingToken(match[2])
  if (!Number.isFinite(count) || count <= 0 || !servingUnit) return null
  if (NON_ITEM_SERVING_UNITS.has(servingUnit)) return null

  let servingQuantity: number | null = null
  if (typeof product.serving_quantity === "number") {
    servingQuantity = product.serving_quantity
  } else if (typeof product.serving_quantity === "string") {
    const parsed = Number.parseFloat(product.serving_quantity.replace(",", "."))
    if (Number.isFinite(parsed)) servingQuantity = parsed
  }

  if (servingQuantity === null) {
    const grams = servingSize.match(/(\d+(?:[.,]\d+)?)\s*g\b/i)
    if (!grams) return null
    servingQuantity = Number.parseFloat(grams[1].replace(",", "."))
  }

  if (!Number.isFinite(servingQuantity) || servingQuantity <= 0) return null

  const quantityUnit = normalizeServingToken(product.serving_quantity_unit ?? "")
  if (quantityUnit && quantityUnit !== "g" && quantityUnit !== "gram" && quantityUnit !== "grams" && quantityUnit !== "gramm") {
    return null
  }

  const requestedUnit = normalizeServingToken(unitName)
  const requestedPiece = new Set(["stuck", "stucke", "piece", "pieces", "pc", "pcs"]).has(requestedUnit)
  const requestedSlice = new Set(["scheibe", "scheiben", "slice", "slices"]).has(requestedUnit)
  const requestedClove = new Set(["zehe", "zehen", "clove", "cloves"]).has(requestedUnit)

  if (requestedPiece) {
    return servingQuantity / count
  }

  if (requestedSlice && new Set(["scheibe", "scheiben", "slice", "slices"]).has(servingUnit)) {
    return servingQuantity / count
  }

  if (requestedClove && new Set(["zehe", "zehen", "clove", "cloves"]).has(servingUnit)) {
    return servingQuantity / count
  }

  if (normalizeServingToken(requestedUnit) === servingUnit) {
    return servingQuantity / count
  }

  return null
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

const FORM_PENALTY_TERMS = [
  "getrocknet", "getrocknete", "dried", "seche", "séché",
  "pulver", "powder", "granulat", "extract", "extrakt",
  "konzentrat", "konzentrierte", "sirup", "syrup",
]

const FRESH_TERMS = ["frisch", "fresh", "frais", "fresca", "raw", "roh"]

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
      const res = await fetch(url, {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(config.openFoodFacts.timeoutMs),
      })
      if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res
      lastResponse = res
      logger.debug({ query, attempt, status: res.status }, "OFF search returned retryable status")
    } catch (err) {
      lastResponse = null
      logger.debug({ query, attempt, err: (err as Error).message }, "OFF search request failed")
    }
  }

  return lastResponse
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function searchTokens(value: string): string[] {
  return normalize(value).split(/\s+/).filter((token) => token.length >= 3)
}

function candidateText(product: OffProduct): string {
  return [product.product_name, product.categories, product.labels, product.ingredients_text]
    .filter((value): value is string => Boolean(value))
    .join(" ")
}

function scoreProduct(product: OffProduct, query: string, preferFresh: boolean): number {
  const name = normalize(product.product_name ?? "")
  const text = normalize(candidateText(product))
  const queryNormalized = normalize(query)
  const queryTokens = searchTokens(query)
  let score = 0

  if (name && queryNormalized) {
    if (name === queryNormalized) score += 100
    if (name.includes(queryNormalized) || queryNormalized.includes(name)) score += 50
  }

  for (const token of queryTokens) {
    if (name.split(" ").includes(token)) score += 20
    else if (text.includes(token)) score += 8
  }

  if (FRESH_TERMS.some((term) => text.includes(term))) score += preferFresh ? 35 : 10
  if (FORM_PENALTY_TERMS.some((term) => text.includes(term))) score -= preferFresh ? 80 : 40

  return score
}

async function searchProducts(query: string, pageSize = 1): Promise<OffProduct[]> {
  const params = new URLSearchParams({
    q: query,
    langs: config.openFoodFacts.language,
    page_size: pageSize.toString(),
    fields: OFF_NUTRIENT_FIELDS,
  })

  const url = `${config.openFoodFacts.searchBaseUrl}/search?${params}`

  await waitForRateLimit(RateLimitType.Search)

  const res = await fetchWithRetry(url, query)

  if (!res) {
    logger.warn({ query }, "OFF search failed after retries")
    return []
  }

  if (!res.ok) {
    logger.warn({ status: res.status, query }, "OFF search returned error")
    return []
  }

  let data: OffSearchResult
  try {
    data = (await res.json()) as OffSearchResult
  } catch {
    logger.warn({ query }, "OFF returned non-JSON response")
    return []
  }

  if (!data.hits || data.hits.length === 0) {
    return []
  }

  return data.hits
}

async function searchProduct(query: string, preferFresh = false): Promise<OffProduct | null> {
  const normalizedQuery = normalize(query)
  const addFresh = preferFresh &&
    !FORM_PENALTY_TERMS.some((term) => normalizedQuery.includes(term)) &&
    !FRESH_TERMS.some((term) => normalizedQuery.split(" ").includes(term))
  const searchQuery = addFresh ? `${query} frisch` : query

  const hits = await searchProducts(searchQuery, 10)
  if (hits.length === 0) return null

  const ranked = [...hits].sort(
    (a, b) => scoreProduct(b, searchQuery, preferFresh) - scoreProduct(a, searchQuery, preferFresh),
  )
  const bestScore = scoreProduct(ranked[0], searchQuery, preferFresh)
  const maxKcalScoreDelta = 20
  const selected =
    ranked.find(
      (product) =>
        product.nutriments?.["energy-kcal_100g"] != null &&
        bestScore - scoreProduct(product, searchQuery, preferFresh) <= maxKcalScoreDelta,
    ) ?? null

  if (!selected) {
    logger.debug(
      {
        query: searchQuery,
        preferFresh,
        candidates: ranked.slice(0, 5).map((product) => ({
          name: product.product_name ?? null,
          score: scoreProduct(product, searchQuery, preferFresh),
          kcalPer100g: product.nutriments?.["energy-kcal_100g"] ?? null,
        })),
      },
      "No ranked OFF candidate has kcal data",
    )
    return null
  }

  const selectedName = selected.product_name ?? null

  logger.debug(
    {
      query: searchQuery,
      preferFresh,
      selected: selectedName,
      score: scoreProduct(selected, searchQuery, preferFresh),
      scoreDelta: bestScore - scoreProduct(selected, searchQuery, preferFresh),
      candidates: ranked.slice(0, 5).map((product) => ({
        name: product.product_name ?? null,
        score: scoreProduct(product, searchQuery, preferFresh),
        kcalPer100g: product.nutriments?.["energy-kcal_100g"] ?? null,
      })),
    },
    "Selected OFF match from ranked candidates",
  )

  return selected
}

export async function lookupServingWeight(foodName: string, unitName: string): Promise<number | null> {
  const products = await searchProducts(foodName, 10)

  for (const product of products) {
    const grams = parseServingWeightPerUnit(product, unitName)
    if (grams !== null) {
      logger.debug(
        { foodName, unitName, product: product.product_name, grams },
        "OFF serving weight found",
      )
      return grams
    }
  }

  logger.debug({ foodName, unitName }, "No explicit OFF serving weight found")
  return null
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

  const normalizedUnit = unitName?.trim().toLowerCase()
  const isPieceUnit = normalizedUnit === "stück" || normalizedUnit === "stuck" ||
    normalizedUnit === "piece" || normalizedUnit === "pieces"
  const hasExplicitForm = FORM_PENALTY_TERMS.some((term) => normalize(searchTerm).includes(term))
  const preferFresh = isPieceUnit && !hasExplicitForm

  const product = await searchProduct(searchTerm, preferFresh)

  if (!product) {
    logger.debug({ foodName }, "No OFF match found")
    return { nutrients: null, matched: false, productName: null }
  }
  if (!product.nutriments) {
    logger.debug({ foodName, product: product.product_name ?? null }, "OFF match has no nutrient data")
    return { nutrients: null, matched: false, productName: product.product_name ?? null }
  }

  const nutrients = extractNutrients(product.nutriments)
  if (nutrients.kcalPer100g === null) {
    logger.debug({ foodName, product: product.product_name ?? null }, "OFF match has no kcal data")
    return { nutrients: null, matched: false, productName: product.product_name ?? null }
  }

  logger.debug({ foodName, product: product.product_name ?? null }, "OFF match found")
  setCachedNutrients(foodName, nutrients)
  return { nutrients, matched: true, productName: product.product_name ?? null }
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
