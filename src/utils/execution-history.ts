import { LRUCache } from "lru-cache"
import { config } from "../config.js"
import { logger } from "./logger.js"
import type { NutrientSet } from "../types.js"

export type ExecutionTrigger = "webhook" | "estimate" | "backfill"

export type ExecutionStatus =
  | "running"
  | "processed"
  | "tags-added"
  | "manual"
  | "skipped"
  | "filtered"
  | "error"

export interface ExecutionEstimate {
  nutrients: NutrientSet
  matchedCount: number
  unmatchedCount: number
}

export interface ExecutionRecord {
  id: string
  startedAt: number
  finishedAt: number | null
  durationMs: number | null
  trigger: ExecutionTrigger
  slug: string
  recipeName: string | null
  householdId: string | null
  status: ExecutionStatus
  changes: string[]
  estimate: ExecutionEstimate | null
  error: string | null
}

export interface ExecutionHandle {
  setRecipe(name: string, householdId: string | null): void
  complete(
    status: ExecutionStatus,
    changes: string[],
    estimate?: ExecutionEstimate,
  ): void
  fail(err: unknown): void
}

type ChangeListener = () => void

const MAX_ERROR_LENGTH = 300

const store = new LRUCache<string, ExecutionRecord>({
  max: config.history.maxEntries,
  ttl: 1000 * 60 * 60 * 24,
})

const listeners = new Set<ChangeListener>()

function notify(): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch (err) {
      logger.error({ err }, "Execution history listener failed")
    }
  }
}

function update(id: string, mutate: (record: ExecutionRecord) => void): void {
  const record = store.get(id)
  if (!record) return
  mutate(record)
  store.set(id, record)
  notify()
}

function truncateError(err: unknown): string {
  let message: string

  if (err instanceof Error) {
    message = err.message
    if (message === "") {
      const code = (err as NodeJS.ErrnoException).code
      message = code || err.name || "Unknown error"
    }
  } else if (typeof err === "string") {
    message = err
  } else {
    message = JSON.stringify(err) ?? String(err)
  }

  return message.length > MAX_ERROR_LENGTH
    ? message.slice(0, MAX_ERROR_LENGTH)
    : message
}

export function recordStart(args: {
  trigger: ExecutionTrigger
  slug: string
}): ExecutionHandle {
  const id = crypto.randomUUID()
  const startedAt = Date.now()

  store.set(id, {
    id,
    startedAt,
    finishedAt: null,
    durationMs: null,
    trigger: args.trigger,
    slug: args.slug,
    recipeName: null,
    householdId: null,
    status: "running",
    changes: [],
    estimate: null,
    error: null,
  })
  notify()

  let finished = false

  return {
    setRecipe(name, householdId) {
      if (finished) return
      update(id, (record) => {
        record.recipeName = name
        record.householdId = householdId
      })
    },

    complete(status, changes, estimate) {
      if (finished) return
      finished = true
      update(id, (record) => {
        record.status = status
        record.changes = changes
        if (estimate) record.estimate = estimate
        record.finishedAt = Date.now()
        record.durationMs = record.finishedAt - record.startedAt
      })
    },

    fail(err) {
      if (finished) return
      finished = true
      update(id, (record) => {
        record.status = "error"
        record.error = truncateError(err)
        record.finishedAt = Date.now()
        record.durationMs = record.finishedAt - record.startedAt
      })
    },
  }
}

export function seedRecord(record: ExecutionRecord): void {
  store.set(record.id, record)
  notify()
}

export function getHistory(): ExecutionRecord[] {
  return [...store.values()].sort((a, b) => b.startedAt - a.startedAt)
}

export function onChange(listener: ChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function clearHistory(): void {
  store.clear()
  notify()
}
