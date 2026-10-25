import fs from 'node:fs'
import path from 'node:path'

/**
 * Look-alike characters, from the bundled stroke data.
 *
 * Two characters "look alike" when most of their strokes line up: same shape,
 * same place, same order. 大 and 太 share all three of 大's strokes (太 adds a
 * dot); 大 and 天 share three of four; 大 and 犬 likewise. That is what a
 * learner confuses, so it is what the word and character pages list as
 * "Related characters".
 *
 * Each stroke is its median line from hanzi-writer's data (1024-unit space),
 * resampled to evenly spaced points. Two characters are aligned in stroke order
 * (an edit-distance alignment: a stroke either pairs with one in the other
 * character or is left over), a paired stroke scoring by how close its points
 * are. Similarity = summed pair scores / the larger stroke count, so an extra
 * stroke costs as much as a missing one.
 *
 * A cheap occupancy-grid overlap prunes pairs before the alignment.
 *
 * Output: src/data/lookalikes.json — `{ chars, lists }`, where `lists` is one
 * `|`-separated run per character in `chars` order, most similar first. Both
 * scripts are in it; the app filters to the learner's script.
 *
 * Usage: node scripts/buildLookalikes.mjs   (re-run after buildHanziData.mjs)
 */

const ROOT = process.cwd()
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/assets/hanziData.json'), 'utf8'))
const OUT = path.join(ROOT, 'src/data/lookalikes.json')

const POINTS = 8
/** Mean point distance at which a stroke pair stops counting at all. */
const FAR = 170
const MAX_STROKE_DIFF = 2
const MIN_SIMILARITY = 0.55
const KEEP = 12
const GRID = 12
const MIN_GRID_OVERLAP = 0.3

function resample(line) {
  if (line.length === 1) return Array.from({ length: POINTS }, () => line[0])
  const lengths = [0]
  for (let i = 1; i < line.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]))
  }
  const total = lengths[lengths.length - 1] || 1
  const out = []
  let j = 1
  for (let k = 0; k < POINTS; k++) {
    const at = (total * k) / (POINTS - 1)
    while (j < line.length - 1 && lengths[j] < at) j++
    const span = lengths[j] - lengths[j - 1] || 1
    const t = Math.min(1, Math.max(0, (at - lengths[j - 1]) / span))
    out.push([
      line[j - 1][0] + (line[j][0] - line[j - 1][0]) * t,
      line[j - 1][1] + (line[j][1] - line[j - 1][1]) * t,
    ])
  }
  return out
}

function grid(strokes) {
  const cells = new Set()
  for (const s of strokes) for (const [x, y] of s) cells.add(Math.min(GRID - 1, Math.floor((x / 1024) * GRID)) * GRID + Math.min(GRID - 1, Math.max(0, Math.floor(((y + 124) / 1024) * GRID))))
  return cells
}

const chars = []
for (const [ch, d] of Object.entries(data)) {
  if (!d?.medians?.length) continue
  const strokes = d.medians.map(resample)
  chars.push({ ch, strokes, cells: grid(strokes) })
}

function strokeScore(a, b) {
  let sum = 0
  for (let i = 0; i < POINTS; i++) sum += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1])
  return Math.max(0, 1 - sum / POINTS / FAR)
}

/** Best order-preserving pairing of strokes, as total score. */
function align(a, b) {
  const n = a.length
  const m = b.length
  let prev = new Float64Array(m + 1)
  for (let i = 1; i <= n; i++) {
    const row = new Float64Array(m + 1)
    for (let j = 1; j <= m; j++) {
      row[j] = Math.max(prev[j], row[j - 1], prev[j - 1] + strokeScore(a[i - 1], b[j - 1]))
    }
    prev = row
  }
  return prev[m]
}

function overlap(a, b) {
  let shared = 0
  for (const c of a) if (b.has(c)) shared++
  return shared / Math.max(a.size, b.size)
}

const byCount = new Map()
for (const c of chars) {
  const n = c.strokes.length
  if (!byCount.has(n)) byCount.set(n, [])
  byCount.get(n).push(c)
}

const started = Date.now()
const lists = []
for (const c of chars) {
  const n = c.strokes.length
  const scored = []
  for (let k = Math.max(1, n - MAX_STROKE_DIFF); k <= n + MAX_STROKE_DIFF; k++) {
    for (const other of byCount.get(k) ?? []) {
      if (other === c || overlap(c.cells, other.cells) < MIN_GRID_OVERLAP) continue
      const similarity = align(c.strokes, other.strokes) / Math.max(n, k)
      if (similarity >= MIN_SIMILARITY) scored.push([other.ch, similarity])
    }
  }
  scored.sort((x, y) => y[1] - x[1])
  lists.push(scored.slice(0, KEEP).map(([ch]) => ch).join(''))
}

fs.writeFileSync(OUT, JSON.stringify({ chars: chars.map((c) => c.ch).join(''), lists: lists.join('|') }))
const withAny = lists.filter(Boolean).length
console.log(`${chars.length} characters, ${withAny} with look-alikes, ${((Date.now() - started) / 1000).toFixed(1)}s`)
console.log(`wrote ${OUT}  ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`)
for (const probe of ['大', '天', '人', '日', '目', '己', '未', '土', '王', '問', '学']) {
  const i = chars.findIndex((c) => c.ch === probe)
  if (i >= 0) console.log(probe, lists[i])
}
