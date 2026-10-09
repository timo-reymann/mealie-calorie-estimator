const ENTRY = /\[\s*([^\]=\n]+?)\s*=\s*(\d+(?:[.,]\d+)?)\s*(kg|gramm|gr|g)?\s*\]/gi

const UNIT_ALIASES: Record<string, string> = { stueck: "stuck", stk: "stuck", piece: "stuck", pieces: "stuck" }

function normalizeUnit(name: string): string {
  const base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "")
  return UNIT_ALIASES[base] ?? base
}

export function gramsPerUnitFromDescription(description: string | null | undefined, unitName: string | null | undefined): number | null {
  if (!description || !unitName) return null
  const wanted = normalizeUnit(unitName)
  if (!wanted) return null
  for (const match of description.matchAll(ENTRY)) {
    if (normalizeUnit(match[1]) !== wanted) continue
    const value = Number.parseFloat(match[2].replace(",", "."))
    if (!(value > 0)) continue
    return match[3]?.toLowerCase() === "kg" ? value * 1000 : value
  }
  return null
}
