import { describe, it, expect, vi, beforeEach } from "vitest"
import type { EstimateResult, MealieRecipe, NutrientSet } from "../src/types.js"

vi.mock("../src/services/mealie-client.js", () => ({
  patchRecipe: vi.fn(async () => {}),
  getOrCreateTags: vi.fn(async (names: string[]) => names.map((name) => ({ id: name, name, slug: name }))),
}))

vi.mock("../src/services/estimator.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/estimator.js")>()),
  estimateRecipe: vi.fn(),
}))

const { patchRecipe } = await import("../src/services/mealie-client.js")
const { estimateRecipe } = await import("../src/services/estimator.js")
const { estimateAndTag } = await import("../src/services/tagging.js")

function nutrients(kcal: number | null): NutrientSet {
  return {
    kcalPer100g: kcal, proteinPer100g: null, carbsPer100g: null, fatPer100g: null,
    saturatedFatPer100g: null, transFatPer100g: null, unsaturatedFatPer100g: null,
    fiberPer100g: null, sugarPer100g: null, sodiumPer100g: null, cholesterolPer100g: null,
  }
}

function makeRecipe(overrides: Partial<MealieRecipe> = {}): MealieRecipe {
  return {
    slug: "test",
    name: "Test",
    recipeYield: "4 servings",
    recipeYieldQuantity: null,
    recipeServings: 4,
    recipeIngredient: [],
    nutrition: null,
    tags: [],
    extras: {},
    householdId: null,
    ...overrides,
  }
}

describe("estimateAndTag", () => {
  beforeEach(() => {
    vi.mocked(patchRecipe).mockClear()
    vi.mocked(estimateRecipe).mockResolvedValue({
      slug: "test",
      servings: 4,
      totalNutrients: nutrients(2000),
      perServingNutrients: nutrients(500),
      matchedCount: 0,
      unmatchedCount: 0,
      unmatchedIngredients: [],
      matchedIngredients: [],
    } satisfies EstimateResult)
  })

  it("preserves extras written by other integrations", async () => {
    const recipe = makeRecipe({
      extras: { ingredient_parser_hash: "abc123", some_other_key: "keep me" },
    })

    await estimateAndTag(recipe, "newhash")

    const patch = vi.mocked(patchRecipe).mock.calls[0][1]
    expect(patch.extras).toMatchObject({
      ingredient_parser_hash: "abc123",
      some_other_key: "keep me",
      calorie_estimator_hash: "newhash",
    })
  })

  it("overwrites its own stale extras", async () => {
    const recipe = makeRecipe({
      extras: { calorie_estimator_hash: "oldhash", calorie_estimator_total_kcal: "1" },
    })

    await estimateAndTag(recipe, "newhash")

    const patch = vi.mocked(patchRecipe).mock.calls[0][1]
    expect(patch.extras?.calorie_estimator_hash).toBe("newhash")
    expect(patch.extras?.calorie_estimator_total_kcal).toBe("2000")
  })
})
