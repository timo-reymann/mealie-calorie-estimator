import { createHash } from "node:crypto"
import { describe, it, expect } from "vitest"
import { computeIngredientHash, CALCULATION_VERSION, buildNutritionPatch, buildNutritionCalculationNote, mergeNutritionCalculationNote, hasManualCalories, buildManualAckPatch } from "../src/services/estimator.js"
import type { MealieRecipe, EstimateResult, NutrientSet } from "../src/types.js"

function makeRecipe(overrides: Partial<MealieRecipe> = {}): MealieRecipe {
  return {
    slug: "test-recipe",
    name: "Test Recipe",
    recipeYield: "4 servings",
    recipeYieldQuantity: null,
    recipeServings: 4,
    recipeIngredient: [],
    nutrition: null,
    notes: [],
    tags: [],
    extras: {},
    householdId: null,
    ...overrides,
  }
}

function n(kcal: number | null, p: Partial<NutrientSet> = {}): NutrientSet {
  return {
    kcalPer100g: kcal, proteinPer100g: null, carbsPer100g: null, fatPer100g: null,
    saturatedFatPer100g: null, transFatPer100g: null, unsaturatedFatPer100g: null,
    fiberPer100g: null, sugarPer100g: null, sodiumPer100g: null, cholesterolPer100g: null,
    ...p,
  }
}

