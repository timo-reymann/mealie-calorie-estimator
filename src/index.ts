import Fastify from "fastify"
import cors from "@fastify/cors"
import { config } from "./config.js"
import { logger } from "./utils/logger.js"
import { initCache } from "./utils/cache.js"
import { webhookRoutes } from "./routes/webhook.js"
import { estimateRoutes } from "./routes/estimate.js"
import { backfillRoutes } from "./routes/backfill.js"
import { historyRoutes } from "./routes/history.js"
import { seedDevHistory } from "./utils/dev-seed.js"
import { TAG_LOCALES } from "./services/tag-locale.js"

async function main() {
  const requestedLocale = (process.env.TAG_LOCALE || "en").toLowerCase().trim()
  if (!(TAG_LOCALES as readonly string[]).includes(requestedLocale)) {
    logger.warn(
      { requested: process.env.TAG_LOCALE, locale: config.tagging.locale },
      "Unsupported TAG_LOCALE, falling back to en",
    )
  }

  await initCache()
  if (config.estimate.nutrientSource === "llm" && !(config.llm.enabled && config.llm.apiKey)) {
    logger.warn("NUTRIENT_SOURCE=llm but the LLM is not enabled or has no API key, falling back to Open Food Facts")
  }
  const app = Fastify({
    logger: false,
  })

  await app.register(cors)

  await app.register(webhookRoutes)
  await app.register(estimateRoutes)
  await app.register(backfillRoutes)
  await app.register(historyRoutes)

  seedDevHistory()

  app.get("/health", () => {
    return { status: "ok", timestamp: new Date().toISOString() }
  })

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" })
    logger.info({ port: config.port }, "Calorie estimator server started")
  } catch (err) {
    logger.error({ err }, "Failed to start server")
    process.exit(1)
  }
}

try {
  await main()
} catch (err) {
  logger.error({ err }, "Server startup failed")
  process.exit(1)
}
