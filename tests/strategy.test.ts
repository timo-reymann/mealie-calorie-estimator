import { describe, it, expect, beforeEach, vi } from "vitest"
import type { MealieRecipe } from "../src/types.js"

function makeRecipe(tags: { slug: string; name: string }[] = []): MealieRecipe {
  return {
    slug: "test",
    name: "Test",
    recipeYield: null,
    recipeYieldQuantity: null,
    recipeServings: null,
    recipeIngredient: [],
    nutrition: null,
    tags: tags.map(t => ({ id: t.slug, ...t, groupId: null })),
    extras: {},
    householdId: null,
  }
}

describe("shouldEstimate", () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.ESTIMATE_STRATEGY
    delete process.env.ESTIMATE_TAG
  })

  it("defaults to all strategy when env var is not set", async () => {
    const { shouldEstimate } = await import("../src/services/estimator.js")
    expect(shouldEstimate(makeRecipe([]))).toBe(true)
  })

  it("returns true for all strategy regardless of tags", async () => {
    process.env.ESTIMATE_STRATEGY = "all"
    const { shouldEstimate } = await import("../src/services/estimator.js")
    expect(shouldEstimate(makeRecipe([]))).toBe(true)
    expect(shouldEstimate(makeRecipe([{ slug: "estimate", name: "estimate" }]))).toBe(true)
    expect(shouldEstimate(makeRecipe([{ slug: "some-other", name: "some-other" }]))).toBe(true)
  })

  it("returns true for tagged strategy when recipe has the tag by slug", async () => {
    process.env.ESTIMATE_STRATEGY = "tagged"
    const { shouldEstimate } = await import("../src/services/estimator.js")
    expect(shouldEstimate(makeRecipe([{ slug: "estimate", name: "Custom Name" }]))).toBe(true)
  })

  it("returns true for tagged strategy when recipe has the tag by name", async () => {
    process.env.ESTIMATE_STRATEGY = "tagged"
    const { shouldEstimate } = await import("../src/services/estimator.js")
    expect(shouldEstimate(makeRecipe([{ slug: "custom-slug", name: "Estimate" }]))).toBe(true)
  })

  it("returns false for tagged strategy when recipe lacks the tag", async () => {
    process.env.ESTIMATE_STRATEGY = "tagged"
    const { shouldEstimate } = await import("../src/services/estimator.js")
    expect(shouldEstimate(makeRecipe([]))).toBe(false)
    expect(shouldEstimate(makeRecipe([{ slug: "other", name: "other" }]))).toBe(false)
  })

  it("returns false when recipe has null tags in tagged mode", async () => {
    process.env.ESTIMATE_STRATEGY = "tagged"
    const { shouldEstimate } = await import("../src/services/estimator.js")
    const recipe = makeRecipe()
    recipe.tags = null
    expect(shouldEstimate(recipe)).toBe(false)
  })

  it("uses custom tag name from ESTIMATE_TAG", async () => {
    process.env.ESTIMATE_STRATEGY = "tagged"
    process.env.ESTIMATE_TAG = "calc"
    const { shouldEstimate } = await import("../src/services/estimator.js")
    expect(shouldEstimate(makeRecipe([{ slug: "calc", name: "calc" }]))).toBe(true)
    expect(shouldEstimate(makeRecipe([{ slug: "estimate", name: "estimate" }]))).toBe(false)
  })

  it("handles case-insensitive tag matching", async () => {
    process.env.ESTIMATE_STRATEGY = "tagged"
    const { shouldEstimate } = await import("../src/services/estimator.js")
    expect(shouldEstimate(makeRecipe([{ slug: "ESTIMATE", name: "ESTIMATE" }]))).toBe(true)
    expect(shouldEstimate(makeRecipe([{ slug: "Estimate", name: "ESTIMATE" }]))).toBe(true)
    expect(shouldEstimate(makeRecipe([{ slug: "estimate", name: "Estimate" }]))).toBe(true)
  })
})
