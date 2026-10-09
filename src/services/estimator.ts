import crypto from "node:crypto"
import type {
  MealieRecipe, MealieIngredient, IngredientMatch, EstimateResult, NutritionPatch,
  NutrientSet, MealieNutrition, RecipeNote,
} from "../types.js"
import { config } from "../config.js"
import { convertToGrams } from "./unit-converter.js"
import { lookupNutrients, lookupServingWeight } from "./off-client.js"
import { estimateGrams, estimateNutrients } from "./llm-estimator.js"
import { logger } from "../utils/logger.js"
import { parseEdiblePercent, ingredientNoteHint } from "./edible-share.js"
import { gramsPerUnitFromDescription } from "./food-weight.js"
import { PROGRESS_NOTE_TITLE, type ProgressTracker } from "./progress.js"

export const CALCULATION_VERSION = 3

function standardUnitPart(ing: MealieIngredient): string {
  const unit = ing.unit
  return unit?.standardQuantity != null && unit.standardUnit ? `|std:${unit.standardQuantity}${unit.standardUnit}` : ""
}

export function computeIngredientHash(recipe: MealieRecipe, stack: ReadonlySet<string> = new Set([recipe.slug])): string {
  const parts: string[] = []

  for (const ing of recipe.recipeIngredient) {
    const qty = ing.quantity ?? 0
    const unitName = ing.unit?.name ?? ""
    const foodName = ing.food?.name ?? ""
    const referenced = ing.referencedRecipe
    let referencedPart = ""
    if (referenced) {
      const nested = stack.has(referenced.slug)
        ? "cycle"
        : computeIngredientHash(referenced, new Set([...stack, referenced.slug]))
      referencedPart = `${referenced.slug}#${nested}`
    }
    const percent = parseEdiblePercent(ing.note)
    const percentPart = percent === null ? "" : `|edible:${percent}`
    const hint = ingredientNoteHint(ing.note)
    const hintPart = hint ? `|note:${hint}` : ""
    const foodGrams = gramsPerUnitFromDescription(ing.food?.description, ing.unit?.name)
    const foodGramsPart = foodGrams === null ? "" : `|food:${foodGrams}`
    parts.push(`${qty}|${unitName}|${foodName}|${referencedPart}${percentPart}${hintPart}${standardUnitPart(ing)}${foodGramsPart}`)
  }

  parts.sort()
  parts.push(`servings:${recipe.recipeServings ?? ""}`)
  parts.push(`yieldQuantity:${recipe.recipeYieldQuantity ?? ""}`)
  parts.push(`calc:${CALCULATION_VERSION}`)
  const hash = crypto.createHash("sha256").update(parts.join(",")).digest("hex")
  return hash
}

