import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { lookupNutrients } from "../src/services/off-client.js"
import { initCache } from "../src/utils/cache.js"
import { config } from "../src/config.js"

beforeAll(async () => {
  await initCache()
  config.openFoodFacts.retryBackoffMs = 1
})

beforeEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(hits: unknown[]): Response {
  return new Response(JSON.stringify({ hits }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function searchQueryOf(call: unknown[]): string | null {
  return new URL(String(call[0])).searchParams.get("q")
}

describe("lookupNutrients ranking", () => {
  it("does not prefer a product without a name over a named match", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([
        { product_name: "Würzsauce Soja", nutriments: { "energy-kcal_100g": 60 } },
        { nutriments: { "energy-kcal_100g": 999 } },
      ]),
    )

    const result = await lookupNutrients("Sojasauce Namenlos")

    expect(result.matched).toBe(true)
    expect(result.nutrients?.kcalPer100g).toBe(60)
  })

  it("adds frisch to the search for piece ingredients", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([{ product_name: "Zwiebel frisch", nutriments: { "energy-kcal_100g": 40 } }]),
    )

    await lookupNutrients("Zwiebel", "Stück")

    expect(searchQueryOf(fetchMock.mock.calls[0])).toBe("Zwiebel frisch")
  })

  it("does not add frisch twice when the food name already contains it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([{ product_name: "Karotte frisch", nutriments: { "energy-kcal_100g": 35 } }]),
    )

    await lookupNutrients("Karotte frisch", "Stück")

    expect(searchQueryOf(fetchMock.mock.calls[0])).toBe("Karotte frisch")
  })
})

describe("lookupNutrients timeout", () => {
  it("passes an abort signal and treats a timed-out request as a failed attempt", async () => {
    const originalTimeout = config.openFoodFacts.timeoutMs
    config.openFoodFacts.timeoutMs = 10

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init?.signal?.reason))
      }),
    )

    try {
      const result = await lookupNutrients("Haengt")

      expect(fetchMock).toHaveBeenCalledTimes(config.openFoodFacts.maxRetries + 1)
      expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
      expect(result.matched).toBe(false)
      expect(result.nutrients).toBeNull()
    } finally {
      config.openFoodFacts.timeoutMs = originalTimeout
    }
  })
})
