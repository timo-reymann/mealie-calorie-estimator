import { describe, it, expect } from "vitest"
import { convertToGrams } from "../src/services/unit-converter.js"
import type { MealieUnit } from "../src/types.js"

function unit(overrides: Partial<MealieUnit> = {}): MealieUnit {
  return {
    id: "1",
    name: "g",
    pluralName: "g",
    abbreviation: "g",
    standardQuantity: null,
    standardUnit: null,
    ...overrides,
  }
}

describe("convertToGrams", () => {
  it("uses standardQuantity when available", () => {
    const u = unit({ name: "cup", standardQuantity: 240, standardUnit: "ml" })
    expect(convertToGrams(2, u)).toBe(480)
  })

  it("uses standardQuantity with g unit", () => {
    const u = unit({ name: "custom", standardQuantity: 100, standardUnit: "g" })
    expect(convertToGrams(3, u)).toBe(300)
  })

  it("uses fallback for known units", () => {
    expect(convertToGrams(1, unit({ name: "kg" }))).toBe(1000)
    expect(convertToGrams(2, unit({ name: "tbsp" }))).toBe(30)
    expect(convertToGrams(3, unit({ name: "tsp" }))).toBe(15)
    expect(convertToGrams(1, unit({ name: "oz" }))).toBe(28.35)
    expect(convertToGrams(1, unit({ name: "lb" }))).toBe(453.592)
    expect(convertToGrams(1, unit({ name: "pinch" }))).toBe(0.5)
  })

  it("returns null for unknown units", () => {
    expect(convertToGrams(1, unit({ name: "handful", abbreviation: "" }))).toBeNull()
  })

  it("returns null for piece/slice units", () => {
    expect(convertToGrams(2, unit({ name: "piece" }))).toBeNull()
    expect(convertToGrams(1, unit({ name: "slice" }))).toBeNull()
  })

  it("returns null when unit is null", () => {
    expect(convertToGrams(1, null)).toBeNull()
  })

  it("handles ml to grams via standardUnit", () => {
    const u = unit({ name: "liter", standardQuantity: 1, standardUnit: "l" })
    expect(convertToGrams(2, u)).toBe(2000)
  })
})
