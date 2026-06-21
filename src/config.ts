import { version } from "../package.json"

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),

  mealie: {
    url: process.env.MEALIE_URL || "http://mealie:9000",
    apiToken: process.env.MEALIE_API_TOKEN || "",
    timeoutMs: parseInt(process.env.MEALIE_TIMEOUT_MS || "30000", 10),
  },

  openFoodFacts: {
    baseUrl: process.env.OFF_BASE_URL || "https://world.openfoodfacts.org",
    language: process.env.OFF_LANGUAGE || "de",
    searchRateLimit: parseInt(process.env.OFF_SEARCH_RATE_LIMIT || "10", 10),
    productRateLimit: parseInt(process.env.OFF_PRODUCT_RATE_LIMIT || "15", 10),
    cacheTtlMs: parseInt(process.env.OFF_CACHE_TTL || "86400", 10) * 1000,
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

if (!config.mealie.apiToken) {
  throw new Error("MEALIE_API_TOKEN is not set. Estimator cannot start without it.")
}