describe("computeIngredientHash", () => {
  it("produces consistent hash for same ingredients", () => {
    const a = makeRecipe({
      recipeIngredient: [
        {
          quantity: 2, unit: { id: "1", name: "cup", pluralName: "cups", abbreviation: "c", standardQuantity: null, standardUnit: null },
          food: { id: "1", name: "flour", pluralName: null, aliases: [] },
          note: null, display: "2 cups flour", title: null, original_text: null,
        },
        {
          quantity: 1, unit: { id: "2", name: "tbsp", pluralName: "tbsp", abbreviation: "T", standardQuantity: null, standardUnit: null },
          food: { id: "2", name: "sugar", pluralName: null, aliases: [] },
          note: null, display: "1 tbsp sugar", title: null, original_text: null,
        },
      ],
    })

    const b = makeRecipe({
      recipeIngredient: [
        {
          quantity: 1, unit: { id: "2", name: "tbsp", pluralName: "tbsp", abbreviation: "T", standardQuantity: null, standardUnit: null },
          food: { id: "2", name: "sugar", pluralName: null, aliases: [] },
          note: null, display: "1 tbsp sugar", title: null, original_text: null,
        },
        {
          quantity: 2, unit: { id: "1", name: "cup", pluralName: "cups", abbreviation: "c", standardQuantity: null, standardUnit: null },
          food: { id: "1", name: "flour", pluralName: null, aliases: [] },
          note: null, display: "2 cups flour", title: null, original_text: null,
        },
      ],
    })

    expect(computeIngredientHash(a)).toBe(computeIngredientHash(b))
  })

  it("produces different hash for different ingredients", () => {
    const a = makeRecipe({
      recipeIngredient: [
        {
          quantity: 2, unit: { id: "1", name: "cup", pluralName: "cups", abbreviation: "c", standardQuantity: null, standardUnit: null },
          food: { id: "1", name: "flour", pluralName: null, aliases: [] },
          note: null, display: "2 cups flour", title: null, original_text: null,
        },
      ],
    })

    const b = makeRecipe({
      recipeIngredient: [
        {
          quantity: 3, unit: { id: "1", name: "cup", pluralName: "cups", abbreviation: "c", standardQuantity: null, standardUnit: null },
          food: { id: "1", name: "flour", pluralName: null, aliases: [] },
          note: null, display: "3 cups flour", title: null, original_text: null,
        },
      ],
    })

    expect(computeIngredientHash(a)).not.toBe(computeIngredientHash(b))
  })

  it("handles empty ingredient list", () => {
    const recipe = makeRecipe({ recipeIngredient: [] })
    expect(computeIngredientHash(recipe)).toBeTruthy()
  })

  it("produces different hash when servings change but ingredients are the same", () => {
    const a = makeRecipe({ recipeYield: "4 servings", recipeServings: 4 })
    const b = makeRecipe({ recipeYield: "6 servings", recipeServings: 6 })

    expect(computeIngredientHash(a)).not.toBe(computeIngredientHash(b))
  })

  it("produces different hash when recipeYieldQuantity changes", () => {
    const a = makeRecipe({ recipeYieldQuantity: 4 })
    const b = makeRecipe({ recipeYieldQuantity: 6 })

    expect(computeIngredientHash(a)).not.toBe(computeIngredientHash(b))
  })

  it("produces different hash when the weight in the food description changes", () => {
    const withWeight = (description: string) => makeRecipe({
      recipeIngredient: [{
        quantity: 2, unit: { id: "1", name: "Stück", pluralName: null, abbreviation: "", standardQuantity: null, standardUnit: null },
        food: { id: "1", name: "Ei", pluralName: null, aliases: [], description },
        note: null, display: "2 Stück Ei", title: null, original_text: null,
      }],
    })
    expect(computeIngredientHash(withWeight("[Stück=50g]"))).not.toBe(computeIngredientHash(withWeight("[Stück=60g]")))
    expect(computeIngredientHash(withWeight("[Stück=50g]"))).toBe(computeIngredientHash(withWeight("[Stück=50g] anderer Text")))
  })

  it("handles null fields", () => {
    const recipe = makeRecipe({
      recipeIngredient: [
        {
          quantity: null, unit: null, food: null,
          note: "salt to taste", display: "salt to taste", title: null, original_text: null,
        },
      ],
    })
    expect(computeIngredientHash(recipe)).toBeTruthy()
  })

  describe("referenced recipes", () => {
    function food(name: string, quantity: number, unitName = "g") {
      return {
        quantity, unit: { id: unitName, name: unitName, pluralName: null, abbreviation: unitName, standardQuantity: null, standardUnit: null },
        food: { id: name, name, pluralName: null, aliases: [] },
        note: null, display: `${quantity} ${unitName} ${name}`, title: null, original_text: null,
      }
    }

    function parentOf(child: MealieRecipe): MealieRecipe {
      return makeRecipe({
        slug: "tonkotsu-ramen",
        recipeIngredient: [
          { quantity: 2, unit: null, food: null, note: null, display: "2 Ramen-Eier", title: null, original_text: null, referencedRecipe: child },
        ],
      })
    }

    it("changes when an ingredient of the referenced recipe changes", () => {
      const before = makeRecipe({ slug: "ramen-eier", recipeIngredient: [food("egg", 6, "piece")] })
      const after = makeRecipe({ slug: "ramen-eier", recipeIngredient: [food("egg", 4, "piece")] })

      expect(computeIngredientHash(parentOf(before))).not.toBe(computeIngredientHash(parentOf(after)))
    })

    it("changes when the servings of the referenced recipe change", () => {
      const before = makeRecipe({ slug: "ramen-eier", recipeServings: 4 })
      const after = makeRecipe({ slug: "ramen-eier", recipeServings: 6 })

      expect(computeIngredientHash(parentOf(before))).not.toBe(computeIngredientHash(parentOf(after)))
    })

    it("changes when a nested referenced recipe changes", () => {
      const marinade = (soy: number) => makeRecipe({ slug: "marinade", recipeIngredient: [food("soy sauce", soy, "ml")] })
      const eggs = (soy: number) => makeRecipe({
        slug: "ramen-eier",
        recipeIngredient: [
          { quantity: 1, unit: null, food: null, note: null, display: "1 Marinade", title: null, original_text: null, referencedRecipe: marinade(soy) },
        ],
      })

      expect(computeIngredientHash(parentOf(eggs(50)))).not.toBe(computeIngredientHash(parentOf(eggs(80))))
    })

    it("is stable when the referenced recipe is unchanged", () => {
      const make = () => makeRecipe({ slug: "ramen-eier", recipeIngredient: [food("egg", 6, "piece")] })

      expect(computeIngredientHash(parentOf(make()))).toBe(computeIngredientHash(parentOf(make())))
    })

    it("keeps the plain format for recipes without references or notes", () => {
      const recipe = makeRecipe({ recipeIngredient: [food("flour", 200)] })
      const previousFormat = `200|g|flour|,servings:4,yieldQuantity:,calc:${CALCULATION_VERSION}`

      expect(computeIngredientHash(recipe)).toBe(createHash("sha256").update(previousFormat).digest("hex"))
    })

    it("terminates on circular references", () => {
      const a = makeRecipe({ slug: "a" })
      const b = makeRecipe({ slug: "b" })
      a.recipeIngredient = [{ quantity: 1, unit: null, food: null, note: null, display: "b", title: null, original_text: null, referencedRecipe: b }]
      b.recipeIngredient = [{ quantity: 1, unit: null, food: null, note: null, display: "a", title: null, original_text: null, referencedRecipe: a }]

      expect(computeIngredientHash(a)).toBeTruthy()
    })
  })
})


