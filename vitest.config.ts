import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    env: {
      MEALIE_API_TOKEN: "test-token",
      OFF_LANGUAGE: "de",
      CACHE_DB_PATH: "data/test-cache.db",
    },
    reporters: ["default", ["junit", { outputFile: "test-results.xml" }]],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
    },
  },
})
