import { Platform } from 'react-native'
import { Asset } from 'expo-asset'
import type { CharacterJson } from 'hanzi-writer'
import { HANZI_SHARDS, SHARD_COUNT } from '../assets/hanzi/shards'

/*
 * Stroke data for a character, read from a bundled shard rather than from the JS
 * bundle.
 *
 * `hanziData.json` used to be imported directly. Metro inlines an imported .json
 * into the module graph, so 15.8MB of paths and medians became 25.8MB of Hermes
 * bytecode — 59% of the whole bundle — and every launch paid to construct 5,378
 * objects full of nested [x,y] arrays before anyone had asked to see a single
 * character drawn. The data now ships as 64 asset files (~253KB each, see
 * scripts/buildHanziShards.mjs) that are read on demand.
 *
 * **This is not a downgrade of offline support.** The shards are packaged in the
 * app exactly as the artwork and fonts are; nothing here touches the network.
 * The CDN fallback in HanziStage still covers only what it covered before —
 * characters the dataset never had.
 *
 * Three things worth knowing before changing this:
 *
 *  - **The shard is computed, never looked up.** `codePointAt(0) % SHARD_COUNT`
 *    matches the builder, so there is no character->shard table to bundle and
 *    keep in step. Change the bucketing in one place and it must change in both.
 *  - **Requires are static.** `HANZI_SHARDS` is a generated array of
 *    `require()` calls because Metro resolves those at build time; a computed
 *    `require('./shard-' + n)` resolves to nothing at all.
 *  - **In-flight loads are cached, not just finished ones.** A word is several
 *    characters mounting at once, and each one asks for its shard immediately.
 *    Caching the promise means two characters in the same shard share one read
 *    instead of racing to do the same work twice.
 */

/** Parsed shards, and the in-flight reads for shards not yet parsed. */
const cache = new Map<number, Promise<Record<string, CharacterJson>>>()

function shardFor(character: string): number {
  const cp = character.codePointAt(0)
  if (cp === undefined) return 0
  return cp % SHARD_COUNT
}

async function readShard(index: number): Promise<Record<string, CharacterJson>> {
  const asset = Asset.fromModule(HANZI_SHARDS[index])
  await asset.downloadAsync()
  const uri = asset.localUri ?? asset.uri

  /*
   * Two readers, because there is no one API that works on both. On native the
   * asset lands on disk and expo-file-system reads it; `fetch` on a file:// URL
   * is not reliable on Android. On web there is no filesystem and the asset is
   * a URL, which is exactly what fetch is for.
   */
  let text: string
  if (Platform.OS === 'web') {
    const res = await fetch(uri)
    if (!res.ok) throw new Error(`Shard ${index} failed (${res.status})`)
    text = await res.text()
  } else {
    const { File } = await import('expo-file-system')
    text = await new File(uri).text()
  }

  return JSON.parse(text) as Record<string, CharacterJson>
}

function loadShard(index: number): Promise<Record<string, CharacterJson>> {
  const existing = cache.get(index)
  if (existing) return existing
  const pending = readShard(index).catch((error) => {
    // A failed read must not poison the cache — the next character to want this
    // shard should get a fresh attempt rather than the same rejection for the
    // life of the process.
    cache.delete(index)
    throw error
  })
  cache.set(index, pending)
  return pending
}

/**
 * Stroke data for one character, or null if the bundled dataset doesn't have it.
 *
 * Null is the same "not covered" answer the old synchronous lookup gave for a
 * character outside the dataset, and callers handle it the same way — see
 * HanziStage's CDN fallback.
 */
export async function bundledCharacterData(character: string): Promise<CharacterJson | null> {
  const shard = await loadShard(shardFor(character))
  return shard[character] ?? null
}
