import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getMealieTheme,
  fetchMealieTheme,
  clearThemeCache,
  DEFAULT_THEME,
} from "../src/services/mealie-theme.js"

beforeEach(() => {
  clearThemeCache()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function themeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("mealie-theme", () => {
  it("parses light and dark colors from the theme endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        themeResponse({
          lightPrimary: "#111111",
          lightAccent: "#222222",
          lightSecondary: "#333333",
          lightSuccess: "#444444",
          lightInfo: "#555555",
          lightWarning: "#666666",
          lightError: "#777777",
          darkPrimary: "#aaaaaa",
          darkAccent: "#bbbbbb",
          darkSecondary: "#cccccc",
          darkSuccess: "#dddddd",
          darkInfo: "#eeeeee",
          darkWarning: "#ffffff",
          darkError: "#000000",
        }),
      ),
    )

    const theme = await fetchMealieTheme()

    expect(theme.light).toEqual({
      primary: "#111111",
      accent: "#222222",
      secondary: "#333333",
      success: "#444444",
      info: "#555555",
      warning: "#666666",
      error: "#777777",
    })
    expect(theme.dark.primary).toBe("#aaaaaa")
    expect(theme.dark.error).toBe("#000000")
  })

  it("falls back to defaults for missing or invalid colors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        themeResponse({ lightPrimary: "not-a-color", darkPrimary: "#000" }),
      ),
    )

    const theme = await fetchMealieTheme()

    expect(theme.light.primary).toBe(DEFAULT_THEME.light.primary)
    expect(theme.light.success).toBe(DEFAULT_THEME.light.success)
    expect(theme.dark.primary).toBe("#000")
  })

  it("falls back to the default theme when the endpoint fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED")
      }),
    )

    const theme = await getMealieTheme()

    expect(theme).toEqual(DEFAULT_THEME)
  })

  it("falls back to the default theme on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => themeResponse({}, 500)))

    const theme = await getMealieTheme()

    expect(theme).toEqual(DEFAULT_THEME)
  })

  it("caches the theme between calls", async () => {
    const fetchMock = vi.fn(async () => themeResponse({ lightPrimary: "#123456" }))
    vi.stubGlobal("fetch", fetchMock)

    await getMealieTheme()
    await getMealieTheme()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("refetches after the cache is cleared", async () => {
    const fetchMock = vi.fn(async () => themeResponse({ lightPrimary: "#123456" }))
    vi.stubGlobal("fetch", fetchMock)

    await getMealieTheme()
    clearThemeCache()
    await getMealieTheme()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
