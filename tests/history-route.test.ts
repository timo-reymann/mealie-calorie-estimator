import { describe, it, expect, beforeEach, afterEach } from "vitest"
import Fastify, { type FastifyInstance } from "fastify"
import type { AddressInfo } from "node:net"
import { historyRoutes } from "../src/routes/history.js"
import { recordStart, clearHistory, getHistory } from "../src/utils/execution-history.js"
import { clearThemeCache, DEFAULT_THEME } from "../src/services/mealie-theme.js"
import { config } from "../src/config.js"

let app: FastifyInstance
let baseUrl: string

beforeEach(async () => {
  clearHistory()
  clearThemeCache()
  config.mealie.url = "http://127.0.0.1:1"
  app = Fastify({ logger: false })
  await app.register(historyRoutes)
  await app.listen({ port: 0, host: "127.0.0.1" })
  const { port } = app.server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  await app.close()
})

describe("history routes", () => {
  it("serves the HTML page", async () => {
    const res = await fetch(`${baseUrl}/estimator/history`)

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(res.headers.get("cache-control")).toContain("max-age=7200")

    const html = await res.text()
    expect(html).toContain("mealie-calorie-estimator")
    expect(html).toContain('id="rows"')
    expect(html).toContain("/recipe/{slug}")
    expect(html).toContain("/estimator/history/events")
    expect(html).toContain(`--primary: ${DEFAULT_THEME.light.primary}`)
    expect(html).toContain("prefers-color-scheme: dark")
  })

  it("serves the JSON snapshot", async () => {
    const handle = recordStart({ trigger: "webhook", slug: "some-recipe" })
    handle.setRecipe("Some Recipe", null)
    handle.complete("processed", ["Set calories: 450 kcal/serving"], {
      nutrients: {
        kcalPer100g: 450,
        proteinPer100g: 20,
        carbsPer100g: 40,
        fatPer100g: 15,
        saturatedFatPer100g: 6,
        transFatPer100g: 0,
        unsaturatedFatPer100g: 9,
        fiberPer100g: 3,
        sugarPer100g: 5,
        sodiumPer100g: 300,
        cholesterolPer100g: 40,
      },
      matchedCount: 5,
      unmatchedCount: 1,
    })

    const res = await fetch(`${baseUrl}/estimator/history.json`)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      slug: "some-recipe",
      recipeName: "Some Recipe",
      trigger: "webhook",
      status: "processed",
      changes: ["Set calories: 450 kcal/serving"],
      estimate: { matchedCount: 5, unmatchedCount: 1 },
    })
    expect(body[0].estimate.nutrients.kcalPer100g).toBe(450)
  })

  it("streams an initial snapshot over SSE", async () => {
    const handle = recordStart({ trigger: "estimate", slug: "streamed-recipe" })
    handle.complete("processed", [])

    const controller = new AbortController()
    const res = await fetch(`${baseUrl}/estimator/history/events`, {
      signal: controller.signal,
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const chunk = await readUntil(res.body!, "data: ")
    expect(chunk).toContain("streamed-recipe")

    controller.abort()
  })

  it("pushes updates to connected SSE clients", async () => {
    const controller = new AbortController()
    const res = await fetch(`${baseUrl}/estimator/history/events`, {
      signal: controller.signal,
    })
    const reader = res.body!.getReader()

    await readFrom(reader, "data: ")

    const handle = recordStart({ trigger: "backfill", slug: "live-recipe" })
    handle.complete("processed", ["Set calories: 100 kcal/serving"])

    const chunk = await readFrom(reader, "live-recipe")
    expect(chunk).toContain("processed")

    controller.abort()
  })

  it("returns an empty array when nothing was recorded", async () => {
    const res = await fetch(`${baseUrl}/estimator/history.json`)
    expect(await res.json()).toEqual([])
    expect(getHistory()).toEqual([])
  })
})

async function readFrom(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  needle: string,
): Promise<string> {
  const decoder = new TextDecoder()
  let buf = ""
  while (!buf.includes(needle)) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
  }
  return buf
}

async function readUntil(body: ReadableStream<Uint8Array>, needle: string): Promise<string> {
  return readFrom(body.getReader(), needle)
}
