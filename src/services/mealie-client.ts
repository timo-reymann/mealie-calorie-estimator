import http from "node:http"
import https from "node:https"
import { config } from "../config.js"
import { logger } from "../utils/logger.js"
import type { MealieRecipe, MealieRecipePatch, MealieTag } from "../types.js"

const parsedBase = new URL(config.mealie.url)
const isHttps = parsedBase.protocol === "https:"
const transport = isHttps ? https : http

function request<T>(
  method: string,
  path: string,
  body?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      req.destroy()
      reject(new Error(`Mealie API request timed out: ${method} ${parsedBase.origin}${path}`))
    }, config.mealie.timeoutMs)

    const req = transport.request(
      {
        hostname: parsedBase.hostname,
        port: parsedBase.port || (isHttps ? 443 : 80),
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.mealie.apiToken}`,
        },
        timeout: config.mealie.timeoutMs,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          if (res.statusCode === 204) {
            clearTimeout(timer)
            return resolve(undefined as T)
          }
          const chunks: Buffer[] = []
          res.on("data", (chunk: Buffer) => chunks.push(chunk))
          res.on("end", () => {
            clearTimeout(timer)
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString()) as T)
            } catch {
              reject(new Error("Invalid JSON from Mealie API"))
            }
          })
          res.on("error", (err) => {
            clearTimeout(timer)
            reject(err)
          })
        } else {
          const chunks: Buffer[] = []
          res.on("data", (chunk: Buffer) => chunks.push(chunk))
          res.on("end", () => {
            clearTimeout(timer)
            const body = Buffer.concat(chunks).toString().slice(0, 200)
            reject(
              new Error(
                `Mealie API ${res.statusCode} ${res.statusMessage}: ${parsedBase.origin}${path} — ${body}`,
              ),
            )
          })
        }
      },
    )

    req.on("timeout", () => {
      clearTimeout(timer)
      req.destroy()
      reject(new Error(`Mealie API request timed out: ${method} ${parsedBase.origin}${path}`))
    })

    req.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })

    if (body) req.write(body)
    req.end()
  })
}

export async function getRecipe(slug: string): Promise<MealieRecipe> {
  logger.debug({ slug }, "Fetching recipe from Mealie")
  return request<MealieRecipe>("GET", `/api/recipes/${slug}`)
}

export async function patchRecipe(slug: string, patch: MealieRecipePatch): Promise<void> {
  logger.debug({ slug, patch }, "Patching recipe in Mealie")
  await request("PATCH", `/api/recipes/${slug}`, JSON.stringify(patch))
}

export async function getAllRecipes(): Promise<string[]> {
  const slugs: string[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const data = await request<{
      items: { slug: string }[]
      total: number
      page: number
      total_pages: number
    }>("GET", `/api/recipes?page=${page}&per_page=${perPage}&order_direction=asc`)

    for (const item of data.items) {
      slugs.push(item.slug)
    }

    if (page >= data.total_pages) break
    page++
  }

  return slugs
}

interface TagsPagination {
  items: MealieTag[]
  total: number
  page: number
  total_pages: number
}

export async function getOrCreateTags(names: string[]): Promise<MealieTag[]> {
  const tags: MealieTag[] = []
  for (const name of names) {
    try {
      const tag = await request<MealieTag>("POST", "/api/organizers/tags", JSON.stringify({ name }))
      tags.push(tag)
    } catch {
      const all = await request<TagsPagination>("GET", "/api/organizers/tags?perPage=-1")
      const existing = all.items.find((t) => t.name === name)
      if (existing) {
        tags.push(existing)
      }
    }
  }
  return tags
}
