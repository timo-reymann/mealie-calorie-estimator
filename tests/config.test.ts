import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getMealieToken } from "../src/config.js"

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("getMealieToken", () => {
  it("returns default MEALIE_API_TOKEN when no householdId given", () => {
    const result = getMealieToken()
    expect(result).toBe("test-token")
  })

  it("returns default MEALIE_API_TOKEN when householdId has no matching env var", () => {
    const result = getMealieToken("nonexistent-household")
    expect(result).toBe("test-token")
  })

  it("returns household-specific token when MEALIE_API_TOKEN_<ID> is set", () => {
    process.env.MEALIE_API_TOKEN_HOUSEHOLD_123 = "house-token-123"
    const result = getMealieToken("household-123")
    expect(result).toBe("house-token-123")
  })

  it("falls back to default when household-specific env var is empty", () => {
    process.env.MEALIE_API_TOKEN_OTHER = ""
    const result = getMealieToken("other")
    expect(result).toBe("test-token")
  })

  it("normalizes householdId to uppercase with underscores", () => {
    process.env.MEALIE_API_TOKEN_ABC_DEF = "normalized-token"
    const result = getMealieToken("abc-def")
    expect(result).toBe("normalized-token")
  })

  it("treats householdId case-insensitively via normalization", () => {
    process.env.MEALIE_API_TOKEN_MY_HOUSE = "case-token"
    const result = getMealieToken("My-House")
    expect(result).toBe("case-token")
  })

  it("replaces multiple special chars with underscores", () => {
    process.env.MEALIE_API_TOKEN_A_B_C = "special-token"
    const result = getMealieToken("a b.c")
    expect(result).toBe("special-token")
  })

  it("falls back to first MEALIE_API_TOKEN_* when no default token set", async () => {
    delete process.env.MEALIE_API_TOKEN
    process.env.MEALIE_API_TOKEN_FALLBACK_HOUSE = "fallback-token"
    const { getMealieToken: gt } = await import("../src/config.js")
    expect(gt()).toBe("fallback-token")
  })
})
