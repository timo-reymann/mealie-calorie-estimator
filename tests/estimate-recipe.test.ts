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
  config.estimate.nutrientSource = "off"
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

function llmResponse(nutrients: Record<string, number>): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(nutrients) } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function isLlmCall(input: RequestInfo | URL): boolean {
  return String(input).includes("/chat/completions")
}

function queryOf(input: RequestInfo | URL): string {
  return new URL(String(input)).searchParams.get("q") ?? ""
}

describe("estimateRecipe", () => {
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

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.matchedCount).toBe(0)
    expect(result.unmatchedCount).toBe(2)
    expect(result.matchedIngredients.map((i) => i.matched)).toEqual([false, false])
    expect(result.matchedIngredients.map((i) => i.grams)).toEqual([null, null])
    expect(result.totalNutrients.kcalPer100g).toBeNull()
  })

  describe("NUTRIENT_SOURCE", () => {
    function enableLlm(): void {
      config.llm.enabled = true
      config.llm.apiKey = "test-key"
    }

    it("prefers Open Food Facts and only asks the LLM when there is no match by default", async () => {
      enableLlm()
      const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        if (isLlmCall(input)) return llmResponse({ kcal: 43, protein: 3 })
        if (queryOf(input) === "Kirschtomaten OFF") return hitsResponse({ "energy-kcal_100g": 220 }, "Pizza")
        return emptyHitsResponse()
      })

      const result = await estimateRecipe(
        makeRecipe([ingredient("Kirschtomaten OFF", 100), ingredient("Dill OFF", 100)]),
      )

      expect(result.totalNutrients.kcalPer100g).toBe(263)
      expect(result.matchedIngredients.map((i) => i.llmEstimated)).toEqual([false, true])
      expect(fetchMock.mock.calls.filter(([input]) => isLlmCall(input))).toHaveLength(1)
    })

    it("asks the LLM first and skips Open Food Facts when set to llm", async () => {
      enableLlm()
      config.estimate.nutrientSource = "llm"
      const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        if (isLlmCall(input)) return llmResponse({ kcal: 18, protein: 0.9 })
        return hitsResponse({ "energy-kcal_100g": 220 }, "Pizza")
      })

      const result = await estimateRecipe(makeRecipe([ingredient("Kirschtomaten LLM", 500)]))

      expect(result.totalNutrients.kcalPer100g).toBe(90)
      expect(result.matchedIngredients[0].llmEstimated).toBe(true)
      expect(fetchMock.mock.calls.some(([input]) => !isLlmCall(input))).toBe(false)
    })

    it("falls back to Open Food Facts when set to llm but the LLM is disabled", async () => {
      config.estimate.nutrientSource = "llm"
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        hitsResponse({ "energy-kcal_100g": 257 }, "Feta"),
      )

      const result = await estimateRecipe(makeRecipe([ingredient("Feta Fallback", 100)]))

      expect(result.totalNutrients.kcalPer100g).toBe(257)
      expect(result.matchedIngredients[0].llmEstimated).toBe(false)
    })
  })
})