describe("buildNutritionPatch", () => {
  it("builds patch with all nutrients per serving", () => {
    const result: EstimateResult = {
      slug: "test",
      servings: 4,
      totalNutrients: n(1400, { proteinPer100g: 40, fatPer100g: 60 }),
      perServingNutrients: n(350, { proteinPer100g: 10, fatPer100g: 15 }),
      matchedCount: 5,
      unmatchedCount: 0,
      unmatchedIngredients: [],
      matchedIngredients: [],
    }

    const patch = buildNutritionPatch(result, "abc123")

    expect(patch.nutrition.calories).toBe("350")
    expect(patch.nutrition.proteinContent).toBe("10")
    expect(patch.nutrition.fatContent).toBe("15")
    expect(patch.extras.calorie_estimator_hash).toBe("abc123")
    expect(patch.extras.calorie_estimator_total_kcal).toBe("1400")
    expect(patch.extras.calorie_estimator_yield).toBe("4")
    expect(patch.extras.calorie_estimator_unmatched).toBe("[]")
  })

  it("builds patch with empty nutrition when no servings", () => {
    const result: EstimateResult = {
      slug: "test",
      servings: null,
      totalNutrients: n(500),
      perServingNutrients: n(null),
      matchedCount: 2,
      unmatchedCount: 0,
      unmatchedIngredients: [],
      matchedIngredients: [],
    }

    const patch = buildNutritionPatch(result, "def456")

    expect(patch.nutrition.calories).toBeUndefined()
    expect(patch.extras.calorie_estimator_yield).toBeUndefined()
    expect(patch.extras.calorie_estimator_total_kcal).toBe("500")
  })

  it("handles zero total kcal", () => {
    const result: EstimateResult = {
      slug: "test",
      servings: 4,
      totalNutrients: n(0),
      perServingNutrients: n(0),
      matchedCount: 0,
      unmatchedCount: 3,
      unmatchedIngredients: ["salt", "pepper", "herbs"],
      matchedIngredients: [],
    }

    const patch = buildNutritionPatch(result, "ghi789")

    expect(patch.nutrition.calories).toBe("0")
    expect(patch.extras.calorie_estimator_total_kcal).toBeUndefined()
    expect(patch.extras.calorie_estimator_unmatched).toBe(JSON.stringify(["salt", "pepper", "herbs"]))
  })
})

describe("hasManualCalories", () => {
  it("detects manual entry: no hash, has nutrition", () => {
    const recipe = makeRecipe({
      nutrition: { calories: "400", carbohydrateContent: null, cholesterolContent: null, fatContent: null, fiberContent: null, proteinContent: null, saturatedFatContent: null, sodiumContent: null, sugarContent: null, transFatContent: null, unsaturatedFatContent: null },
      extras: {},
    })
    expect(hasManualCalories(recipe)).toBe(true)
  })

  it("returns false when hash already exists", () => {
    const recipe = makeRecipe({
      nutrition: { calories: "400", carbohydrateContent: null, cholesterolContent: null, fatContent: null, fiberContent: null, proteinContent: null, saturatedFatContent: null, sodiumContent: null, sugarContent: null, transFatContent: null, unsaturatedFatContent: null },
      extras: { calorie_estimator_hash: "abc123" },
    })
    expect(hasManualCalories(recipe)).toBe(false)
  })

  it("returns false when nutrition.calories is empty", () => {
    const recipe = makeRecipe({
      nutrition: { calories: "", carbohydrateContent: null, cholesterolContent: null, fatContent: null, fiberContent: null, proteinContent: null, saturatedFatContent: null, sodiumContent: null, sugarContent: null, transFatContent: null, unsaturatedFatContent: null },
      extras: {},
    })
    expect(hasManualCalories(recipe)).toBe(false)
  })

  it("returns false when nutrition is null", () => {
    const recipe = makeRecipe({ nutrition: null, extras: {} })
    expect(hasManualCalories(recipe)).toBe(false)
  })
})

