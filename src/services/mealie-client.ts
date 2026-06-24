import http from "node:http"
import https from "node:https"
import { config, getMealieToken } from "../config.js"
import { logger } from "../utils/logger.js"
import type { MealieRecipe, MealieRecipePatch, MealieTag } from "../types.js"

const parsedBase = new URL(config.mealie.url)
const isHttps = parsedBase.protocol === "https:"
const transport = isHttps ? https : http

function request<T>(
  method: string,
  path: string,
  body?: string,
  token?: string,
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
          Authorization: `Bearer ${token ?? config.mealie.apiToken}`,
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

export function getRecipeHouseholdId(recipe: MealieRecipe): string | null {
  return recipe.householdId ?? recipe.household_id ?? null
}

export async function getRecipe(slug: string, householdId?: string | null): Promise<MealieRecipe> {
  logger.debug({ slug, householdId }, "Fetching recipe from Mealie")
  const token = getMealieToken(householdId)
  return request<MealieRecipe>("GET", `/api/recipes/${slug}`, undefined, token)
}

export async function patchRecipe(slug: string, patch: MealieRecipePatch, householdId?: string | null): Promise<void> {
  logger.debug({ slug, patch, householdId }, "Patching recipe in Mealie")
  const token = getMealieToken(householdId)
  await request("PATCH", `/api/recipes/${slug}`, JSON.stringify(patch), token)
}

export async function getAllRecipes(householdId?: string | null): Promise<string[]> {
  const slugs: string[] = []
  let page = 1
  const perPage = 100
  const token = getMealieToken(householdId)

  while (true) {
    const data = await request<{
      items: { slug: string }[]
      total: number
      page: number
      total_pages: number
    }>("GET", `/api/recipes?page=${page}&per_page=${perPage}&order_direction=asc`, undefined, token)

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

export async function getOrCreateTags(names: string[], householdId?: string | null): Promise<MealieTag[]> {
  const tags: MealieTag[] = []
  const token = getMealieToken(householdId)
  for (const name of names) {
    try {
      const tag = await request<MealieTag>("POST", "/api/organizers/tags", JSON.stringify({ name }), token)
      tags.push(tag)
    } catch {
      const all = await request<TagsPagination>("GET", "/api/organizers/tags?perPage=-1", undefined, token)
      const existing = all.items.find((t) => t.name === name)
      if (existing) {
        tags.push(existing)
      }
    }
  }
  return tags
}
