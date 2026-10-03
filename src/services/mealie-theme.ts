import { config } from "../config.js"
import { logger } from "../utils/logger.js"

export interface MealieThemeColors {
  primary: string
  accent: string
  secondary: string
  success: string
  info: string
  warning: string
  error: string
}

export interface MealieTheme {
  light: MealieThemeColors
  dark: MealieThemeColors
}

const DEFAULT_COLORS: MealieThemeColors = {
  primary: "#D65108",
  accent: "#007A99",
  secondary: "#973542",
  success: "#28A745",
  info: "#1976D2",
  warning: "#FF6D00",
  error: "#EF5350",
}

export const DEFAULT_THEME: MealieTheme = {
  light: { ...DEFAULT_COLORS },
  dark: { ...DEFAULT_COLORS },
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000
const FALLBACK_TTL_MS = 30 * 1000
let cached: { theme: MealieTheme; expiresAt: number } | null = null

function asColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!trimmed.startsWith("#")) return fallback

  const digits = trimmed.slice(1)
  if (digits.length !== 3 && digits.length !== 6) return fallback

  for (const digit of digits) {
    const code = digit.toLowerCase().charCodeAt(0)
    const isDigit = code >= 48 && code <= 57
    const isLowerHex = code >= 97 && code <= 102
    if (!isDigit && !isLowerHex) return fallback
  }

  return trimmed
}

function normalizeColors(
  raw: Record<string, unknown>,
  mode: "light" | "dark",
): MealieThemeColors {
  const prefix = mode === "light" ? "light" : "dark"
  return {
    primary: asColor(raw[`${prefix}Primary`], DEFAULT_COLORS.primary),
    accent: asColor(raw[`${prefix}Accent`], DEFAULT_COLORS.accent),
    secondary: asColor(raw[`${prefix}Secondary`], DEFAULT_COLORS.secondary),
    success: asColor(raw[`${prefix}Success`], DEFAULT_COLORS.success),
    info: asColor(raw[`${prefix}Info`], DEFAULT_COLORS.info),
    warning: asColor(raw[`${prefix}Warning`], DEFAULT_COLORS.warning),
    error: asColor(raw[`${prefix}Error`], DEFAULT_COLORS.error),
  }
}

export async function fetchMealieTheme(): Promise<MealieTheme> {
  const base = config.mealie.url.replace(/\/+$/, "")
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.mealie.timeoutMs)

  try {
    const res = await fetch(`${base}/api/app/about/theme`, {
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Mealie theme endpoint returned ${res.status}`)
    }
    const raw = (await res.json()) as Record<string, unknown>
    return {
      light: normalizeColors(raw, "light"),
      dark: normalizeColors(raw, "dark"),
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function getMealieTheme(): Promise<MealieTheme> {
  if (cached && Date.now() < cached.expiresAt) return cached.theme

  try {
    const theme = await fetchMealieTheme()
    cached = { theme, expiresAt: Date.now() + CACHE_TTL_MS }
    return theme
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "Could not load Mealie theme, using default colors",
    )
    cached = { theme: DEFAULT_THEME, expiresAt: Date.now() + FALLBACK_TTL_MS }
    return DEFAULT_THEME
  }
}

export function clearThemeCache(): void {
  cached = null
}
