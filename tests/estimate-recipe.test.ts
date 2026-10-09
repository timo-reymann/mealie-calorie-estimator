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
  vi.unstubAllGlobals()
})

function ingredient(foodName: string, quantity: number): MealieIngredient {
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

function makeRecipe(ingredients: MealieIngredient[]): MealieRecipe {
  return {
    slug: "test-recipe",
    name: "Test Recipe",
    recipeYield: "4 servings",
    recipeYieldQuantity: null,
    recipeServings: 4,
    recipeIngredient: ingredients,
    nutrition: null,
    tags: [],
    extras: {},
    householdId: null,
  }
}

function hitsResponse(nutriments: Record<string, number>, productName: string): Response {
  return new Response(JSON.stringify({ hits: [{ product_name: productName, nutriments }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function emptyHitsResponse(): Response {
  return new Response(JSON.stringify({ hits: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function queryOf(input: RequestInfo | URL): string {
  return new URL(String(input)).searchParams.get("q") ?? ""
}

describe("estimateRecipe", () => {
  it("includes referenced recipe nutrition using the referenced quantity as servings", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const query = queryOf(input)
      if (query === "Testmilch-ReferencedRecipe") return hitsResponse({ "energy-kcal_100g": 200 }, "Testmilch-ReferencedRecipe")
      if (query === "Unterrezept") return hitsResponse({ "energy-kcal_100g": 500 }, "Unterrezept")
      return emptyHitsResponse()
    })

    const subrecipe: MealieRecipe = {
      slug: "subrecipe", name: "Unterrezept", recipeYield: "5 servings", recipeYieldQuantity: null,
      recipeServings: 5, recipeIngredient: [ingredient("Unterrezept", 100)], nutrition: null, tags: [], extras: {}, householdId: null,
    }
    const parent = makeRecipe([
      ingredient("Testmilch-ReferencedRecipe", 100),
      { quantity: 4, unit: null, food: null, note: null, display: "4 Unterrezept", title: null, original_text: null, referencedRecipe: subrecipe },
    ])

    const result = await estimateRecipe(parent)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.matchedCount).toBe(2)
    expect(result.unmatchedCount).toBe(0)
    expect(result.totalNutrients.kcalPer100g).toBe(600)
    expect(result.perServingNutrients.kcalPer100g).toBe(150)
  })

  it("uses an explicit OFF serving weight before the LLM for piece units", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const query = queryOf(input)
      if (query === "Eier" || query === "Eier frisch") {
        return new Response(JSON.stringify({
          hits: [{
            product_name: "Œufs frais BIO",
            serving_size: "1 egg (60 g)",
            serving_quantity: 60,
            serving_quantity_unit: "g",
            nutriments: { "energy-kcal_100g": 143, "proteins_100g": 12.6 },
          }],
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      return emptyHitsResponse()
    })

    const result = await estimateRecipe(makeRecipe([{
      quantity: 4,
      unit: { id: "u-piece", name: "Stück", pluralName: "Stücke", abbreviation: "Stk.", standardQuantity: null, standardUnit: null },
      food: { id: "eier", name: "Eier", pluralName: null, aliases: [] },
      note: null,
      display: "4 Stück Eier",
      title: null,
      original_text: null,
    }]))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.matchedCount).toBe(1)
    expect(result.unmatchedCount).toBe(0)
    expect(result.matchedIngredients[0].grams).toBe(240)
    expect(result.matchedIngredients[0].llmEstimated).toBe(false)
    expect(result.totalNutrients.kcalPer100g).toBeCloseTo(343.2, 5)
    expect(result.perServingNutrients.kcalPer100g).toBe(86)
  })

  it("uses the weight from the food description before OFF and LLM", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const query = queryOf(input)
      if (query.startsWith("Wachteleier")) {
        return new Response(JSON.stringify({
          hits: [{ product_name: "Wachteleier", serving_quantity: 60, serving_quantity_unit: "g", nutriments: { "energy-kcal_100g": 143 } }],
        }), { status: 200, headers: { "content-type": "application/json" } })
      }
      return emptyHitsResponse()
    })

    const result = await estimateRecipe(makeRecipe([{
      quantity: 4,
      unit: { id: "u-piece", name: "Stück", pluralName: "Stücke", abbreviation: "Stk.", standardQuantity: null, standardUnit: null },
      food: { id: "wachteleier", name: "Wachteleier", pluralName: null, aliases: [], description: "Klein [Stück=50g]" },
      note: null,
      display: "4 Stück Wachteleier",
      title: null,
      original_text: null,
    }]))

    expect(result.matchedIngredients[0].grams).toBe(200)
    expect(result.matchedIngredients[0].gramsSource).toBe("food")
    expect(result.matchedIngredients[0].llmEstimated).toBe(false)
  })

  it("matches ingredients concurrently and aggregates nutrients in order", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const query = queryOf(input)
      if (query === "Milch") return hitsResponse({ "energy-kcal_100g": 48, "proteins_100g": 3.5 }, "Milch")
      if (query === "Brot") return hitsResponse({ "energy-kcal_100g": 250, "proteins_100g": 9 }, "Brot")
      return emptyHitsResponse()
    })

    const result = await estimateRecipe(
      makeRecipe([
        ingredient("Milch", 100),
        ingredient("Unbekannt", 50),
        ingredient("Brot", 100),
      ]),
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.matchedCount).toBe(2)
    expect(result.unmatchedCount).toBe(1)
    expect(result.unmatchedIngredients).toEqual(["Unbekannt"])
    expect(result.matchedIngredients.map((i) => i.name)).toEqual(["Milch", "Unbekannt", "Brot"])
    expect(result.matchedIngredients.filter((i) => i.matched).map((i) => i.name)).toEqual(["Milch", "Brot"])
    expect(result.totalNutrients.kcalPer100g).toBe(298)
    expect(result.totalNutrients.proteinPer100g).toBeCloseTo(12.5, 1)
    expect(result.perServingNutrients.kcalPer100g).toBe(75)
    expect(result.matchedIngredients.filter((i) => i.matched).map((i) => i.grams)).toEqual([100, 100])
  })

  it("marks ingredients without a unit conversion or OFF match as unmatched", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => emptyHitsResponse())

    const sliceUnit: MealieIngredient = {
      ...ingredient("Scheibe Brot", 2),
      unit: { id: "u2", name: "slice", pluralName: "slices", abbreviation: "pc", standardQuantity: null, standardUnit: null },
    }
    const unknownUnit: MealieIngredient = {
      ...ingredient("Sache", 1),
      unit: { id: "u3", name: "handful", pluralName: "handfuls", abbreviation: "", standardQuantity: null, standardUnit: null },
    }

    const result = await estimateRecipe(makeRecipe([sliceUnit, unknownUnit]))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.matchedCount).toBe(0)
    expect(result.unmatchedCount).toBe(2)
    expect(result.matchedIngredients.map((i) => i.matched)).toEqual([false, false])
    expect(result.matchedIngredients.map((i) => i.grams)).toEqual([null, null])
    expect(result.totalNutrients.kcalPer100g).toBeNull()
  })
})
