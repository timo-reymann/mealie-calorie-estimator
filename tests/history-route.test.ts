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
    expect(html).toContain("/estimator/history.json")
    expect(html).not.toContain("EventSource")
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

  it("returns records updated after since", async () => {
    const handle = recordStart({ trigger: "estimate", slug: "updated-recipe" })
    const since = getHistory()[0].updatedAt
    await new Promise((resolve) => setTimeout(resolve, 2))
    handle.complete("processed", ["Set calories: 100 kcal/serving"])

    const res = await fetch(`${baseUrl}/estimator/history.json?since=${since}`)

    expect(res.status).toBe(200)
    expect((await res.json()).map((record: { slug: string }) => record.slug)).toEqual([
      "updated-recipe",
    ])
  })

  it("rejects an invalid since timestamp", async () => {
    const res = await fetch(`${baseUrl}/estimator/history.json?since=invalid`)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "since must be a timestamp in milliseconds" })
  })

  it("returns an empty array when nothing was recorded", async () => {
    const res = await fetch(`${baseUrl}/estimator/history.json`)
    expect(await res.json()).toEqual([])
    expect(getHistory()).toEqual([])
  })
})
