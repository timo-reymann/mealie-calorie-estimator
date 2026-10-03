import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  recordStart,
  getHistory,
  clearHistory,
  onChange,
} from "../src/utils/execution-history.js"

beforeEach(() => {
  clearHistory()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("execution-history", () => {
  it("records a start as running", () => {
    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })

    const [entry] = getHistory()
    expect(entry.status).toBe("running")
    expect(entry.trigger).toBe("webhook")
    expect(entry.slug).toBe("some-recipe")
    expect(entry.updatedAt).toBe(entry.startedAt)
    expect(entry.recipeName).toBeNull()
    expect(entry.finishedAt).toBeNull()
    expect(entry.durationMs).toBeNull()
    expect(entry.id).toBeTruthy()

    handle.complete("processed", ["Set calories: 100 kcal/serving"])
  })

  it("setRecipe fills name and householdId", () => {
    const handle = recordStart({ trigger: "estimate", slug: "some-recipe" })
    handle.setRecipe("Some Recipe", "household-1")

    const [entry] = getHistory()
    expect(entry.recipeName).toBe("Some Recipe")
    expect(entry.householdId).toBe("household-1")
    expect(entry.status).toBe("running")

    handle.complete("skipped", ["Ingredients unchanged, tags already applied"])
  })

  it("complete finalizes status, changes and duration", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"))

    const handle = recordStart({ trigger: "backfill", slug: "some-recipe" })
    vi.setSystemTime(new Date("2026-01-01T10:00:02.500Z"))
    handle.complete("processed", ["Set calories: 450 kcal/serving"])

    const [entry] = getHistory()
    expect(entry.status).toBe("processed")
    expect(entry.changes).toEqual(["Set calories: 450 kcal/serving"])
    expect(entry.durationMs).toBe(2500)
    expect(entry.updatedAt).toBe(Date.parse("2026-01-01T10:00:02.500Z"))
    expect(entry.finishedAt).toBe(Date.parse("2026-01-01T10:00:02.500Z"))

    vi.useRealTimers()
  })

  it("stores estimate details on complete", () => {
    const handle = recordStart({ trigger: "estimate", slug: "some-recipe" })
    const nutrients = {
      kcalPer100g: 450,
      proteinPer100g: 20,
      carbsPer100g: 40,
      fatPer100g: 15,
      saturatedFatPer100g: 6,
      transFatPer100g: 0,
      unsaturatedFatPer100g: 9,
      fiberPer100g: 3,
      sugarPer100g: 5,
      sodiumPer100g: 300,
      cholesterolPer100g: 40,
    }
    handle.complete("processed", ["Set calories: 450 kcal/serving"], {
      nutrients,
      matchedCount: 5,
      unmatchedCount: 1,
    })

    const [entry] = getHistory()
    expect(entry.estimate).toEqual({
      nutrients,
      matchedCount: 5,
      unmatchedCount: 1,
    })
  })

  it("leaves estimate null when none is provided", () => {
    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })
    handle.complete("skipped", ["Already up to date"])

    expect(getHistory()[0].estimate).toBeNull()
  })

  it("fail captures the error message", () => {
    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })
    handle.fail(new Error("Mealie API request timed out"))

    const [entry] = getHistory()
    expect(entry.status).toBe("error")
    expect(entry.error).toBe("Mealie API request timed out")
    expect(entry.changes).toEqual([])
    expect(entry.finishedAt).not.toBeNull()
  })

  it("truncates long error messages", () => {
    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })
    handle.fail(new Error("x".repeat(1000)))

    const [entry] = getHistory()
    expect(entry.error).toHaveLength(300)
  })

  it("ignores mutations after finish", () => {
    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })
    handle.complete("processed", ["Set calories: 100 kcal/serving"])
    handle.complete("error", ["should be ignored"])
    handle.setRecipe("too late", null)
    handle.fail(new Error("too late"))

    const [entry] = getHistory()
    expect(entry.status).toBe("processed")
    expect(entry.changes).toEqual(["Set calories: 100 kcal/serving"])
    expect(entry.recipeName).toBeNull()
    expect(entry.error).toBeNull()
  })

  it("returns entries newest first", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"))
    const first = recordStart({ trigger: "webhook", slug: "first" })
    first.complete("processed", [])

    vi.setSystemTime(new Date("2026-01-01T11:00:00.000Z"))
    const second = recordStart({ trigger: "estimate", slug: "second" })
    second.complete("processed", [])

    expect(getHistory().map((e) => e.slug)).toEqual(["second", "first"])

    vi.useRealTimers()
  })

  it("evicts the oldest entries beyond max capacity", () => {
    for (let i = 0; i < 205; i++) {
      const handle = recordStart({ trigger: "webhook", slug: `recipe-${i}` })
      handle.complete("processed", [])
    }

    const history = getHistory()
    expect(history.length).toBe(200)
    expect(history.some((e) => e.slug === "recipe-0")).toBe(false)
    expect(history.some((e) => e.slug === "recipe-204")).toBe(true)
  })

  it("notifies listeners on change and supports unsubscribe", () => {
    const listener = vi.fn()
    const unsubscribe = onChange(listener)

    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })
    expect(listener).toHaveBeenCalledTimes(1)

    handle.complete("processed", [])
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    handle.fail(new Error("nope"))
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("survives a throwing listener", () => {
    const unsubscribe = onChange(() => {
      throw new Error("boom")
    })

    expect(() => recordStart({ trigger: "webhook", slug: "some-recipe" })).not.toThrow()
    unsubscribe()
  })

  it("clearHistory empties the store", () => {
    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })
    handle.complete("processed", [])

    clearHistory()
    expect(getHistory()).toEqual([])
  })
})
