import crypto from "node:crypto"
import type {
  MealieRecipe, IngredientMatch, EstimateResult, NutritionPatch,
  NutrientSet, MealieNutrition,
} from "../types.js"
import { convertToGrams } from "./unit-converter.js"
import { lookupNutrients } from "./off-client.js"
import { estimateGrams, estimateNutrients } from "./llm-estimator.js"
import { logger } from "../utils/logger.js"

export function computeIngredientHash(recipe: MealieRecipe): string {
  const parts: string[] = []

  for (const ing of recipe.recipeIngredient) {
    const qty = ing.quantity ?? 0
    const unitName = ing.unit?.name ?? ""
    const foodName = ing.food?.name ?? ""
    parts.push(`${qty}|${unitName}|${foodName}`)
  }

  parts.sort()
  parts.push(`yield:${recipe.recipeYield ?? ""}`)
  parts.push(`servings:${recipe.recipeServings ?? ""}`)
  const hash = crypto.createHash("sha256").update(parts.join(",")).digest("hex")
  return hash
}

export function parseYield(recipeYield: string | null): number | null {
  if (!recipeYield) return null

  const rangeMatch = recipeYield.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (rangeMatch) {
    return Math.round((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2)
  }

  const numMatch = recipeYield.match(/(\d+(?:[.,]\d+)?)/)
  if (numMatch) {
    return parseFloat(numMatch[1].replace(",", "."))
  }

  return null
}

function emptyNutrients(): NutrientSet {
  return {
    kcalPer100g: null,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    saturatedFatPer100g: null,
    transFatPer100g: null,
    unsaturatedFatPer100g: null,
    fiberPer100g: null,
    sugarPer100g: null,
    sodiumPer100g: null,
    cholesterolPer100g: null,
  }
}

function addToTotal(total: NutrientSet, nutrients: NutrientSet, grams: number): NutrientSet {
  const factor = grams / 100
  const add = (a: number | null, b: number | null): number | null => {
    if (a === null && b === null) return null
    return (a ?? 0) + (b ?? 0) * factor
  }

  return {
    kcalPer100g: add(total.kcalPer100g, nutrients.kcalPer100g),
    proteinPer100g: add(total.proteinPer100g, nutrients.proteinPer100g),
    carbsPer100g: add(total.carbsPer100g, nutrients.carbsPer100g),
    fatPer100g: add(total.fatPer100g, nutrients.fatPer100g),
    saturatedFatPer100g: add(total.saturatedFatPer100g, nutrients.saturatedFatPer100g),
    transFatPer100g: add(total.transFatPer100g, nutrients.transFatPer100g),
    unsaturatedFatPer100g: add(total.unsaturatedFatPer100g, nutrients.unsaturatedFatPer100g),
    fiberPer100g: add(total.fiberPer100g, nutrients.fiberPer100g),
    sugarPer100g: add(total.sugarPer100g, nutrients.sugarPer100g),
    sodiumPer100g: add(total.sodiumPer100g, nutrients.sodiumPer100g),
    cholesterolPer100g: add(total.cholesterolPer100g, nutrients.cholesterolPer100g),
  }
}

function divideByServings(total: NutrientSet, servings: number): NutrientSet {
  const div = (v: number | null): number | null => (v !== null ? Math.round(v / servings) : null)
  return {
    kcalPer100g: div(total.kcalPer100g),
    proteinPer100g: div(total.proteinPer100g),
    carbsPer100g: div(total.carbsPer100g),
    fatPer100g: div(total.fatPer100g),
    saturatedFatPer100g: div(total.saturatedFatPer100g),
    transFatPer100g: div(total.transFatPer100g),
    unsaturatedFatPer100g: div(total.unsaturatedFatPer100g),
    fiberPer100g: div(total.fiberPer100g),
    sugarPer100g: div(total.sugarPer100g),
    sodiumPer100g: div(total.sodiumPer100g),
    cholesterolPer100g: div(total.cholesterolPer100g),
  }
}

export async function estimateRecipe(recipe: MealieRecipe): Promise<EstimateResult> {
  const matchedIngredients: IngredientMatch[] = []
  const unmatchedNames: string[] = []
  let totalNutrients = emptyNutrients()

  for (const ing of recipe.recipeIngredient) {
    const foodName = ing.food?.name
    const quantity = ing.quantity

    if (!foodName || quantity == null || quantity <= 0) {
      continue
    }

    let grams = convertToGrams(quantity, ing.unit)
    let llmEstimated = false

    if (grams === null) {
      const unitName = ing.unit?.name
      if (unitName) {
        const llmGrams = await estimateGrams(quantity, unitName, foodName)
        if (llmGrams !== null) {
          grams = llmGrams
          llmEstimated = true
        }
      }
    }

    if (grams === null) {
      unmatchedNames.push(foodName)
      matchedIngredients.push({ name: foodName, grams: null, matched: false, nutrients: null })
      continue
    }

    const result = await lookupNutrients(foodName, ing.unit?.name)

    if (!result.matched || result.nutrients === null) {
      const llmNutrients = await estimateNutrients(foodName)
      if (llmNutrients !== null) {
        totalNutrients = addToTotal(totalNutrients, llmNutrients, grams)
        matchedIngredients.push({ name: foodName, grams, matched: true, nutrients: llmNutrients, llmEstimated: true })
        continue
      }
      unmatchedNames.push(foodName)
      matchedIngredients.push({ name: foodName, grams, matched: false, nutrients: null })
      continue
    }

    totalNutrients = addToTotal(totalNutrients, result.nutrients, grams)
    matchedIngredients.push({ name: foodName, grams, matched: true, nutrients: result.nutrients, llmEstimated })
  }

  const servings = parseYield(recipe.recipeYield) ?? recipe.recipeServings
  const perServingNutrients = servings && servings > 0 ? divideByServings(totalNutrients, servings) : emptyNutrients()

  const result: EstimateResult = {
    slug: recipe.slug,
    servings,
    totalNutrients,
    perServingNutrients,
    matchedCount: matchedIngredients.filter((i) => i.matched).length,
    unmatchedCount: unmatchedNames.length,
    unmatchedIngredients: unmatchedNames,
    matchedIngredients,
  }

  logger.info(
    {
      slug: recipe.slug,
      servings,
      totalKcal: totalNutrients.kcalPer100g,
      kcalPerServing: perServingNutrients.kcalPer100g,
      matched: result.matchedCount,
      unmatched: result.unmatchedCount,
    },
    "Estimated nutrition for recipe",
  )

  return result
}

export function hasManualCalories(recipe: MealieRecipe): boolean {
  const hasHash = recipe.extras?.calorie_estimator_hash != null
  const hasStoredNutrition =
    recipe.nutrition?.calories != null && recipe.nutrition.calories.trim().length > 0

  return !hasHash && hasStoredNutrition
}

export function buildManualAckPatch(recipe: MealieRecipe, hash: string): NutritionPatch {
  return {
    nutrition: {},
    extras: {
      calorie_estimator_hash: hash,
      calorie_estimator_unmatched: JSON.stringify([]),
      calorie_estimator_note: "Manual — preserved existing calorie entry",
    },
  }
}

function n(v: number | null): string {
  return v != null ? v.toString() : ""
}

export function buildNutritionPatch(
  result: EstimateResult,
  hash: string,
  recipeYield: string | null,
): NutritionPatch {
  const llmIngredients = result.matchedIngredients
    .filter((i) => i.llmEstimated)
    .map((i) => i.name)

  const extras: Record<string, string> = {
    calorie_estimator_hash: hash,
    calorie_estimator_unmatched: JSON.stringify(result.unmatchedIngredients),
  }

  if (llmIngredients.length > 0) {
    extras.calorie_estimator_llm_ingredients = JSON.stringify(llmIngredients)
  }

  const p = result.perServingNutrients
  const totalKcal = result.totalNutrients.kcalPer100g
  if (totalKcal !== null && totalKcal > 0) {
    extras.calorie_estimator_total_kcal = totalKcal.toString()
  }

  const servings = parseYield(recipeYield)
  if (servings !== null) {
    extras.calorie_estimator_yield = servings.toString()
  }

  const nutrition: Partial<MealieNutrition> = {}
  const add = (key: keyof MealieNutrition, val: string) => {
    if (val !== "") nutrition[key] = val
  }

  add("calories", n(p.kcalPer100g))
  add("proteinContent", n(p.proteinPer100g))
  add("carbohydrateContent", n(p.carbsPer100g))
  add("fatContent", n(p.fatPer100g))
  add("saturatedFatContent", n(p.saturatedFatPer100g))
  add("transFatContent", n(p.transFatPer100g))
  add("unsaturatedFatContent", n(p.unsaturatedFatPer100g))
  add("fiberContent", n(p.fiberPer100g))
  add("sugarContent", n(p.sugarPer100g))
  add("sodiumContent", n(p.sodiumPer100g))
  add("cholesterolContent", n(p.cholesterolPer100g))

  return { nutrition, extras }
}
