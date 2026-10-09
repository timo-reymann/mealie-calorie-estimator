import type { MealieRecipe, RecipeNote } from "../types.js"
import { config } from "../config.js"
import { patchRecipe } from "./mealie-client.js"
import { parseEdiblePercent } from "./edible-share.js"
import { logger } from "../utils/logger.js"

export const PROGRESS_NOTE_TITLE = "Nutrition calculation progress"

const BAR_LENGTH = 10

export interface ProgressTracker {
  total: number
  done: number
  step(): void
}

export interface ProgressReporter {
  tracker: ProgressTracker | undefined
  stop(): Promise<void>
  abort(): Promise<void>
}

export function countLeafIngredients(recipe: MealieRecipe, stack: ReadonlySet<string> = new Set([recipe.slug])): number {
  let count = 0
  for (const ing of recipe.recipeIngredient) {
    const referenced = ing.referencedRecipe
    if (!referenced) {
      count++
      continue
    }
    const quantity = ing.quantity
    if (!referenced.slug || quantity == null || quantity <= 0 || stack.has(referenced.slug)) continue
    if (parseEdiblePercent(ing.note) === 0) continue
    count += countLeafIngredients(referenced, new Set([...stack, referenced.slug]))
  }
  return count
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes} Min ${seconds % 60} s` : `${seconds} s`
}

export function buildProgressNote(done: number, total: number, elapsedMs: number): RecipeNote {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  const filled = Math.round((percent / 100) * BAR_LENGTH)
  const bar = "█".repeat(filled) + "░".repeat(BAR_LENGTH - filled)
  return {
    title: PROGRESS_NOTE_TITLE,
    text: `Berechnung läuft …\n\n${bar} ${percent} % (${done} von ${total} Zutaten, ${formatElapsed(elapsedMs)})`,
  }
}

function withoutProgressNote(notes: RecipeNote[] | null | undefined): RecipeNote[] {
  return (notes ?? []).filter((note) => note.title !== PROGRESS_NOTE_TITLE)
}

const DEFAULT_INTERVAL_MS = 10_000
const MIN_INTERVAL_MS = 500

export function createProgressReporter(recipe: MealieRecipe, householdId?: string | null): ProgressReporter {
  if (!config.progress.enabled) {
    return { tracker: undefined, stop: async () => {}, abort: async () => {} }
  }

  const intervalMs = config.progress.intervalMs >= MIN_INTERVAL_MS ? config.progress.intervalMs : DEFAULT_INTERVAL_MS
  const startedAt = Date.now()
  let stopped = false
  let writing = false
  let written = false
  let inFlight: Promise<void> = Promise.resolve()

  const tracker: ProgressTracker = {
    total: countLeafIngredients(recipe),
    done: 0,
    step() {
      tracker.done++
    },
  }

  const write = () => {
    if (stopped || writing) return
    writing = true
    written = true
    const note = buildProgressNote(tracker.done, tracker.total, Date.now() - startedAt)
    logger.debug({ slug: recipe.slug, done: tracker.done, total: tracker.total }, "Writing progress note")
    inFlight = patchRecipe(recipe.slug, { notes: [...withoutProgressNote(recipe.notes), note] }, householdId)
      .catch((err) => logger.warn({ slug: recipe.slug, err }, "Could not write progress note"))
      .finally(() => { writing = false })
  }

  const timer = setInterval(write, intervalMs)
  ;(timer as { unref?: () => void }).unref?.()

  const stop = async () => {
    stopped = true
    clearInterval(timer)
    await inFlight
  }

  return {
    tracker,
    stop,
    async abort() {
      await stop()
      if (!written) return
      try {
        await patchRecipe(recipe.slug, { notes: withoutProgressNote(recipe.notes) }, householdId)
      } catch (err) {
        logger.warn({ slug: recipe.slug, err }, "Could not remove progress note")
      }
    },
  }
}
