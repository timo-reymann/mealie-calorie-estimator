import Fastify from "fastify"
import cors from "@fastify/cors"
import { config } from "./config.js"
import { logger } from "./utils/logger.js"
import { initCache } from "./utils/cache.js"
import { webhookRoutes } from "./routes/webhook.js"
import { estimateRoutes } from "./routes/estimate.js"
import { backfillRoutes } from "./routes/backfill.js"

async function main() {
  await initCache()
  const app = Fastify({
    logger: false,
  })

  await app.register(cors)

  await app.register(webhookRoutes)
  await app.register(estimateRoutes)
  await app.register(backfillRoutes)

  app.get("/health", async () => {
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

main()
