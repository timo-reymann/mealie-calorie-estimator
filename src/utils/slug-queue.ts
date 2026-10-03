import { config } from "../config.js"

export type SlugQueueTask = () => Promise<void>

interface Waiter {
  task: SlugQueueTask
  resolve: () => void
  reject: (err: unknown) => void
}

interface Burst {
  timer: ReturnType<typeof setTimeout>
  waiters: Map<string, Waiter[]>
}

export class SlugQueue {
  private readonly chains = new Map<string, Promise<void>>()
  private readonly bursts = new Map<string, Burst>()

  constructor(private readonly debounceMs: number = 0) {}

  run(slug: string, key: string, task: SlugQueueTask): Promise<void> {
    if (this.debounceMs <= 0) return this.enqueue(slug, task)

    return new Promise<void>((resolve, reject) => {
      let burst = this.bursts.get(slug)

      if (!burst) {
        burst = { timer: setTimeout(() => this.flush(slug), this.debounceMs), waiters: new Map() }
        this.bursts.set(slug, burst)
      } else {
        clearTimeout(burst.timer)
        burst.timer = setTimeout(() => this.flush(slug), this.debounceMs)
      }

      const queue = burst.waiters.get(key) ?? []
      queue.push({ task, resolve, reject })
      burst.waiters.set(key, queue)
    })
  }

  runNow(slug: string, task: SlugQueueTask): Promise<void> {
    return this.enqueue(slug, task)
  }

  private flush(slug: string): void {
    const burst = this.bursts.get(slug)
    if (!burst) return
    this.bursts.delete(slug)

    for (const waiters of burst.waiters.values()) {
      const { task } = waiters[0]
      this.enqueue(slug, task).then(
        () => waiters.forEach((w) => w.resolve()),
        (err) => waiters.forEach((w) => w.reject(err)),
      )
    }
  }

  private enqueue(slug: string, task: SlugQueueTask): Promise<void> {
    const previous = this.chains.get(slug) ?? Promise.resolve()
    const run = previous.then(task, task)
    const tail = run.then(() => {}, () => {})
    this.chains.set(slug, tail)

    void tail.then(() => {
      if (this.chains.get(slug) === tail) this.chains.delete(slug)
    })

    return run
  }
}

export const slugQueue = new SlugQueue(config.events.debounceMs)
