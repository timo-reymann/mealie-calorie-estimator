import { describe, it, expect } from "vitest"
import { gramsPerUnitFromDescription } from "../src/services/food-weight.js"

describe("gramsPerUnitFromDescription", () => {
  it("reads a single entry", () => {
    expect(gramsPerUnitFromDescription("[Stück=55g]", "Stück")).toBe(55)
  })

  it("picks the entry that matches the unit", () => {
    const description = "Frisch [Stück=55g] [Bund=30g] [Esslöffel=13g]"
    expect(gramsPerUnitFromDescription(description, "Bund")).toBe(30)
    expect(gramsPerUnitFromDescription(description, "Esslöffel")).toBe(13)
  })

  it("ignores case, umlauts and spelling variants of Stück", () => {
    expect(gramsPerUnitFromDescription("[stueck=55g]", "Stück")).toBe(55)
    expect(gramsPerUnitFromDescription("[Stück=55g]", "Stk")).toBe(55)
    expect(gramsPerUnitFromDescription("[Stk=55g]", "Stück")).toBe(55)
  })

  it("supports kg, comma decimals and a missing unit", () => {
    expect(gramsPerUnitFromDescription("[Stück=1,5kg]", "Stück")).toBe(1500)
    expect(gramsPerUnitFromDescription("[Stück=12,5 g]", "Stück")).toBe(12.5)
    expect(gramsPerUnitFromDescription("[Stück=40]", "Stück")).toBe(40)
  })

  it("returns null without a matching entry", () => {
    expect(gramsPerUnitFromDescription("[Bund=30g]", "Stück")).toBeNull()
    expect(gramsPerUnitFromDescription("nur Text", "Stück")).toBeNull()
    expect(gramsPerUnitFromDescription(null, "Stück")).toBeNull()
    expect(gramsPerUnitFromDescription("[Stück=55g]", null)).toBeNull()
  })

  it("ignores zero values and percent markers", () => {
    expect(gramsPerUnitFromDescription("[Stück=0g]", "Stück")).toBeNull()
    expect(gramsPerUnitFromDescription("[30%]", "Stück")).toBeNull()
  })
})
