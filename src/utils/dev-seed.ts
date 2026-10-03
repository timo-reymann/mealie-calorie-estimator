import { config } from "../config.js"
import {
  getHistory,
  seedRecord,
  type ExecutionRecord,
  type ExecutionStatus,
  type ExecutionTrigger,
} from "./execution-history.js"
import type { NutrientSet } from "../types.js"

const RECIPES: Array<[string, string]> = [
  ["creamy-tomato-soup", "Creamy Tomato Soup"],
  ["spaghetti-bolognese", "Spaghetti Bolognese"],
  ["haehnchen-curry", "Hähnchen-Curry mit Reis"],
  ["grandmas-potato-salad", "Grandma's Potato Salad"],
  ["chocolate-chip-cookies", "Chocolate Chip Cookies"],
  ["lentil-stew", "Lentil Stew"],
  ["greek-salad", "Greek Salad"],
  ["beef-stir-fry", "Beef Stir Fry"],
  ["blueberry-pancakes", "Blueberry Pancakes"],
  ["pesto-pasta", "Pesto Pasta"],
  ["vegetarian-chili", "Vegetarian Chili"],
  ["caesar-salad", "Caesar Salad"],
  ["banana-bread", "Banana Bread"],
  ["mushroom-risotto", "Mushroom Risotto"],
  ["fish-tacos", "Fish Tacos"],
  ["apple-crumble", "Apple Crumble"],
  ["shakshuka", "Shakshuka"],
  ["ramen-broth", "Homemade Ramen Broth"],
  ["couscous-salad", "Couscous Salad"],
  ["chicken-noodle-soup", "Chicken Noodle Soup"],
  ["pad-thai", "Pad Thai"],
  ["schnitzel", "Wiener Schnitzel"],
  ["quinoa-bowl", "Quinoa Power Bowl"],
  ["tiramisu", "Tiramisu"],
  ["roasted-vegetables", "Roasted Vegetables"],
]

const CALORIE_TAGS = ["calories-light", "calories-moderate", "calories-hearty", "calories-heavy"]
const DIGEST_TAGS = ["digest-easy", "digest-moderate", "digest-slow"]

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a += 0x6d2b79f5
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeNutrients(kcal: number, rand: () => number): NutrientSet {
  const int = (min: number, max: number): number =>
    Math.floor(rand() * (max - min + 1)) + min
  const round1 = (v: number): number => Math.round(v * 10) / 10
  const fat = int(3, 45)

  return {
    kcalPer100g: kcal,
    proteinPer100g: int(5, 45),
    carbsPer100g: int(10, 90),
    fatPer100g: fat,
    saturatedFatPer100g: round1(fat * 0.4),
    transFatPer100g: 0,
    unsaturatedFatPer100g: round1(fat * 0.6),
    fiberPer100g: int(1, 8),
    sugarPer100g: int(2, 25),
    sodiumPer100g: int(100, 900),
    cholesterolPer100g: int(0, 80),
  }
}

export function seedDevHistory(): void {
  if (!config.history.seedDevData) return
  if (getHistory().length > 0) return

  const rand = mulberry32(42)
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
  const int = (min: number, max: number): number =>
    Math.floor(rand() * (max - min + 1)) + min

  const now = Date.now()
  const twoHoursAgo = now - 2 * 60 * 60 * 1000

  const statusPlan: ExecutionStatus[] = [
    ...new Array<ExecutionStatus>(18).fill("processed"),
    ...new Array<ExecutionStatus>(3).fill("tags-added"),
    ...new Array<ExecutionStatus>(2).fill("skipped"),
    "manual",
    "filtered",
    "error",
    "running",
    "running",
  ]

  const triggerPlan: ExecutionTrigger[] = [
    ...new Array<ExecutionTrigger>(15).fill("webhook"),
    ...new Array<ExecutionTrigger>(5).fill("estimate"),
    ...new Array<ExecutionTrigger>(6).fill("backfill"),
  ]

  for (let i = 0; i < statusPlan.length; i++) {
    const status = statusPlan[i]
    const trigger = triggerPlan[i % triggerPlan.length]
    const [slug, name] = RECIPES[i % RECIPES.length]
    const startedAt =
      i === statusPlan.length - 1
        ? now - int(1000, 8000)
        : twoHoursAgo + Math.floor(((now - twoHoursAgo) * i) / statusPlan.length)

    const kcal = int(180, 940)
    const calorieTag = pick(CALORIE_TAGS)
    const digestTag = pick(DIGEST_TAGS)

    const record: ExecutionRecord = {
      id: crypto.randomUUID(),
      startedAt,
      updatedAt: startedAt,
      finishedAt: null,
      durationMs: null,
      trigger,
      slug,
      recipeName: name,
      householdId: null,
      status,
      changes: [],
      estimate: null,
      error: null,
    }

    switch (status) {
      case "processed":
        record.finishedAt = startedAt + int(900, 12000)
        record.changes = [
          `Set calories: ${kcal} kcal/serving`,
          `Auto-tags: ${calorieTag}, ${digestTag}`,
        ]
        record.estimate = {
          nutrients: makeNutrients(kcal, rand),
          matchedCount: int(4, 16),
          unmatchedCount: int(0, 3),
        }
        break
      case "tags-added":
        record.finishedAt = startedAt + int(200, 900)
        record.changes = [`Added auto-tags: ${calorieTag}, ${digestTag}`]
        break
      case "skipped":
        record.finishedAt = startedAt + int(40, 300)
        record.changes = ["Ingredients unchanged, tags already applied"]
        break
      case "manual":
        record.finishedAt = startedAt + int(300, 1200)
        record.changes = [`Preserved manual calories: ${kcal} kcal`]
        break
      case "filtered":
        record.finishedAt = startedAt + int(40, 300)
        record.changes = ["Recipe not tagged for estimation"]
        break
      case "error":
        record.finishedAt = startedAt + int(1000, 30000)
        record.error = "Mealie API request timed out: PATCH http://mealie:9000/api/recipes"
        break
      case "running":
        break
    }

    if (record.finishedAt !== null) {
      record.durationMs = record.finishedAt - record.startedAt
      record.updatedAt = record.finishedAt
    }

    seedRecord(record)
  }
}
