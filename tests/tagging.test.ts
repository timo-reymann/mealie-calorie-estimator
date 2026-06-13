import { describe, it, expect } from "vitest"
import {
  getCalorieTag,
  getDigestibilityTag,
  computeTags,
  perServingFromRecipeNutrition,
  mergeTags,
  tagsAreComplete,
} from "../src/services/tagging.js"
import type { NutrientSet, MealieNutrition, MealieTag, MealieRecipe } from "../src/types.js"

function n(kcal: number, p: Partial<NutrientSet> = {}): NutrientSet {
  return {
    kcalPer100g: kcal, proteinPer100g: null, carbsPer100g: null, fatPer100g: null,
    saturatedFatPer100g: null, transFatPer100g: null, unsaturatedFatPer100g: null,
    fiberPer100g: null, sugarPer100g: null, sodiumPer100g: null, cholesterolPer100g: null,
    ...p,
  }
}

function tag(name: string, slug: string): MealieTag {
  return { id: slug, name, slug, groupId: null }
}

function makeRecipe(tags: MealieTag[], extrasSlugs?: string[]): MealieRecipe {
  return {
    slug: "test",
    name: "Test",
    recipeYield: null,
    recipeServings: null,
    recipeIngredient: [],
    nutrition: null,
    tags,
    extras: extrasSlugs ? { calorie_estimator_tags: JSON.stringify(extrasSlugs) } : {},
  }
}

describe("getCalorieTag", () => {
  it.each([
    [0, "Calories:Light"],
    [100, "Calories:Light"],
    [349, "Calories:Light"],
    [350, "Calories:Moderate"],
    [500, "Calories:Moderate"],
    [600, "Calories:Moderate"],
    [601, "Calories:Hearty"],
    [700, "Calories:Hearty"],
    [850, "Calories:Hearty"],
    [851, "Calories:Heavy"],
    [1000, "Calories:Heavy"],
    [2000, "Calories:Heavy"],
  ])("returns '%s' for %d kcal", (kcal, expected) => {
    expect(getCalorieTag(kcal)).toBe(expected)
  })

  it("returns null for null kcal", () => {
    expect(getCalorieTag(null)).toBeNull()
  })
})

describe("getDigestibilityTag", () => {
  it("returns Easy Digest for low fat, moderate calories", () => {
    const nutrients = n(400, { fatPer100g: 10 }) // 10g * 9 = 90 cal fat, 90/400 = 22.5%
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Easy")
  })

  it("returns Easy Digest at boundaries (fat 30%, 600 kcal)", () => {
    const nutrients = n(600, { fatPer100g: 20 }) // 20g * 9 = 180 cal fat, 180/600 = 30% (not < 30%)
    expect(getDigestibilityTag(nutrients)).not.toBe("Digest:Easy")
  })

  it("returns Easy Digest just under fat threshold", () => {
    const nutrients = n(600, { fatPer100g: 19.99 }) // ~30% fat
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Easy")
  })

  it("returns Slow Digest for high fat", () => {
    const nutrients = n(500, { fatPer100g: 25 }) // 25g * 9 = 225 cal fat, 225/500 = 45%
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Slow")
  })

  it("returns Slow Digest at fat threshold (40%)", () => {
    const nutrients = n(500, { fatPer100g: 22.23 }) // 22.23 * 9 / 500 = 40.01%
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Slow")
  })

  it("returns Unknown Digest for moderate fat and heavy calories", () => {
    const nutrients = n(700, { fatPer100g: 25 }) // 25*9/700 = 32.1% - between 30-40%
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Unknown")
  })

  it("returns Unknown Digest for middle ground (fat 35%)", () => {
    const nutrients = n(500, { fatPer100g: 19.44 }) // 19.44*9/500 = 35%
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Unknown")
  })

  it("returns Unknown Digest when kcal is null", () => {
    const nutrients = n(0, { kcalPer100g: null, fatPer100g: 10 })
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Unknown")
  })

  it("returns Unknown Digest when fat is null", () => {
    const nutrients = n(400, { fatPer100g: null })
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Unknown")
  })

  it("returns Unknown Digest when both kcal and fat are null", () => {
    const nutrients = n(0, { kcalPer100g: null, fatPer100g: null })
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Unknown")
  })

  it("handles very low kcal edge case", () => {
    const nutrients = n(50, { fatPer100g: 1 }) // 1*9/50 = 18% fat
    expect(getDigestibilityTag(nutrients)).toBe("Digest:Easy")
  })
})

describe("computeTags", () => {
  it("returns calorie tag and digest tag for complete data", () => {
    const nutrients = n(400, { fatPer100g: 10 })
    const tags = computeTags(nutrients)
    expect(tags).toEqual(["Calories:Moderate", "Digest:Easy"])
  })

  it("returns only digest tag when kcal is null", () => {
    const nutrients = n(0, { kcalPer100g: null, fatPer100g: null })
    const tags = computeTags(nutrients)
    expect(tags).toEqual(["Digest:Unknown"])
  })

  it("includes calorie tag even when digest is unknown", () => {
    const nutrients = n(700, { fatPer100g: 25 })
    const tags = computeTags(nutrients)
    expect(tags).toEqual(["Calories:Hearty", "Digest:Unknown"])
  })

  it("returns Heavy and Slow Digest for high calorie high fat", () => {
    const nutrients = n(900, { fatPer100g: 50 }) // 50*9/900 = 50% fat
    const tags = computeTags(nutrients)
    expect(tags).toEqual(["Calories:Heavy", "Digest:Slow"])
  })
})

