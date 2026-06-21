import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { lookupNutrients } from "../src/services/off-client.js"
import { initCache, setCachedNutrients } from "../src/utils/cache.js"
import { config } from "../src/config.js"

beforeAll(async () => {
  await initCache()
  config.openFoodFacts.retryBackoffMs = 1
})

beforeEach(() => {
  vi.restoreAllMocks()
})

function hitsResponse(nutriments: Record<string, number>, productName = "Milch") {
  return new Response(JSON.stringify({ hits: [{ product_name: productName, nutriments }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

const MILK_NUTRIMENTS = {
  "energy-kcal_100g": 48,
  "proteins_100g": 3.5,
  "carbohydrates_100g": 5,
  "fat_100g": 1.5,
  "saturated-fat_100g": 1,
}

describe("lookupNutrients", () => {
  it("returns cached value without calling API", async () => {
    setCachedNutrients("flour", {
      kcalPer100g: 364, proteinPer100g: 10, carbsPer100g: 76, fatPer100g: 1,
      saturatedFatPer100g: 0.2, transFatPer100g: 0, unsaturatedFatPer100g: 0.8,
      fiberPer100g: 2.7, sugarPer100g: 0.4, sodiumPer100g: 0.002, cholesterolPer100g: 0,
    })
    const result = await lookupNutrients("flour")
    expect(result.nutrients?.kcalPer100g).toBe(364)
    expect(result.matched).toBe(true)
  })

  it("queries the search API and parses hits", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(hitsResponse(MILK_NUTRIMENTS))

    const result = await lookupNutrients("Milch")

    expect(result.matched).toBe(true)
    expect(result.nutrients?.kcalPer100g).toBe(48)
    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain("/search?")
    expect(calledUrl).toContain("q=Milch")
    expect(calledUrl).toContain("langs=de")
  })

  it("retries on a 503 and succeeds on a later attempt", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(hitsResponse(MILK_NUTRIMENTS))

    const result = await lookupNutrients("Wasser")

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.matched).toBe(true)
    expect(result.nutrients?.kcalPer100g).toBe(48)
  })

  it("gives up after exhausting retries on persistent 503", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("unavailable", { status: 503 }))

    const result = await lookupNutrients("Saft")

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(result.matched).toBe(false)
    expect(result.nutrients).toBeNull()
  })
})
