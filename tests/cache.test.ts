import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import {
  initCache, getCachedNutrients, setCachedNutrients,
  isUnmatchedFood, markUnmatchedFood, getCacheStats,
} from "../src/utils/cache.js"
import type { NutrientSet } from "../src/types.js"
import fs from "node:fs"

const TEST_DB = "data/test-cache.db"

function clearDb(): void {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB)
  }
}

describe("cache", () => {
  beforeAll(async () => {
    clearDb()
    await initCache()
  })

  afterAll(() => {
    clearDb()
  })

  beforeEach(() => {
    setCachedNutrients("flour", {
      kcalPer100g: 364, proteinPer100g: 10, carbsPer100g: 76, fatPer100g: 1,
      saturatedFatPer100g: 0.2, transFatPer100g: 0, unsaturatedFatPer100g: 0.8,
      fiberPer100g: 2.7, sugarPer100g: 0.4, sodiumPer100g: 0.002, cholesterolPer100g: 0,
    })
    setCachedNutrients("sugar", {
      kcalPer100g: 387, proteinPer100g: 0, carbsPer100g: 100, fatPer100g: 0,
      saturatedFatPer100g: 0, transFatPer100g: 0, unsaturatedFatPer100g: 0,
      fiberPer100g: 0, sugarPer100g: 100, sodiumPer100g: 0, cholesterolPer100g: 0,
    })
    markUnmatchedFood("unknown-spice")
  })

  it("stores and retrieves nutrient objects", () => {
    expect(getCachedNutrients("flour")?.kcalPer100g).toBe(364)
    expect(getCachedNutrients("sugar")?.kcalPer100g).toBe(387)
  })

  it("is case-insensitive", () => {
    expect(getCachedNutrients("FLOUR")?.kcalPer100g).toBe(364)
  })

  it("returns undefined for uncached foods", () => {
    expect(getCachedNutrients("butter")).toBeUndefined()
  })

  it("tracks unmatched foods", () => {
    expect(isUnmatchedFood("unknown-spice")).toBe(true)
    expect(isUnmatchedFood("flour")).toBe(false)
  })

  it("is case-insensitive for unmatched foods", () => {
    expect(isUnmatchedFood("Unknown-Spice")).toBe(true)
  })

  it("reports cache stats", () => {
    const stats = getCacheStats()
    expect(stats.size).toBeGreaterThan(0)
  })
})
