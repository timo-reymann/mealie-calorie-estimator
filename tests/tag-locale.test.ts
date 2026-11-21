import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { MealieRecipe, MealieTag, NutrientSet } from "../src/types.js"

vi.mock("../src/services/mealie-client.js", () => ({
  patchRecipe: vi.fn(async () => {}),
  getOrCreateTags: vi.fn(async (names: string[]) => names.map((name) => ({ id: name, name, slug: name }))),
}))

const { getOrCreateTags } = await import("../src/services/mealie-client.js")

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

function makeRecipe(tags: MealieTag[], extras: Record<string, string>): MealieRecipe {
  return {
    slug: "test",
    name: "Test",
    recipeYield: null,
    recipeYieldQuantity: null,
    recipeServings: null,
    recipeIngredient: [],
    nutrition: null,
    tags,
    extras,
    householdId: null,
  }
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("localizeTag", () => {
  it("passes through unknown keys, including inherited properties", async () => {
    const { localizeTag } = await import("../src/services/tag-locale.js")
    expect(localizeTag("constructor", "en")).toBe("constructor")
    expect(localizeTag("constructor", "de")).toBe("constructor")
  })

  it("translates known keys", async () => {
    const { localizeTag } = await import("../src/services/tag-locale.js")
    expect(localizeTag("Calories:Light", "de")).toBe("Kalorien:Leicht")
    expect(localizeTag("Calories:Light", "en")).toBe("Calories:Light")
  })
})

describe("resolveTagLocale", () => {
  it("defaults to en", async () => {
    const { resolveTagLocale } = await import("../src/services/tag-locale.js")
    expect(resolveTagLocale(undefined)).toBe("en")
  })

  it("accepts de", async () => {
    const { resolveTagLocale } = await import("../src/services/tag-locale.js")
    expect(resolveTagLocale("de")).toBe("de")
  })

  it("normalizes case and whitespace", async () => {
    const { resolveTagLocale } = await import("../src/services/tag-locale.js")
    expect(resolveTagLocale("  DE ")).toBe("de")
  })

  it("falls back to en for unsupported locales", async () => {
    const { resolveTagLocale } = await import("../src/services/tag-locale.js")
    expect(resolveTagLocale("fr")).toBe("en")
  })
})

describe("computeTags with TAG_LOCALE=de", () => {
  beforeEach(() => {
    process.env.TAG_LOCALE = "de"
  })

  it("localizes calorie and digest tags", async () => {
    const { computeTags } = await import("../src/services/tagging.js")
    expect(computeTags(n(400, { fatPer100g: 10 }))).toEqual(["Kalorien:Mittel", "Verdauung:Leicht"])
  })

  it("localizes unknown digest tag", async () => {
    const { computeTags } = await import("../src/services/tagging.js")
    expect(computeTags(n(0, { kcalPer100g: null, fatPer100g: null }))).toEqual(["Verdauung:Unbekannt"])
  })
})

describe("tagsAreComplete locale gate with TAG_LOCALE=de", () => {
  beforeEach(() => {
    process.env.TAG_LOCALE = "de"
  })

  it("treats tags applied in another locale as incomplete", async () => {
    const { tagsAreComplete } = await import("../src/services/tagging.js")
    const recipe = makeRecipe(
      [tag("Calories:Moderate", "calories-moderate"), tag("Digest:Easy", "digest-easy")],
      {
        calorie_estimator_tags: JSON.stringify(["calories-moderate", "digest-easy"]),
        calorie_estimator_tag_locale: "en",
      },
    )
    expect(tagsAreComplete(recipe)).toBe(false)
  })

  it("treats legacy tags without locale as English", async () => {
    const { tagsAreComplete } = await import("../src/services/tagging.js")
    const recipe = makeRecipe(
      [tag("Calories:Moderate", "calories-moderate")],
      { calorie_estimator_tags: JSON.stringify(["calories-moderate"]) },
    )
    expect(tagsAreComplete(recipe)).toBe(false)
  })
})

describe("resolveAndMergeTags locale migration with TAG_LOCALE=de", () => {
  beforeEach(() => {
    process.env.TAG_LOCALE = "de"
  })

  it("replaces English auto tags with German ones and keeps user tags", async () => {
    const { resolveAndMergeTags } = await import("../src/services/tagging.js")
    const recipe = makeRecipe(
      [
        tag("Calories:Moderate", "calories-moderate"),
        tag("Digest:Easy", "digest-easy"),
        tag("UserTag", "usertag"),
      ],
      {
        calorie_estimator_tags: JSON.stringify(["calories-moderate", "digest-easy"]),
        calorie_estimator_tag_locale: "en",
      },
    )

    const { tags, tagSlugs } = await resolveAndMergeTags(recipe, n(400, { fatPer100g: 10 }), null)

    const slugs = tags.map(t => t.slug)
    expect(slugs).toContain("usertag")
    expect(slugs).toContain("Kalorien:Mittel")
    expect(slugs).toContain("Verdauung:Leicht")
    expect(slugs).not.toContain("calories-moderate")
    expect(slugs).not.toContain("digest-easy")
    expect(tagSlugs).toEqual(["Kalorien:Mittel", "Verdauung:Leicht"])
    expect(vi.mocked(getOrCreateTags)).toHaveBeenCalledWith(["Kalorien:Mittel", "Verdauung:Leicht"], null)
  })
})

describe("tagsAreComplete locale gate with default en", () => {
  beforeEach(() => {
    delete process.env.TAG_LOCALE
  })

  it("accepts legacy tags without stored locale", async () => {
    const { tagsAreComplete } = await import("../src/services/tagging.js")
    const recipe = makeRecipe(
      [tag("Calories:Light", "calories-light"), tag("Digest:Easy", "digest-easy")],
      { calorie_estimator_tags: JSON.stringify(["calories-light", "digest-easy"]) },
    )
    expect(tagsAreComplete(recipe)).toBe(true)
  })

  it("rejects tags applied in another locale", async () => {
    const { tagsAreComplete } = await import("../src/services/tagging.js")
    const recipe = makeRecipe(
      [tag("Kalorien:Leicht", "kalorien-leicht")],
      { calorie_estimator_tags: JSON.stringify(["kalorien-leicht"]), calorie_estimator_tag_locale: "de" },
    )
    expect(tagsAreComplete(recipe)).toBe(false)
  })
})
