import type { NutrientSet, MealieNutrition, MealieTag, MealieRecipe } from "../types.js"
import { getOrCreateTags } from "./mealie-client.js"

export function getCalorieTag(kcal: number | null): string | null {
  if (kcal === null) return null
  if (kcal < 350) return "Calories:Light"
  if (kcal <= 600) return "Calories:Moderate"
  if (kcal <= 850) return "Calories:Hearty"
  return "Calories:Heavy"
}

export function getDigestibilityTag(nutrients: NutrientSet): string {
  const { kcalPer100g, fatPer100g } = nutrients

  if (kcalPer100g === null || fatPer100g === null) return "Digest:Unknown"

  const fatCalPct = (fatPer100g * 9 / kcalPer100g) * 100

  if (fatCalPct < 30 && kcalPer100g <= 600) return "Digest:Easy"
  if (fatCalPct >= 40) return "Digest:Slow"

  return "Digest:Unknown"
}

export function computeTags(perServing: NutrientSet): string[] {
  const tags: string[] = []
  const calorieTag = getCalorieTag(perServing.kcalPer100g)
  if (calorieTag) tags.push(calorieTag)
  tags.push(getDigestibilityTag(perServing))
  return tags
}

export function perServingFromRecipeNutrition(nutrition: MealieNutrition | null): NutrientSet {
  if (!nutrition) {
    return {
      kcalPer100g: null, proteinPer100g: null, carbsPer100g: null,
      fatPer100g: null, saturatedFatPer100g: null, transFatPer100g: null,
      unsaturatedFatPer100g: null, fiberPer100g: null, sugarPer100g: null,
      sodiumPer100g: null, cholesterolPer100g: null,
    }
  }

  const p = (v: string | null): number | null => {
    if (v === null || v.trim() === "") return null
    const n = Number.parseFloat(v)
    return Number.isNaN(n) ? null : n
  }

  return {
    kcalPer100g: p(nutrition.calories),
    proteinPer100g: p(nutrition.proteinContent),
    carbsPer100g: p(nutrition.carbohydrateContent),
    fatPer100g: p(nutrition.fatContent),
    saturatedFatPer100g: p(nutrition.saturatedFatContent),
    transFatPer100g: p(nutrition.transFatContent),
    unsaturatedFatPer100g: p(nutrition.unsaturatedFatContent),
    fiberPer100g: p(nutrition.fiberContent),
    sugarPer100g: p(nutrition.sugarContent),
    sodiumPer100g: p(nutrition.sodiumContent),
    cholesterolPer100g: p(nutrition.cholesterolContent),
  }
}

export async function resolveAutoTags(
  recipe: MealieRecipe,
  perServing: NutrientSet,
): Promise<{ tags: MealieTag[]; slugs: string[] }> {
  const tagNames = computeTags(perServing)
  const autoTags = await getOrCreateTags(tagNames)
  const oldSlugs: string[] = JSON.parse(recipe.extras?.calorie_estimator_tags || "[]")
  return { tags: autoTags, slugs: oldSlugs }
}

export function mergeTags(
  recipe: MealieRecipe,
  autoTags: MealieTag[],
  oldSlugs: string[],
): MealieTag[] {
  const userTags = (recipe.tags || []).filter(t => !oldSlugs.includes(t.slug))
  return [...userTags, ...autoTags]
}

export function tagsAreComplete(recipe: MealieRecipe): boolean {
  const slugs: string[] = JSON.parse(recipe.extras?.calorie_estimator_tags || "[]")
  if (slugs.length === 0) return false
  const current = new Set((recipe.tags || []).map(t => t.slug))
  return slugs.every(s => current.has(s))
}

export async function resolveAndMergeTags(
  recipe: MealieRecipe,
  perServing: NutrientSet,
): Promise<{ tags: MealieTag[]; tagSlugs: string[] }> {
  const { tags: autoTags, slugs: oldSlugs } = await resolveAutoTags(recipe, perServing)
  const merged = mergeTags(recipe, autoTags, oldSlugs)
  return { tags: merged, tagSlugs: autoTags.map(t => t.slug) }
}
