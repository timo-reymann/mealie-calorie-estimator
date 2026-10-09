import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { estimateGrams } from "../src/services/llm-estimator.js"
import { initCache, clearLlmCache } from "../src/utils/cache.js"
import { config } from "../src/config.js"

beforeAll(async () => {
  await initCache()
})

beforeEach(() => {
  config.llm.enabled = false
  config.llm.apiKey = ""
  clearLlmCache()
  vi.restoreAllMocks()
})

describe("estimateGrams", () => {
  it("returns null when LLM is disabled", async () => {
    const result = await estimateGrams(2, "Dose", "Tomaten")
    expect(result).toBeNull()
  })

  it("returns null when API key is not set", async () => {
    config.llm.enabled = true
    const result = await estimateGrams(1, "Glas", "Honig")
    expect(result).toBeNull()
  })

  it("returns grams from API and multiplies by quantity", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "400" } }],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await estimateGrams(2, "Dose", "Tomaten")
    expect(result).toBe(800)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callArgs.messages[0].content).toContain("Dose")
    expect(callArgs.messages[0].content).toContain("Tomaten")
  })

  it("returns cached value without calling API", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "250" } }],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    await estimateGrams(1, "Glas", "Gurken")
    const result = await estimateGrams(3, "Glas", "Gurken")
    expect(result).toBe(750)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("returns null on API error", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await estimateGrams(1, "Päckchen", "Hefe")
    expect(result).toBeNull()
  })

  it("returns null on invalid response (non-numeric)", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "unknown" } }],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await estimateGrams(1, "Bund", "Petersilie")
    expect(result).toBeNull()
  })

  it("returns null on zero response", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "0" } }],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await estimateGrams(1, "Stange", "Lauch")
    expect(result).toBeNull()
  })
})

describe("estimateGrams timeout", () => {
  it("passes an abort signal to the request", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "100" } }],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    await estimateGrams(1, "Dose", "Mais")

    expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it("returns null when the request times out", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"
    const originalTimeout = config.llm.timeoutMs
    config.llm.timeoutMs = 10

    const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason))
      }),
    )
    vi.stubGlobal("fetch", mockFetch)

    try {
      const result = await estimateGrams(1, "Glas", "Gurken")
      expect(result).toBeNull()
    } finally {
      config.llm.timeoutMs = originalTimeout
    }
  })
})

describe("estimateGrams recipe note", () => {
  function stubGrams(grams: string) {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: grams } }] }),
    })
    vi.stubGlobal("fetch", mockFetch)
    return mockFetch
  }

  it("passes the note to the LLM", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"
    const mockFetch = stubGrams("120")

    await estimateGrams(1, "Stück", "Süsskartoffel", "klein")

    const prompt = JSON.parse(mockFetch.mock.calls[0][1].body).messages[0].content
    expect(prompt).toContain("Süsskartoffel")
    expect(prompt).toContain('"klein"')
  })

  it("does not reuse a cached estimate for a different note", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"
    const mockFetch = stubGrams("150")

    await estimateGrams(1, "Stück", "Zwiebel", "klein")
    await estimateGrams(1, "Stück", "Zwiebel", "gross")
    await estimateGrams(1, "Stück", "Zwiebel", "klein")

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("keeps the prompt unchanged without a note", async () => {
    config.llm.enabled = true
    config.llm.apiKey = "sk-test"
    const mockFetch = stubGrams("80")

    await estimateGrams(1, "Stück", "Karotte")

    const prompt = JSON.parse(mockFetch.mock.calls[0][1].body).messages[0].content
    expect(prompt).not.toContain("recipe adds")
  })
})