describe("perServingFromRecipeNutrition", () => {
  it("parses nutrition data into NutrientSet", () => {
    const nutrition: MealieNutrition = {
      calories: "450",
      fatContent: "20",
      proteinContent: "30",
      carbohydrateContent: "40",
      fiberContent: "5",
      sugarContent: "10",
      sodiumContent: "800",
      cholesterolContent: "100",
      saturatedFatContent: "8",
      transFatContent: "1",
      unsaturatedFatContent: "11",
    }

    const result = perServingFromRecipeNutrition(nutrition)
    expect(result.kcalPer100g).toBe(450)
    expect(result.fatPer100g).toBe(20)
    expect(result.proteinPer100g).toBe(30)
    expect(result.carbsPer100g).toBe(40)
    expect(result.fiberPer100g).toBe(5)
    expect(result.sugarPer100g).toBe(10)
    expect(result.sodiumPer100g).toBe(800)
    expect(result.cholesterolPer100g).toBe(100)
    expect(result.saturatedFatPer100g).toBe(8)
    expect(result.transFatPer100g).toBe(1)
    expect(result.unsaturatedFatPer100g).toBe(11)
  })

  it("returns nulls for empty strings", () => {
    const nutrition: MealieNutrition = {
      calories: "", fatContent: "", proteinContent: "", carbohydrateContent: "",
      fiberContent: "", sugarContent: "", sodiumContent: "", cholesterolContent: "",
      saturatedFatContent: "", transFatContent: "", unsaturatedFatContent: "",
    }

    const result = perServingFromRecipeNutrition(nutrition)
    expect(result.kcalPer100g).toBeNull()
    expect(result.fatPer100g).toBeNull()
  })

  it("returns all nulls for null nutrition", () => {
    const result = perServingFromRecipeNutrition(null)
    expect(result.kcalPer100g).toBeNull()
    expect(result.fatPer100g).toBeNull()
    expect(result.proteinPer100g).toBeNull()
  })
})

describe("mergeTags", () => {
  it("preserves user tags and adds auto tags", () => {
    const userTags = [tag("UserTag", "usertag")]
    const recipe = makeRecipe(userTags, ["calories-light"])

    const result = mergeTags(recipe, [tag("Calories:Hearty", "calories-hearty")], ["calories-light"])
    expect(result).toHaveLength(2)
    expect(result.map(t => t.slug)).toContain("usertag")
    expect(result.map(t => t.slug)).toContain("calories-hearty")
  })

  it("replaces old auto tags with new ones", () => {
    const recipe = makeRecipe(
      [tag("Calories:Light", "calories-light"), tag("UserTag", "usertag")],
      ["calories-light"],
    )

    const result = mergeTags(recipe, [tag("Calories:Hearty", "calories-hearty")], ["calories-light"])
    expect(result).toHaveLength(2)
    expect(result.map(t => t.slug)).toContain("usertag")
    expect(result.map(t => t.slug)).toContain("calories-hearty")
    expect(result.map(t => t.slug)).not.toContain("calories-light")
  })

  it("removes all old auto tags when no new auto tags", () => {
    const recipe = makeRecipe(
      [tag("Calories:Light", "calories-light"), tag("UserTag", "usertag")],
      ["calories-light"],
    )

    const result = mergeTags(recipe, [], ["calories-light"])
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe("usertag")
  })

  it("handles empty recipe tags", () => {
    const recipe = makeRecipe([], ["calories-light"])

    const result = mergeTags(recipe, [tag("Calories:Light", "calories-light")], ["calories-light"])
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe("calories-light")
  })

  it("handles null recipe tags", () => {
    const recipe = makeRecipe([], ["calories-light"])
    recipe.tags = null

    const result = mergeTags(recipe, [tag("Calories:Light", "calories-light")], [])
    expect(result).toHaveLength(1)
  })
})

describe("tagsAreComplete", () => {
  it("returns true when all auto-tags are present", () => {
    const recipe = makeRecipe(
      [tag("Calories:Light", "calories-light"), tag("Digest:Easy", "digest-easy")],
      ["calories-light", "digest-easy"],
    )
    expect(tagsAreComplete(recipe)).toBe(true)
  })

  it("returns false when auto-tags are missing from recipe tags", () => {
    const recipe = makeRecipe(
      [tag("Calories:Light", "calories-light")],
      ["calories-light", "digest-easy"],
    )
    expect(tagsAreComplete(recipe)).toBe(false)
  })

  it("returns false when no auto-tags stored (upgrade from old version)", () => {
    const recipe = makeRecipe(
      [tag("Calories:Light", "calories-light")],
      [],
    )
    expect(tagsAreComplete(recipe)).toBe(false)
  })

  it("returns false when extras is empty", () => {
    const recipe = makeRecipe([], [])
    expect(tagsAreComplete(recipe)).toBe(false)
  })

  it("returns false when extras is null", () => {
    const recipe = makeRecipe([], [])
    recipe.extras = null
    expect(tagsAreComplete(recipe)).toBe(false)
  })
})
