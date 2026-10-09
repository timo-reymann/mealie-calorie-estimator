import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { buildProgressNote, countLeafIngredients, createProgressReporter, PROGRESS_NOTE_TITLE } from "../src/services/progress.js"
import { mergeNutritionCalculationNote } from "../src/services/estimator.js"
import { wasRecentlyFailed, rememberFailure } from "../src/utils/recent-failures.js"
import { patchRecipe } from "../src/services/mealie-client.js"
import { config } from "../src/config.js"
import type { MealieIngredient, MealieRecipe, EstimateResult, NutrientSet } from "../src/types.js"

function ingredient(foodName: string, extra: Partial<MealieIngredient> = {}): MealieIngredient {
  return {
    quantity: 1,
    unit: null,
    food: { id: foodName, name: foodName, pluralName: null, aliases: [] },
    note: null,
    display: foodName,
    title: null,
    original_text: null,
    ...extra,
  }
}

function recipe(slug: string, ingredients: MealieIngredient[], notes: MealieRecipe["notes"] = []): MealieRecipe {
  return {
    slug,
    name: slug,
    recipeYield: null,
    recipeYieldQuantity: null,
    recipeServings: 1,
    recipeIngredient: ingredients,
    nutrition: null,
    notes,
    tags: [],
    extras: {},
    householdId: null,
  }
}

vi.mock("../src/services/mealie-client.js", () => ({ patchRecipe: vi.fn() }))

const patchMock = vi.mocked(patchRecipe)

describe("countLeafIngredients", () => {
  it("counts ingredients of referenced recipes instead of the reference line", () => {
    const child = recipe("child", [ingredient("A"), ingredient("B"), ingredient("C")])
    const parent = recipe("parent", [
      ingredient("X"),
      ingredient("", { referencedRecipe: child, quantity: 2 }),
    ])
    expect(countLeafIngredients(parent)).toBe(4)
  })

  it("ignores cycles, empty quantities and skipped references", () => {
    const loop = recipe("loop", [ingredient("L")])
    loop.recipeIngredient.push(ingredient("", { referencedRecipe: loop }))
    const child = recipe("child", [ingredient("A")])
    const parent = recipe("parent", [
      ingredient("", { referencedRecipe: loop }),
      ingredient("", { referencedRecipe: child, quantity: 0 }),
      ingredient("", { referencedRecipe: child, note: "nicht mitrechnen" }),
    ])
    expect(countLeafIngredients(parent)).toBe(1)
  })
})

describe("buildProgressNote", () => {
  it("renders a bar with counts and elapsed time", () => {
    const note = buildProgressNote(7, 14, 130_000)
    expect(note.title).toBe(PROGRESS_NOTE_TITLE)
    expect(note.text).toContain("█████░░░░░ 50 %")
    expect(note.text).toContain("7 von 14 Zutaten")
    expect(note.text).toContain("2 Min 10 s")
  })

  it("handles an empty recipe", () => {
    expect(buildProgressNote(0, 0, 4_000).text).toContain("░░░░░░░░░░ 0 %")
  })
})