describe("buildManualAckPatch", () => {
  it("sets hash and note, omits nutrition so existing calories survive", () => {
    const recipe = makeRecipe({
      nutrition: { calories: "400", carbohydrateContent: null, cholesterolContent: null, fatContent: null, fiberContent: null, proteinContent: null, saturatedFatContent: null, sodiumContent: null, sugarContent: null, transFatContent: null, unsaturatedFatContent: null },
      extras: {},
    })
    const patch = buildManualAckPatch(recipe, "manual-hash")

    expect(patch.nutrition).toBeUndefined()
    expect(patch.extras.calorie_estimator_hash).toBe("manual-hash")
    expect(patch.extras.calorie_estimator_note).toBe("Manual — preserved existing calorie entry")
  })

  it("preserves pre-existing extras", () => {
    const recipe = makeRecipe({
      nutrition: null,
      extras: { my_user_extra: "keepme", calorie_estimator_tags: JSON.stringify(["high-protein"]) },
    })
    const patch = buildManualAckPatch(recipe, "manual-hash")

    expect(patch.extras.my_user_extra).toBe("keepme")
    expect(patch.extras.calorie_estimator_tags).toBe(JSON.stringify(["high-protein"]))
    expect(patch.extras.calorie_estimator_hash).toBe("manual-hash")
  })
})


describe("nutrition calculation details", () => {
  it("builds an aligned breakdown with total and per-serving kcal", () => {
    const result: EstimateResult = {
      slug: "test",
      servings: 4,
      totalNutrients: n(5673),
      perServingNutrients: n(1418),
      matchedCount: 2,
      unmatchedCount: 0,
      unmatchedIngredients: [],
      matchedIngredients: [
        { name: "Chashu", grams: null, quantityLabel: "4 Portionen", kcalContribution: 1692, matched: true, nutrients: n(423) },
        { name: "Schweinebauch", grams: 600, quantityLabel: "600 g", kcalContribution: 720, matched: true, nutrients: n(120) },
      ],
    }
    const note = buildNutritionCalculationNote(result)
    expect(note.title).toBe("Nutrition calculation details")
    expect(note.text).toContain("Zutat")
    expect(note.text).toContain("Chashu")
    expect(note.text).toContain("4 Portionen")
    expect(note.text).toContain("1'692")
    expect(note.text).toContain("Gesamt")
    expect(note.text).toContain("5'673")
    expect(note.text).toContain("Pro Portion")
    expect(note.text).toContain("1'418")
    expect(note.text).toContain("| Zutat | Menge | Gramm | kcal |")
    expect(note.text).toContain("| Schweinebauch | 600 g | 600 g | 720 |")
    expect(note.text).not.toContain("```")
  })

  it("shows where an estimated weight comes from and escapes pipes", () => {
    const result: EstimateResult = {
      slug: "test", servings: 1, totalNutrients: n(300), perServingNutrients: n(300),
      matchedCount: 2, unmatchedCount: 0, unmatchedIngredients: ["Wasser"],
      matchedIngredients: [
        { name: "Pouletschenkel", grams: 300.4, quantityLabel: "2 Stück", kcalContribution: 200, matched: true, nutrients: n(66), gramsSource: "llm" },
        { name: "A|B", grams: 50, quantityLabel: "1 Stück", kcalContribution: 100, matched: true, nutrients: n(200), gramsSource: "database" },
      ],
    }
    const note = buildNutritionCalculationNote(result)
    expect(note.text).toContain("| Pouletschenkel | 2 Stück | 300 g (LLM) | 200 |")
    expect(note.text).toContain("| A\\|B | 1 Stück | 50 g (Open Food Facts) | 100 |")
    expect(note.text).toContain("Nicht berechnet: Wasser")
  })

  it("replaces only the estimator note and preserves existing notes", () => {
    const recipe = makeRecipe({
      notes: [
        { title: "My note", text: "Keep this" },
        { title: "Nutrition calculation details", text: "Old calculation" },
      ],
    })
    const result: EstimateResult = {
      slug: "test", servings: 2, totalNutrients: n(200), perServingNutrients: n(100),
      matchedCount: 1, unmatchedCount: 0, unmatchedIngredients: [],
      matchedIngredients: [{ name: "Milk", grams: 100, quantityLabel: "100 g", kcalContribution: 100, matched: true, nutrients: n(100) }],
    }
    const notes = mergeNutritionCalculationNote(recipe, result)
    expect(notes).toHaveLength(2)
    expect(notes.find((note) => note.title === "My note")?.text).toBe("Keep this")
    expect(notes.filter((note) => note.title === "Nutrition calculation details")).toHaveLength(1)
    expect(notes.find((note) => note.title === "Nutrition calculation details")?.text).toContain("100")
  })
})
