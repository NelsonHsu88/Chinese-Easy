/*
 * The narrow slice of AsyncStorage that the persistence layer actually needs.
 *
 * Migration and guest adoption are the two pieces of this system where a bug
 * destroys a learner's work, so they are written against this interface rather
 * than against AsyncStorage directly — which is what lets them run in a plain
 * Node test with an in-memory store and no native module in sight.
 *
 * `storage.ts` provides the real implementation over AsyncStorage.
 */

export interface KeyValueStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

/** An in-memory store, for tests. Seeded state is optional. */
export function createMemoryStore(seed: Record<string, string> = {}): KeyValueStore & {
  snapshot(): Record<string, string>
} {
  const data = new Map<string, string>(Object.entries(seed))
  return {
    async get(key) {
      return data.has(key) ? (data.get(key) as string) : null
    },
    async set(key, value) {
      data.set(key, value)
    },
    async remove(key) {
      data.delete(key)
    },
    snapshot() {
      return Object.fromEntries(data)
    },
  }
}
