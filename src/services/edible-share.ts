const PERCENT_MARKER = /\[\s*(\d+(?:[.,]\d+)?)\s*%\s*\]/
const PERCENT_MARKER_ALL = new RegExp(PERCENT_MARKER.source, "g")
const SKIP_MARKER = /nicht\s+mitrechnen/i
const SKIP_MARKER_ALL = new RegExp(SKIP_MARKER.source, "gi")
const MAX_HINT_LENGTH = 80

export function parseEdiblePercent(note: string | null | undefined): number | null {
  if (!note) return null
  const percent = PERCENT_MARKER.exec(note)
  if (percent) {
    const value = Number.parseFloat(percent[1].replace(",", "."))
    return Math.min(100, Math.max(0, value))
  }
  return SKIP_MARKER.test(note) ? 0 : null
}

export function ingredientNoteHint(note: string | null | undefined): string | null {
  if (!note) return null
  const text = note.replace(PERCENT_MARKER_ALL, " ").replace(SKIP_MARKER_ALL, " ").replace(/\s+/g, " ").trim()
  return text ? text.slice(0, MAX_HINT_LENGTH) : null
}
