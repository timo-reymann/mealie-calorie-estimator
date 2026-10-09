import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { estimateRecipe } from "../src/services/estimator.js"
import { initCache } from "../src/utils/cache.js"
import { config } from "../src/config.js"
import type { MealieIngredient, MealieRecipe } from "../src/types.js"

beforeAll(async () => {
  await initCache()
})

beforeEach(() => {
  config.llm.enabled = false
  config.llm.apiKey = ""
  vi.restoreAllMocks()
})

function gramIngredient(foodName: string, quantity: number): MealieIngredient {
  return {
    quantity,
    unit: { id: "u1", name: "g", pluralName: "g", abbreviation: "g", standardQuantity: null, standardUnit: null },
    food: { id: foodName, name: foodName, pluralName: null, aliases: [] },
    note: null,
    display: `${quantity} g ${foodName}`,
    title: null,
    original_text: null,
  }
}

function recipe(slug: string, servings: number, ingredients: MealieIngredient[]): MealieRecipe {
  return {
    slug,
    name: slug,
    recipeYield: `${servings} servings`,
    recipeYieldQuantity: null,
    recipeServings: servings,
    recipeIngredient: ingredients,
    nutrition: null,
    tags: [],
    extras: {},
    householdId: null,
  }
}

describe("referenced recipe scaling", () => {
  it("scales the referenced recipe without rounding its per-serving value first", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ hits: [{ product_name: "Rundung", nutriments: { "energy-kcal_100g": 500 } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    const subrecipe = recipe("sub", 3, [gramIngredient("Rundung", 20)])
    const parent = recipe("parent", 1, [
      { quantity: 3, unit: null, food: null, note: null, display: "3 Sub", title: null, original_text: null, referencedRecipe: subrecipe },
    ])

    const result = await estimateRecipe(parent)

    expect(result.totalNutrients.kcalPer100g).toBeCloseTo(100, 5)
  })
})