describe("createProgressReporter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    patchMock.mockReset()
    patchMock.mockResolvedValue(undefined)
    config.progress.enabled = true
    config.progress.intervalMs = 10_000
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("writes nothing for fast runs", async () => {
    const patch = patchMock
    const reporter = createProgressReporter(recipe("fast", [ingredient("A"), ingredient("B")]))
    reporter.tracker?.step()
    reporter.tracker?.step()
    await reporter.stop()
    expect(patch).not.toHaveBeenCalled()
  })

  it("writes a progress note after the interval even if no ingredient is done yet", async () => {
    const patch = patchMock
    const reporter = createProgressReporter(
      recipe("slow", [ingredient("A"), ingredient("B"), ingredient("C"), ingredient("D")], [{ title: "Mine", text: "keep" }]),
    )

    await vi.advanceTimersByTimeAsync(11_000)
    await reporter.stop()

    expect(patch).toHaveBeenCalledTimes(1)
    const notes = patch.mock.calls[0][1].notes ?? []
    expect(notes.map((n) => n.title)).toEqual(["Mine", PROGRESS_NOTE_TITLE])
    expect(notes[1].text).toContain("0 von 4 Zutaten")
  })

  it("updates the counts on every interval", async () => {
    const patch = patchMock
    const reporter = createProgressReporter(recipe("slow", [ingredient("A"), ingredient("B"), ingredient("C"), ingredient("D")]))

    await vi.advanceTimersByTimeAsync(10_000)
    reporter.tracker?.step()
    reporter.tracker?.step()
    await vi.advanceTimersByTimeAsync(10_000)
    await reporter.stop()

    expect(patch).toHaveBeenCalledTimes(2)
    expect((patch.mock.calls[1][1].notes ?? [])[0].text).toContain("2 von 4 Zutaten")
  })

  it("does not write after stop", async () => {
    const patch = patchMock
    const reporter = createProgressReporter(recipe("late", [ingredient("A"), ingredient("B")]))
    await reporter.stop()
    await vi.advanceTimersByTimeAsync(20_000)
    reporter.tracker?.step()
    expect(patch).not.toHaveBeenCalled()
  })

  it("removes the progress note again when aborted after a write", async () => {
    const patch = patchMock
    const reporter = createProgressReporter(recipe("fail", [ingredient("A"), ingredient("B")], [{ title: "Mine", text: "keep" }]))
    await vi.advanceTimersByTimeAsync(11_000)
    reporter.tracker?.step()
    await reporter.abort()
    expect(patch).toHaveBeenCalledTimes(2)
    expect((patch.mock.calls[1][1].notes ?? []).map((n) => n.title)).toEqual(["Mine"])
  })

  it("is disabled by configuration", () => {
    config.progress.enabled = false
    expect(createProgressReporter(recipe("off", [ingredient("A")])).tracker).toBeUndefined()
  })

  it("survives a failing patch", async () => {
    patchMock.mockRejectedValue(new Error("down"))
    const reporter = createProgressReporter(recipe("err", [ingredient("A"), ingredient("B")]))
    await vi.advanceTimersByTimeAsync(11_000)
    reporter.tracker?.step()
    await expect(reporter.stop()).resolves.toBeUndefined()
  })
})

describe("final note", () => {
  it("removes the progress note when the result is written", () => {
    const n = (kcal: number): NutrientSet => ({
      kcalPer100g: kcal, proteinPer100g: null, carbsPer100g: null, fatPer100g: null,
      saturatedFatPer100g: null, transFatPer100g: null, unsaturatedFatPer100g: null,
      fiberPer100g: null, sugarPer100g: null, sodiumPer100g: null, cholesterolPer100g: null,
    })
    const result: EstimateResult = {
      slug: "x", servings: 1, totalNutrients: n(100), perServingNutrients: n(100),
      matchedCount: 0, unmatchedCount: 0, unmatchedIngredients: [], matchedIngredients: [],
    }
    const notes = mergeNutritionCalculationNote(
      recipe("x", [], [{ title: "Mine", text: "keep" }, buildProgressNote(1, 2, 1000)]),
      result,
    )
    expect(notes.map((note) => note.title)).toEqual(["Mine", "Nutrition calculation details"])
  })
})

describe("recent failures", () => {
  it("blocks a retry of the same ingredients for a short time", () => {
    vi.useFakeTimers()
    rememberFailure("a", "hash-1")
    expect(wasRecentlyFailed("a", "hash-1")).toBe(true)
    expect(wasRecentlyFailed("a", "hash-2")).toBe(false)
    vi.advanceTimersByTime(61_000)
    expect(wasRecentlyFailed("a", "hash-1")).toBe(false)
    vi.useRealTimers()
  })
})
