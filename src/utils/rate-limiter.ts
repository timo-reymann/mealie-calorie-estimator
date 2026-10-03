import { RateLimiterMemory } from "rate-limiter-flexible"
import { config } from "../config.js"
import { logger } from "./logger.js"

const searchLimiter = new RateLimiterMemory({
  points: config.openFoodFacts.searchRateLimit,
  duration: 60,
})

const productLimiter = new RateLimiterMemory({
  points: config.openFoodFacts.productRateLimit,
  duration: 60,
})

const llmLimiter = new RateLimiterMemory({
  points: config.llm.rateLimit,
  duration: 60,
})

export enum RateLimitType {
  Search = "search",
  Product = "product",
  Llm = "llm",
}

function getLimiter(type: RateLimitType): RateLimiterMemory {
  switch (type) {
    case RateLimitType.Search:
      return searchLimiter
    case RateLimitType.Product:
      return productLimiter
    case RateLimitType.Llm:
      return llmLimiter
  }
}

async function waitForRateLimitAttempt(type: RateLimitType, waited: boolean): Promise<void> {
  const limiter = getLimiter(type)
  const typeName = type === RateLimitType.Search ? "search" : type === RateLimitType.Product ? "product" : "llm"

  try {
    await limiter.consume(1)
    if (waited) {
      logger.debug({ type: typeName }, "Rate limit wait completed")
    }
  } catch {
    logger.debug({ type: typeName }, "Rate limit reached, waiting...")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await waitForRateLimitAttempt(type, true)
  }
}

export function waitForRateLimit(type: RateLimitType): Promise<void> {
  return waitForRateLimitAttempt(type, false)
}
