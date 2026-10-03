import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { SlugQueue } from "../src/utils/slug-queue.js"

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("SlugQueue", () => {
  it("serializes tasks for the same slug", async () => {
    vi.useRealTimers()
    const queue = new SlugQueue(0)
    const order: string[] = []

    const slow = queue.runNow("same", async () => {
      order.push("slow-start")
      await wait(30)
      order.push("slow-end")
    })
    const fast = queue.runNow("same", async () => {
      order.push("fast-start")
      await wait(1)
      order.push("fast-end")
    })

    await Promise.all([slow, fast])
    expect(order).toEqual(["slow-start", "slow-end", "fast-start", "fast-end"])
  })

  it("runs tasks for different slugs concurrently", async () => {
    vi.useRealTimers()
    const queue = new SlugQueue(0)
    const order: string[] = []

    const slow = queue.runNow("one", async () => {
      order.push("one-start")
      await wait(30)
      order.push("one-end")
    })
    const fast = queue.runNow("two", async () => {
      order.push("two-start")
      await wait(1)
      order.push("two-end")
    })

    await Promise.all([slow, fast])
    expect(order).toEqual(["one-start", "two-start", "two-end", "one-end"])
  })

  it("coalesces a burst of events into a single run", async () => {
    const queue = new SlugQueue(100)
    const task = vi.fn(async () => {})

    const runs = [
      queue.run("slug", "webhook", task),
      queue.run("slug", "webhook", task),
      queue.run("slug", "webhook", task),
    ]

    await vi.advanceTimersByTimeAsync(99)
    expect(task).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(task).toHaveBeenCalledTimes(1)

    await Promise.all(runs)
  })

  it("restarts the debounce window when a new event arrives", async () => {
    const queue = new SlugQueue(100)
    const task = vi.fn(async () => {})

    const first = queue.run("slug", "webhook", task)
    await vi.advanceTimersByTimeAsync(60)
    const second = queue.run("slug", "webhook", task)

    await vi.advanceTimersByTimeAsync(60)
    expect(task).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(40)
    expect(task).toHaveBeenCalledTimes(1)

    await Promise.all([first, second])
  })

  it("runs each distinct key of a burst once, in order", async () => {
    const queue = new SlugQueue(100)
    const order: string[] = []
    const webhook = vi.fn(async () => { order.push("webhook") })
    const estimate = vi.fn(async () => { order.push("estimate") })

    const runs = [
      queue.run("slug", "webhook", webhook),
      queue.run("slug", "estimate", estimate),
      queue.run("slug", "webhook", webhook),
    ]

    await vi.advanceTimersByTimeAsync(100)
    await Promise.all(runs)

    expect(webhook).toHaveBeenCalledTimes(1)
    expect(estimate).toHaveBeenCalledTimes(1)
    expect(order).toEqual(["webhook", "estimate"])
  })

  it("rejects every waiter of a failed coalesced run", async () => {
    const queue = new SlugQueue(100)
    const task = vi.fn(async () => { throw new Error("boom") })

    const runs = Promise.allSettled([
      queue.run("slug", "webhook", task),
      queue.run("slug", "webhook", task),
    ])

    await vi.advanceTimersByTimeAsync(100)
    const results = await runs

    expect(task).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"])
    expect(results[0].status === "rejected" && results[0].reason).toEqual(new Error("boom"))
  })

  it("keeps working after a failed task", async () => {
    vi.useRealTimers()
    const queue = new SlugQueue(0)

    await expect(
      queue.runNow("slug", async () => { throw new Error("boom") }),
    ).rejects.toThrow("boom")

    const task = vi.fn(async () => {})
    await queue.runNow("slug", task)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("runNow bypasses the debounce window", async () => {
    const queue = new SlugQueue(1000)
    const task = vi.fn(async () => {})

    await queue.runNow("slug", task)
    expect(task).toHaveBeenCalledTimes(1)
  })
})
