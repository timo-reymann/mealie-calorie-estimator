const RETRY_BLOCK_MS = 60_000

const failures = new Map<string, { hash: string; at: number }>()

export function rememberFailure(slug: string, hash: string): void {
  failures.set(slug, { hash, at: Date.now() })
}

export function wasRecentlyFailed(slug: string, hash: string): boolean {
  const failure = failures.get(slug)
  if (!failure) return false
  if (Date.now() - failure.at > RETRY_BLOCK_MS) {
    failures.delete(slug)
    return false
  }
  return failure.hash === hash
}
