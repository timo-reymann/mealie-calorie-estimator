import { createRequire } from "module"
const { version } = createRequire(import.meta.url)("../package.json")

export function getMealieToken(householdId?: string | null): string {
  if (householdId) {
    const key =
      "MEALIE_API_TOKEN_" +
      householdId
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
    const token = process.env[key]
    if (token) return token
  }

  if (config.mealie.apiToken) return config.mealie.apiToken

  const fallbackKey = Object.keys(process.env).find((k) =>
    k.startsWith("MEALIE_API_TOKEN_"),
  )
  if (fallbackKey) return process.env[fallbackKey]!

  return ""
}

function hasAnyToken(): boolean {
  if (process.env.MEALIE_API_TOKEN) return true
  return Object.keys(process.env).some((k) => k.startsWith("MEALIE_API_TOKEN_"))
}

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),

  mealie: {
    url: process.env.MEALIE_URL || "http://mealie:9000",
    apiToken: process.env.MEALIE_API_TOKEN || "",
    timeoutMs: parseInt(process.env.MEALIE_TIMEOUT_MS || "30000", 10),
  },

  openFoodFacts: {
    baseUrl: process.env.OFF_BASE_URL || "https://world.openfoodfacts.org",
    searchBaseUrl: process.env.OFF_SEARCH_BASE_URL || "https://search.openfoodfacts.org",
    language: process.env.OFF_LANGUAGE || "de",
    searchRateLimit: parseInt(process.env.OFF_SEARCH_RATE_LIMIT || "10", 10),
    productRateLimit: parseInt(process.env.OFF_PRODUCT_RATE_LIMIT || "15", 10),
    cacheTtlMs: parseInt(process.env.OFF_CACHE_TTL || "86400", 10) * 1000,
    maxRetries: parseInt(process.env.OFF_MAX_RETRIES || "3", 10),
    retryBackoffMs: parseInt(process.env.OFF_RETRY_BACKOFF_MS || "500", 10),
    userAgent: process.env.OFF_USER_AGENT || `mealie-calorie-estimator/${version} (mail@timo-reymann.de)`,
  },

  llm: {
    enabled: (process.env.LLM_ENABLED || "false").toLowerCase() === "true",
    baseUrl: process.env.LLM_BASE_URL || "https://api.mistral.ai/v1",
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || "mistral-small-latest",
    rateLimit: parseInt(process.env.LLM_RATE_LIMIT || "30", 10),
  },

  cache: {
    dbPath: process.env.CACHE_DB_PATH || "data/cache.db",
  },

  logLevel: process.env.LOG_LEVEL || "info",
}

if (!hasAnyToken()) {
  throw new Error(
    "No Mealie API token configured. Set MEALIE_API_TOKEN or at least one MEALIE_API_TOKEN_<HOUSEHOLD_ID> environment variable.",
  )
}
