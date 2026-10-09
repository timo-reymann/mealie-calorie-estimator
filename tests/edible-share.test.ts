import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { parseEdiblePercent, ingredientNoteHint } from "../src/services/edible-share.js"
import { computeIngredientHash, estimateRecipe } from "../src/services/estimator.js"
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

function gramIngredient(foodName: string, quantity: number, note: string | null = null): MealieIngredient {
  return {
    quantity,
    unit: { id: "u1", name: "g", pluralName: "g", abbreviation: "g", standardQuantity: null, standardUnit: null },
    food: { id: foodName, name: foodName, pluralName: null, aliases: [] },
    note,
    display: `${quantity} g ${foodName}`,
    title: null,
    original_text: null,
  }
}

function recipe(ingredients: MealieIngredient[]): MealieRecipe {
  return {
    slug: "brühe",
    name: "Brühe",
    recipeYield: "1 servings",
    recipeYieldQuantity: null,
    recipeServings: 1,
    recipeIngredient: ingredients,
    nutrition: null,
    tags: [],
    extras: {},
    householdId: null,
  }
}

describe("parseEdiblePercent", () => {
  it("returns null without a marker", () => {
    expect(parseEdiblePercent(null)).toBeNull()
    expect(parseEdiblePercent("")).toBeNull()
    expect(parseEdiblePercent("gross, 50% Fett")).toBeNull()
  })

  it("reads a bracketed percentage anywhere in the note", () => {
    expect(parseEdiblePercent("[30%]")).toBe(30)
    expect(parseEdiblePercent("am besten Spitzbein [30%]")).toBe(30)
    expect(parseEdiblePercent("[ 12,5 % ] fein")).toBe(12.5)
  })

  it("clamps to 0..100", () => {
    expect(parseEdiblePercent("[250%]")).toBe(100)
  })

  it("treats nicht mitrechnen as 0", () => {
    expect(parseEdiblePercent("Nicht mitrechnen")).toBe(0)
  })
})

describe("ingredientNoteHint", () => {
  it("returns the note without markers", () => {
    expect(ingredientNoteHint("klein")).toBe("klein")
    expect(ingredientNoteHint("ohne Knochen [30%]")).toBe("ohne Knochen")
    expect(ingredientNoteHint("[30%]")).toBeNull()
    expect(ingredientNoteHint("nicht mitrechnen")).toBeNull()
    expect(ingredientNoteHint(null)).toBeNull()
  })

  it("limits the length", () => {
    expect(ingredientNoteHint("x".repeat(200))).toHaveLength(80)
  })
})

describe("computeIngredientHash with edible percent", () => {
  it("changes the hash when the note or the percentage changes", () => {
    const withoutNote = computeIngredientHash(recipe([gramIngredient("Knochen", 100)]))
    const withNote = computeIngredientHash(recipe([gramIngredient("Knochen", 100, "am besten Spitzbein")]))
    const otherNote = computeIngredientHash(recipe([gramIngredient("Knochen", 100, "klein")]))
    const marked = computeIngredientHash(recipe([gramIngredient("Knochen", 100, "[30%]")]))
    expect(withNote).not.toBe(withoutNote)
    expect(otherNote).not.toBe(withNote)
    expect(marked).not.toBe(withoutNote)
  })

  it("changes the hash when the standard values of a unit change", () => {
    const base = gramIngredient("Sake", 1)
    const standardized = { ...base, unit: { ...base.unit!, standardQuantity: 15, standardUnit: "milliliter" } }
    expect(computeIngredientHash(recipe([standardized]))).not.toBe(computeIngredientHash(recipe([base])))
  })
})

describe("estimateRecipe with edible percent", () => {
  it("applies the percentage and skips lookups for 0 percent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ hits: [{ product_name: "Knochen", nutriments: { "energy-kcal_100g": 200 } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    const result = await estimateRecipe(recipe([
      gramIngredient("Knochen", 1000, "[30%]"),
      gramIngredient("Abfall", 500, "nicht mitrechnen"),
    ]))

    expect(result.totalNutrients.kcalPer100g).toBeCloseTo(600, 5)
    expect(result.unmatchedCount).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.matchedIngredients.map((i) => i.quantityLabel)).toEqual(["1000 g [30%]", "500 g [0%]"])
  })
})
