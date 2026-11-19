import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import initSqlJs from "sql.js"
import fs from "node:fs"

const TEST_DB = "data/test-cache-migration.db"

async function writeLegacyDb(): Promise<void> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.run("CREATE TABLE nutrient_cache (food_name TEXT PRIMARY KEY, nutrients TEXT NOT NULL, updated_at INTEGER NOT NULL)")
  db.run("CREATE TABLE llm_nutrient_cache (food_name TEXT PRIMARY KEY, nutrients TEXT NOT NULL, updated_at INTEGER NOT NULL)")
  db.run("CREATE TABLE llm_estimate_cache (lookup_key TEXT PRIMARY KEY, grams REAL NOT NULL, updated_at INTEGER NOT NULL)")
  const now = Date.now()
  db.run("INSERT INTO nutrient_cache VALUES (?, ?, ?)", ["feta", JSON.stringify({ kcalPer100g: 257, sodiumPer100g: 1.1 }), now])
  db.run("INSERT INTO llm_nutrient_cache VALUES (?, ?, ?)", ["dille", JSON.stringify({ kcalPer100g: 43, sodiumPer100g: 61 }), now])
  db.run("INSERT INTO llm_estimate_cache VALUES (?, ?, ?)", ["stuk|rode ui", 150, now])
  fs.mkdirSync("data", { recursive: true })
  fs.writeFileSync(TEST_DB, Buffer.from(db.export()))
  db.close()
}

describe("cache schema migration", () => {
  beforeAll(async () => {
    await writeLegacyDb()
    vi.resetModules()
    process.env.CACHE_DB_PATH = TEST_DB
  })

  afterAll(() => {
    process.env.CACHE_DB_PATH = "data/test-cache.db"
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
  })

  it("drops nutrient entries cached with sodium in grams but keeps gram estimates", async () => {
    const cache = await import("../src/utils/cache.js")
    await cache.initCache()

    expect(cache.getCachedNutrients("feta")).toBeUndefined()
    expect(cache.getCachedLlmNutrients("dille")).toBeUndefined()
    expect(cache.getCachedLlmEstimate("stuk", "rode ui")).toBe(150)
  })
})
