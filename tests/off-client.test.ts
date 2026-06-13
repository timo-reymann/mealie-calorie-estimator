import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { lookupNutrients } from "../src/services/off-client.js"
import { initCache, setCachedNutrients } from "../src/utils/cache.js"

beforeAll(async () => {
  await initCache()
})

beforeEach(() => {
  vi.restoreAllMocks()
})

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
})
