import initSqlJs, { type Database } from "sql.js"
import fs from "node:fs"
import path from "node:path"
import { config } from "../config.js"
import type { NutrientSet } from "../types.js"
import { logger } from "./logger.js"

let db: Database
let saveTimer: ReturnType<typeof setTimeout> | null = null
let isInitialized = false

function scheduleSave(): void {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    try {
      const data = db.export()
      const dir = path.dirname(config.cache.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(config.cache.dbPath, Buffer.from(data))
    } catch (err) {
      logger.error({ err }, "Failed to save cache database")
    }
    saveTimer = null
  }, 5000)
}

export async function initCache(): Promise<void> {
  if (isInitialized) return

  const dbPath = config.cache.dbPath
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`CREATE TABLE IF NOT EXISTS nutrient_cache (
    food_name TEXT PRIMARY KEY,
    nutrients TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS unmatched_foods (
    food_name TEXT PRIMARY KEY,
    updated_at INTEGER NOT NULL
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS llm_estimate_cache (
    lookup_key TEXT PRIMARY KEY,
    grams REAL NOT NULL,
    updated_at INTEGER NOT NULL
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS llm_nutrient_cache (
    food_name TEXT PRIMARY KEY,
    nutrients TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`)

  const cutoff = Date.now() - config.openFoodFacts.cacheTtlMs
  db.run("DELETE FROM nutrient_cache WHERE updated_at < ?", [cutoff])
  db.run("DELETE FROM llm_estimate_cache WHERE updated_at < ?", [cutoff])
  db.run("DELETE FROM llm_nutrient_cache WHERE updated_at < ?", [cutoff])

  scheduleSave()
  isInitialized = true
}

function normalizeKey(key: string): string {
  return key.toLowerCase().trim()
}

function isExpired(updatedAt: number): boolean {
  return Date.now() - updatedAt > config.openFoodFacts.cacheTtlMs
}

function getRow<T>(table: string, keyCol: string, key: string, valCol: string): T | undefined {
  const stmt = db.prepare(`SELECT ${valCol}, updated_at FROM ${table} WHERE ${keyCol} = ?`)
  stmt.bind([key])
  try {
    if (stmt.step()) {
      const row = stmt.getAsObject() as { updated_at: number; [key: string]: unknown }
      const raw = row[valCol]
      if (isExpired(row.updated_at)) {
        db.run(`DELETE FROM ${table} WHERE ${keyCol} = ?`, [key])
        scheduleSave()
        return undefined
      }
      return raw as T
    }
    return undefined
  } finally {
    stmt.free()
  }
}

function upsert(table: string, keyCol: string, key: string, valCol: string, val: string): void {
  const now = Date.now()
  db.run(
    `INSERT INTO ${table} (${keyCol}, ${valCol}, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(${keyCol}) DO UPDATE SET ${valCol} = excluded.${valCol}, updated_at = excluded.updated_at`,
    [key, val, now],
  )
  scheduleSave()
}

export function getCachedNutrients(foodName: string): NutrientSet | undefined {
  const key = normalizeKey(foodName)
  const raw = getRow<string>("nutrient_cache", "food_name", key, "nutrients")
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw) as NutrientSet
  } catch {
    return undefined
  }
}

export function setCachedNutrients(foodName: string, nutrients: NutrientSet): void {
  const key = normalizeKey(foodName)
  upsert("nutrient_cache", "food_name", key, "nutrients", JSON.stringify(nutrients))
}

export function isUnmatchedFood(foodName: string): boolean {
  const key = normalizeKey(foodName)
  return getRow<string>("unmatched_foods", "food_name", key, "food_name") !== undefined
}

export function markUnmatchedFood(foodName: string): void {
  const key = normalizeKey(foodName)
  const now = Date.now()
  db.run(
    `INSERT OR IGNORE INTO unmatched_foods (food_name, updated_at) VALUES (?, ?)`,
    [key, now],
  )
  scheduleSave()
}

export function getCachedLlmEstimate(unitName: string, foodName: string): number | undefined {
  const key = `${unitName.toLowerCase().trim()}|${foodName.toLowerCase().trim()}`
  return getRow<number>("llm_estimate_cache", "lookup_key", key, "grams")
}

export function setCachedLlmEstimate(unitName: string, foodName: string, grams: number): void {
  const key = `${unitName.toLowerCase().trim()}|${foodName.toLowerCase().trim()}`
  const now = Date.now()
  db.run(
    `INSERT INTO llm_estimate_cache (lookup_key, grams, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(lookup_key) DO UPDATE SET grams = excluded.grams, updated_at = excluded.updated_at`,
    [key, grams, now],
  )
  scheduleSave()
}

export function clearLlmCache(): void {
  db.run("DELETE FROM llm_estimate_cache")
  db.run("DELETE FROM llm_nutrient_cache")
  scheduleSave()
}

export function getCachedLlmNutrients(foodName: string): NutrientSet | undefined {
  const key = normalizeKey(foodName)
  const raw = getRow<string>("llm_nutrient_cache", "food_name", key, "nutrients")
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw) as NutrientSet
  } catch {
    return undefined
  }
}

export function setCachedLlmNutrients(foodName: string, nutrients: NutrientSet): void {
  const key = normalizeKey(foodName)
  upsert("llm_nutrient_cache", "food_name", key, "nutrients", JSON.stringify(nutrients))
}

export function getCacheStats(): { size: number; maxSize: number } {
  const stmt = db.prepare("SELECT COUNT(*) as cnt FROM nutrient_cache")
  stmt.bind([])
  let size = 0
  try {
    if (stmt.step()) {
      const row = stmt.getAsObject() as { cnt: number }
      size = row.cnt
    }
  } finally {
    stmt.free()
  }
  return { size, maxSize: 0 }
}