export function shouldEstimate(recipe: MealieRecipe): boolean {
  if (config.estimate.strategy === "all") return true
  const tagName = config.estimate.tag.toLowerCase()
  return (recipe.tags || []).some(t => t.slug === tagName || t.name.toLowerCase() === tagName)
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

function scaleNutrients(nutrients: NutrientSet, factor: number): NutrientSet {
  const scale = (v: number | null): number | null => v !== null ? v * factor : null
  return {
    kcalPer100g: scale(nutrients.kcalPer100g), proteinPer100g: scale(nutrients.proteinPer100g), carbsPer100g: scale(nutrients.carbsPer100g), fatPer100g: scale(nutrients.fatPer100g), saturatedFatPer100g: scale(nutrients.saturatedFatPer100g), transFatPer100g: scale(nutrients.transFatPer100g), unsaturatedFatPer100g: scale(nutrients.unsaturatedFatPer100g), fiberPer100g: scale(nutrients.fiberPer100g), sugarPer100g: scale(nutrients.sugarPer100g), sodiumPer100g: scale(nutrients.sodiumPer100g), cholesterolPer100g: scale(nutrients.cholesterolPer100g),
  }
}

function addNutrients(total: NutrientSet, add: NutrientSet): NutrientSet {
  const sum = (a: number | null, b: number | null): number | null => a === null && b === null ? null : (a ?? 0) + (b ?? 0)
  return {
    kcalPer100g: sum(total.kcalPer100g, add.kcalPer100g), proteinPer100g: sum(total.proteinPer100g, add.proteinPer100g), carbsPer100g: sum(total.carbsPer100g, add.carbsPer100g), fatPer100g: sum(total.fatPer100g, add.fatPer100g), saturatedFatPer100g: sum(total.saturatedFatPer100g, add.saturatedFatPer100g), transFatPer100g: sum(total.transFatPer100g, add.transFatPer100g), unsaturatedFatPer100g: sum(total.unsaturatedFatPer100g, add.unsaturatedFatPer100g), fiberPer100g: sum(total.fiberPer100g, add.fiberPer100g), sugarPer100g: sum(total.sugarPer100g, add.sugarPer100g), sodiumPer100g: sum(total.sodiumPer100g, add.sodiumPer100g), cholesterolPer100g: sum(total.cholesterolPer100g, add.cholesterolPer100g),
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

function formatQuantity(quantity: number, unit: MealieIngredient["unit"]): string {
  const quantityText = Number.isInteger(quantity) ? quantity.toString() : quantity.toString()
  const unitName = unit?.name?.trim()
  return unitName ? quantityText + " " + unitName : quantityText
}

function withPercent(label: string, percent: number | null): string {
  if (percent === null) return label
  return label ? `${label} [${percent}%]` : `[${percent}%]`
}

interface IngredientOutcome {
  foodName: string
  grams: number | null
  quantityLabel: string
  nutrients: NutrientSet | null
  kcalContribution: number | null
  llmEstimated: boolean
  gramsSource?: "database" | "llm" | "food"
}

async function evaluateIngredient(ing: MealieIngredient): Promise<IngredientOutcome | null> {
  const foodName = ing.food?.name
  const quantity = ing.quantity

  if (!foodName || quantity == null || quantity <= 0) {
    return null
  }

  const foodGramsPerUnit = gramsPerUnitFromDescription(ing.food?.description, ing.unit?.name)
  let grams = foodGramsPerUnit !== null ? foodGramsPerUnit * quantity : convertToGrams(quantity, ing.unit)
  let llmEstimated = false
  let gramsSource: "database" | "llm" | "food" | undefined = foodGramsPerUnit !== null ? "food" : undefined

  if (grams === null) {
    const unitName = ing.unit?.name
    if (unitName) {
      const databaseGrams = await lookupServingWeight(foodName, unitName)
      if (databaseGrams !== null) {
        grams = quantity * databaseGrams
        gramsSource = "database"
        logger.debug({ foodName, unitName, gramsPerUnit: databaseGrams }, "Using OFF serving weight")
      }
    }

    if (grams === null && unitName) {
      const llmGrams = await estimateGrams(quantity, unitName, foodName, ingredientNoteHint(ing.note))
      if (llmGrams !== null) {
        grams = llmGrams
        llmEstimated = true
        gramsSource = "llm"
      }
    }
  }

  if (grams === null) {
    return { foodName, grams: null, quantityLabel: formatQuantity(quantity, ing.unit), nutrients: null, kcalContribution: null, llmEstimated: false }
  }

  const result = await lookupNutrients(foodName, ing.unit?.name)

  if (!result.matched || result.nutrients === null) {
    const llmNutrients = await estimateNutrients(foodName)
    if (llmNutrients !== null) {
      return { foodName, grams, quantityLabel: formatQuantity(quantity, ing.unit), nutrients: llmNutrients, kcalContribution: llmNutrients.kcalPer100g !== null ? llmNutrients.kcalPer100g * grams / 100 : null, llmEstimated: true, gramsSource }
    }
    return { foodName, grams, quantityLabel: formatQuantity(quantity, ing.unit), nutrients: null, kcalContribution: null, llmEstimated: false, gramsSource }
  }

  return { foodName, grams, quantityLabel: formatQuantity(quantity, ing.unit), nutrients: result.nutrients, kcalContribution: result.nutrients.kcalPer100g !== null ? result.nutrients.kcalPer100g * grams / 100 : null, llmEstimated, gramsSource }
}

interface EstimateContext { stack: Set<string>; progress?: ProgressTracker }

async function evaluateReferencedRecipe(ing: MealieIngredient, context: EstimateContext): Promise<{ nutrients: NutrientSet; name: string; quantityLabel: string } | null> {
  const referenced = ing.referencedRecipe
  const quantity = ing.quantity
  if (!referenced?.slug || quantity == null || quantity <= 0 || context.stack.has(referenced.slug)) return null
  const result = await estimateRecipe(referenced, { stack: new Set([...context.stack, referenced.slug]), progress: context.progress })
  if (result.servings == null || result.servings <= 0 || result.totalNutrients.kcalPer100g === null) return null
  return { name: referenced.name || referenced.slug, quantityLabel: formatQuantity(quantity, ing.unit), nutrients: scaleNutrients(result.totalNutrients, quantity / result.servings) }
}

export async function estimateRecipe(recipe: MealieRecipe, context: EstimateContext = { stack: new Set([recipe.slug]) }): Promise<EstimateResult> {
  const startedAt = Date.now()
  const matchedIngredients: IngredientMatch[] = []
  const unmatchedNames: string[] = []
  let totalNutrients = emptyNutrients()

  const outcomes = await Promise.all(recipe.recipeIngredient.map(async (ing) => {
    const percent = parseEdiblePercent(ing.note)
    if (percent === 0) {
      if (!ing.referencedRecipe) context.progress?.step()
      return { kind: "skipped" as const, ingredient: ing, percent }
    }
    if (ing.referencedRecipe) return { kind: "recipe" as const, ingredient: ing, percent, result: await evaluateReferencedRecipe(ing, context) }
    const result = await evaluateIngredient(ing)
    context.progress?.step()
    return { kind: "food" as const, percent, result }
  }))

  for (const outcome of outcomes) {
    const factor = outcome.percent === null ? 1 : outcome.percent / 100
    if (outcome.kind === "skipped") {
      const ing = outcome.ingredient
      const name = ing.food?.name ?? ing.referencedRecipe?.name ?? ing.referencedRecipe?.slug ?? ing.display ?? "Zutat"
      const quantityLabel = ing.quantity != null ? formatQuantity(ing.quantity, ing.unit) : ""
      matchedIngredients.push({ name, grams: null, quantityLabel: withPercent(quantityLabel, 0), kcalContribution: 0, matched: true, nutrients: null })
      continue
    }
    if (outcome.kind === "recipe") {
      const name = outcome.result?.name ?? outcome.ingredient.referencedRecipe?.name ?? outcome.ingredient.referencedRecipe?.slug ?? "Referenced recipe"
      if (outcome.result === null) {
        unmatchedNames.push(name)
        matchedIngredients.push({ name, grams: null, quantityLabel: outcome.ingredient.quantity != null ? formatQuantity(outcome.ingredient.quantity, outcome.ingredient.unit) : "", kcalContribution: null, matched: false, nutrients: null })
      } else {
        const scaled = scaleNutrients(outcome.result.nutrients, factor)
        totalNutrients = addNutrients(totalNutrients, scaled)
        matchedIngredients.push({ name, grams: null, quantityLabel: withPercent(outcome.result.quantityLabel, outcome.percent), kcalContribution: scaled.kcalPer100g, matched: true, nutrients: scaled })
      }
      continue
    }

    const ingredientOutcome = outcome.result
    if (ingredientOutcome === null) continue
    if (ingredientOutcome.grams === null || ingredientOutcome.nutrients === null) {
      unmatchedNames.push(ingredientOutcome.foodName)
      matchedIngredients.push({ name: ingredientOutcome.foodName, grams: ingredientOutcome.grams, quantityLabel: ingredientOutcome.quantityLabel, kcalContribution: null, matched: false, nutrients: null })
      continue
    }
    totalNutrients = addToTotal(totalNutrients, ingredientOutcome.nutrients, ingredientOutcome.grams * factor)
    matchedIngredients.push({ name: ingredientOutcome.foodName, grams: ingredientOutcome.grams, quantityLabel: withPercent(ingredientOutcome.quantityLabel, outcome.percent), kcalContribution: ingredientOutcome.kcalContribution === null ? null : ingredientOutcome.kcalContribution * factor, matched: true, nutrients: ingredientOutcome.nutrients, llmEstimated: ingredientOutcome.llmEstimated, gramsSource: ingredientOutcome.gramsSource })
  }

  const servings = recipe.recipeServings ?? recipe.recipeYieldQuantity ?? 1
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
      durationMs: Date.now() - startedAt,
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
    extras: {
      ...recipe.extras,
      calorie_estimator_hash: hash,
      calorie_estimator_unmatched: JSON.stringify([]),
      calorie_estimator_note: "Manual — preserved existing calorie entry",
    },
  }
}

function n(v: number | null): string {
  return v != null ? v.toString() : ""
}

export const NUTRITION_DETAILS_NOTE_TITLE = "Nutrition calculation details"

function formatKcal(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—"
  return Math.round(value).toLocaleString("de-CH").replace(/’/g, "'")
}

const GRAMS_SOURCE_LABELS = { database: "Open Food Facts", llm: "LLM", food: "Zutat" } as const

function formatGrams(ingredient: IngredientMatch): string {
  if (ingredient.grams == null) return "—"
  const grams = Math.round(ingredient.grams) + " g"
  return ingredient.gramsSource ? grams + " (" + GRAMS_SOURCE_LABELS[ingredient.gramsSource] + ")" : grams
}

function escapeCell(text: string): string {
  return text.replaceAll("|", "\\|")
}

export function buildNutritionCalculationNote(result: EstimateResult): RecipeNote {
  const row = (name: string, quantity: string, grams: string, kcal: string) =>
    "| " + [escapeCell(name), escapeCell(quantity), grams, kcal].join(" | ") + " |"
  const lines = [
    "| Zutat | Menge | Gramm | kcal |",
    "|---|---|---:|---:|",
    ...result.matchedIngredients.map((ingredient) =>
      row(ingredient.name, ingredient.quantityLabel ?? "", formatGrams(ingredient), formatKcal(ingredient.kcalContribution ?? null))),
    row("**Gesamt**", "", "", "**" + formatKcal(result.totalNutrients.kcalPer100g) + "**"),
  ]
  if (result.servings != null && result.servings > 0) {
    lines.push(row("**Pro Portion**", "(" + result.servings + ")", "", "**" + formatKcal(result.perServingNutrients.kcalPer100g) + "**"))
  }
  if (result.unmatchedIngredients.length > 0) lines.push("", "Nicht berechnet: " + result.unmatchedIngredients.join(", "))
  return { title: NUTRITION_DETAILS_NOTE_TITLE, text: lines.join("\n") }
}

export function mergeNutritionCalculationNote(recipe: MealieRecipe, result: EstimateResult): RecipeNote[] {
  const note = buildNutritionCalculationNote(result)
  const existing = recipe.notes ?? []
  return [...existing.filter((item) => item.title !== NUTRITION_DETAILS_NOTE_TITLE && item.title !== PROGRESS_NOTE_TITLE), note]
}

export function buildNutritionPatch(
  result: EstimateResult,
  hash: string,
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

  if (result.servings !== null) {
    extras.calorie_estimator_yield = result.servings.toString()
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
