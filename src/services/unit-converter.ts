import type { MealieUnit } from "../types.js"

interface ConversionEntry {
  gramsPerUnit: number
  dependsOnFood: boolean
}

const FALLBACK_UNITS: Record<string, ConversionEntry> = {
  cup: { gramsPerUnit: 240, dependsOnFood: true },
  cups: { gramsPerUnit: 240, dependsOnFood: true },
  tablespoon: { gramsPerUnit: 15, dependsOnFood: false },
  tablespoons: { gramsPerUnit: 15, dependsOnFood: false },
  tbsp: { gramsPerUnit: 15, dependsOnFood: false },
  teaspoon: { gramsPerUnit: 5, dependsOnFood: false },
  teaspoons: { gramsPerUnit: 5, dependsOnFood: false },
  tsp: { gramsPerUnit: 5, dependsOnFood: false },
  ml: { gramsPerUnit: 1, dependsOnFood: true },
  milliliter: { gramsPerUnit: 1, dependsOnFood: true },
  milliliters: { gramsPerUnit: 1, dependsOnFood: true },
  l: { gramsPerUnit: 1000, dependsOnFood: true },
  liter: { gramsPerUnit: 1000, dependsOnFood: true },
  liters: { gramsPerUnit: 1000, dependsOnFood: true },
  gram: { gramsPerUnit: 1, dependsOnFood: false },
  grams: { gramsPerUnit: 1, dependsOnFood: false },
  gramm: { gramsPerUnit: 1, dependsOnFood: false },
  gramms: { gramsPerUnit: 1, dependsOnFood: false },
  g: { gramsPerUnit: 1, dependsOnFood: false },
  kilogram: { gramsPerUnit: 1000, dependsOnFood: false },
  kilograms: { gramsPerUnit: 1000, dependsOnFood: false },
  kg: { gramsPerUnit: 1000, dependsOnFood: false },
  ounce: { gramsPerUnit: 28.35, dependsOnFood: false },
  ounces: { gramsPerUnit: 28.35, dependsOnFood: false },
  oz: { gramsPerUnit: 28.35, dependsOnFood: false },
  pound: { gramsPerUnit: 453.592, dependsOnFood: false },
  pounds: { gramsPerUnit: 453.592, dependsOnFood: false },
  lb: { gramsPerUnit: 453.592, dependsOnFood: false },
  lbs: { gramsPerUnit: 453.592, dependsOnFood: false },
  pinch: { gramsPerUnit: 0.5, dependsOnFood: false },
  pinches: { gramsPerUnit: 0.5, dependsOnFood: false },
  dash: { gramsPerUnit: 0.3, dependsOnFood: false },
  dashes: { gramsPerUnit: 0.3, dependsOnFood: false },
  clove: { gramsPerUnit: 5, dependsOnFood: false },
  cloves: { gramsPerUnit: 5, dependsOnFood: false },
  piece: { gramsPerUnit: 0, dependsOnFood: true },
  pieces: { gramsPerUnit: 0, dependsOnFood: true },
  slice: { gramsPerUnit: 0, dependsOnFood: true },
  slices: { gramsPerUnit: 0, dependsOnFood: true },
}

export function convertToGrams(quantity: number, unit: MealieUnit | null): number | null {
  if (unit?.standardQuantity != null && unit.standardUnit != null) {
    const grams = standardUnitToGrams(unit.standardQuantity, unit.standardUnit)
    if (grams !== null) return grams * quantity
  }

  const candidates = [
    unit?.name,
    unit?.abbreviation,
  ].filter((s): s is string => s != null && s.length > 0)

  for (const candidate of candidates) {
    const name = candidate.toLowerCase().trim()
    const entry = FALLBACK_UNITS[name]
    if (entry) {
      if (entry.dependsOnFood && entry.gramsPerUnit === 0) return null
      return quantity * entry.gramsPerUnit
    }
  }

  return null
}

function standardUnitToGrams(quantity: number, unit: string): number | null {
  const u = unit.toLowerCase().trim()
  if (u === "g" || u === "gram" || u === "grams") return quantity
  if (u === "kg" || u === "kilogram" || u === "kilograms") return quantity * 1000
  if (u === "ml" || u === "milliliter" || u === "milliliters") return quantity
  if (u === "l" || u === "liter" || u === "liters") return quantity * 1000
  if (u === "oz" || u === "ounce" || u === "ounces") return quantity * 28.35
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return quantity * 453.592
  return null
}
