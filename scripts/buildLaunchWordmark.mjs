/*
 * The launch intro's handwritten "Chinese Easy": glyph outlines from Lora Bold,
 * plus the bouncing ball that writes them.
 *
 * Output (`src/components/launch/wordmark.ts`, generated — don't edit):
 *   - one stroke per glyph contour, flattened to a polyline so its length is
 *     exact (the stroke is drawn on with a dash offset of that length);
 *   - one filled outline per letter, kept as quadratic curves for crispness;
 *   - the ball's keyframes: it traces each contour, then hops — a parabola,
 *     higher for a longer hop — to the next, and finishes by rolling out the
 *     underline. Landings carry a squash.
 *
 * A minimal TrueType reader is inlined (cmap 4, hmtx, loca, glyf) — the
 * project has no font library and needs nothing more than this.
 *
 *   node scripts/buildLaunchWordmark.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const FONT = 'node_modules/@expo-google-fonts/lora/700Bold/Lora_700Bold.ttf'
const OUT = 'src/components/launch/wordmark.ts'
const TEXT = 'Chinese Easy'
const FONT_PX = 36
const LETTER_SPACING = 0.6
/* Room above the cap height for the ball's hops, and below for the underline. */
const PAD_TOP = 34
const PAD_BOTTOM = 22
const PAD_X = 10
const UNDERLINE_GAP = 12
const UNDERLINE_WIDTH = 70

/* Timing budget (ms). Drawing time is shared out by contour length. */
const DROP_MS = 220 // the ball falls in onto the first stroke
const WRITE_MS = 800 // all contour tracing together
const HOP_MS_BASE = 42
const HOP_MS_PER_PX = 0.25
const UNDERLINE_HOP_MS = 150
const UNDERLINE_ROLL_MS = 220

// ── TrueType ────────────────────────────────────────────────────────────────
const buf = readFileSync(FONT)
const u16 = (o) => buf.readUInt16BE(o)
const i16 = (o) => buf.readInt16BE(o)
const u32 = (o) => buf.readUInt32BE(o)

const tables = {}
for (let i = 0, n = u16(4); i < n; i++) {
  const r = 12 + i * 16
  tables[buf.toString('latin1', r, r + 4)] = u32(r + 8)
}
for (const t of ['cmap', 'head', 'hhea', 'hmtx', 'loca', 'glyf', 'maxp']) {
  if (tables[t] === undefined) throw new Error(`${FONT} has no ${t} table (CFF font?)`)
}
const unitsPerEm = u16(tables.head + 18)
const longLoca = i16(tables.head + 50) === 1
const numHMetrics = u16(tables.hhea + 34)

function glyphIndex(code) {
  const cmap = tables.cmap
  for (let i = 0, n = u16(cmap + 2); i < n; i++) {
    const rec = cmap + 4 + i * 8
    const sub = cmap + u32(rec + 4)
    if (u16(sub) !== 4) continue
    const segX2 = u16(sub + 6)
    const ends = sub + 14
    const starts = ends + segX2 + 2
    const deltas = starts + segX2
    const offsets = deltas + segX2
    for (let s = 0; s < segX2 / 2; s++) {
      if (code > u16(ends + s * 2)) continue
      if (code < u16(starts + s * 2)) return 0
      const ro = u16(offsets + s * 2)
      if (ro === 0) return (code + i16(deltas + s * 2)) & 0xffff
      const g = u16(offsets + s * 2 + ro + (code - u16(starts + s * 2)) * 2)
      return g === 0 ? 0 : (g + i16(deltas + s * 2)) & 0xffff
    }
  }
  return 0
}

const advance = (g) => u16(tables.hmtx + Math.min(g, numHMetrics - 1) * 4)
const glyphOffset = (g) =>
  longLoca ? u32(tables.loca + g * 4) : u16(tables.loca + g * 2) * 2

/** Contours as arrays of {x, y, on}. Composites are flattened by offset. */
function glyphContours(g) {
  const start = glyphOffset(g)
  if (start === glyphOffset(g + 1)) return []
  const o = tables.glyf + start
  const nContours = i16(o)
  if (nContours < 0) {
    const out = []
    let p = o + 10
    for (;;) {
      const flags = u16(p)
      const sub = u16(p + 2)
      let dx, dy
      if (flags & 1) { dx = i16(p + 4); dy = i16(p + 6); p += 8 } else { dx = buf.readInt8(p + 4); dy = buf.readInt8(p + 5); p += 6 }
      if (flags & 8) p += 2
      else if (flags & 0x40) p += 4
      else if (flags & 0x80) p += 8
      for (const c of glyphContours(sub)) out.push(c.map((pt) => ({ ...pt, x: pt.x + dx, y: pt.y + dy })))
      if (!(flags & 0x20)) break
    }
    return out
  }
  const endPts = []
  for (let i = 0; i < nContours; i++) endPts.push(u16(o + 10 + i * 2))
  const nPts = endPts[nContours - 1] + 1
  let p = o + 10 + nContours * 2
  p += 2 + u16(p)
  const flags = []
  while (flags.length < nPts) {
    const f = buf[p++]
    flags.push(f)
    if (f & 8) for (let r = buf[p++]; r > 0; r--) flags.push(f)
  }
  const read = (short, same) => {
    const vals = []
    let v = 0
    for (const f of flags) {
      if (f & short) { const d = buf[p++]; v += f & same ? d : -d }
      else if (!(f & same)) { v += i16(p); p += 2 }
      vals.push(v)
    }
    return vals
  }
  const xs = read(2, 16)
  const ys = read(4, 32)
  const contours = []
  let s = 0
  for (const e of endPts) {
    const c = []
    for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 })
    contours.push(c)
    s = e + 1
  }
  return contours
}

/** On/off points → explicit quadratic segments [from, ctrl|null, to]. */
function segments(contour) {
  const pts = contour.slice()
  // Start on an on-curve point (or an implied midpoint if there is none).
  let k = pts.findIndex((q) => q.on)
  if (k === -1) {
    const a = pts[0], b = pts[1]
    pts.unshift({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true })
    k = 0
  }
  const ring = [...pts.slice(k), ...pts.slice(0, k)]
  const segs = []
  let cur = ring[0]
  let ctrl = null
  for (let i = 1; i <= ring.length; i++) {
    const q = ring[i % ring.length]
    if (q.on) {
      segs.push([cur, ctrl, q])
      cur = q
      ctrl = null
    } else if (ctrl) {
      const mid = { x: (ctrl.x + q.x) / 2, y: (ctrl.y + q.y) / 2, on: true }
      segs.push([cur, ctrl, mid])
      cur = mid
      ctrl = q
    } else {
      ctrl = q
    }
  }
  return segs
}

// ── Layout ──────────────────────────────────────────────────────────────────
const scale = FONT_PX / unitsPerEm
const r1 = (v) => Math.round(v * 10) / 10
let penX = 0
const letters = []
for (const ch of TEXT) {
  const g = glyphIndex(ch.codePointAt(0))
  letters.push({ ch, g, x: penX })
  penX += advance(g) * scale + LETTER_SPACING
}
const textWidth = penX - LETTER_SPACING
const capPx = 0.72 * FONT_PX
const baseline = PAD_TOP + capPx
const width = Math.ceil(textWidth + PAD_X * 2)
const height = Math.ceil(baseline + FONT_PX * 0.28 + UNDERLINE_GAP + PAD_BOTTOM)
const ox = PAD_X
const tx = (l, x) => ox + l.x + x * scale
const ty = (y) => baseline - y * scale

const strokes = [] // { d, length, letter, start:{x,y}, end:{x,y} }
const fills = [] // per letter, with Q curves
letters.forEach((l, li) => {
  const contours = glyphContours(l.g)
  if (!contours.length) return
  let fill = ''
  for (const c of contours) {
    const segs = segments(c)
    const P = (q) => `${r1(tx(l, q.x))} ${r1(ty(q.y))}`
    fill += `M${P(segs[0][0])}`
    const poly = [[tx(l, segs[0][0].x), ty(segs[0][0].y)]]
    for (const [a, ctrl, b] of segs) {
      fill += ctrl ? `Q${P(ctrl)} ${P(b)}` : `L${P(b)}`
      const steps = ctrl ? 8 : 1
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        const x = ctrl ? (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctrl.x + t * t * b.x : b.x
        const y = ctrl ? (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctrl.y + t * t * b.y : b.y
        poly.push([tx(l, x), ty(y)])
      }
    }
    fill += 'Z'
    let length = 0
    for (let i = 1; i < poly.length; i++) length += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1])
    strokes.push({
      d: 'M' + poly.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L'),
      poly,
      length,
      letter: li,
    })
  }
  fills.push({ letter: li, d: fill })
})

// ── Ball timeline ───────────────────────────────────────────────────────────
const totalLen = strokes.reduce((a, s) => a + s.length, 0)
const msPerPx = WRITE_MS / totalLen
const keys = [] // [t, x, y]
const landings = [] // t of each touch-down
const push = (t, x, y) => keys.push([Math.round(t), r1(x), r1(y)])

function hop(t0, from, to, ms) {
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
  const lift = 8 + dist * 0.32
  const n = 8
  for (let i = 1; i <= n; i++) {
    const u = i / n
    const x = from[0] + (to[0] - from[0]) * u
    const y = from[1] + (to[1] - from[1]) * u - 4 * lift * u * (1 - u)
    push(t0 + ms * u, x, y)
  }
  landings.push(Math.round(t0 + ms))
  return t0 + ms
}

let t = 0
const first = strokes[0].poly[0]
// Drop in from above the hop band, landing on the first stroke's start.
push(0, first[0], 2)
push(DROP_MS * 0.55, first[0], first[1] - 0.6 * (first[1] - 2))
push(DROP_MS, first[0], first[1])
landings.push(DROP_MS)
t = DROP_MS
const strokeTimes = []
strokes.forEach((s, i) => {
  if (i > 0) {
    const prev = strokes[i - 1].poly.at(-1)
    const dist = Math.hypot(s.poly[0][0] - prev[0], s.poly[0][1] - prev[1])
    t = hop(t, prev, s.poly[0], HOP_MS_BASE + dist * HOP_MS_PER_PX)
  }
  const t0 = t
  let along = 0
  // Sample the trace every ~4px so the ball follows the curve.
  let since = 0
  for (let k = 1; k < s.poly.length; k++) {
    const seg = Math.hypot(s.poly[k][0] - s.poly[k - 1][0], s.poly[k][1] - s.poly[k - 1][1])
    along += seg
    since += seg
    if (since >= 4 || k === s.poly.length - 1) {
      push(t0 + along * msPerPx, s.poly[k][0], s.poly[k][1])
      since = 0
    }
  }
  t = t0 + s.length * msPerPx
  strokeTimes.push([Math.round(t0), Math.round(t)])
})
const writeEnd = Math.round(t)

// Hop down to the underline's left end, roll it out, then rest at its end.
const ulY = baseline + FONT_PX * 0.28 + UNDERLINE_GAP
const ulX0 = width / 2 - UNDERLINE_WIDTH / 2
const ulX1 = width / 2 + UNDERLINE_WIDTH / 2
t = hop(t, strokes.at(-1).poly.at(-1), [ulX0, ulY], UNDERLINE_HOP_MS)
const underlineStart = Math.round(t)
push(t + UNDERLINE_ROLL_MS, ulX1, ulY)
const underlineEnd = Math.round(t + UNDERLINE_ROLL_MS)

// Collapse duplicate instants (interpolate needs strictly rising input).
const clean = []
for (const k of keys) {
  if (clean.length && k[0] <= clean.at(-1)[0]) k[0] = clean.at(-1)[0] + 1
  clean.push(k)
}

const out = `/*
 * GENERATED by scripts/buildLaunchWordmark.mjs — don't edit by hand.
 * "${TEXT}" in Lora Bold at ${FONT_PX}px, laid out in a ${width}×${height} box.
 * Times are ms from the start of the writing.
 */
export const wordmarkBox = { width: ${width}, height: ${height} } as const

/** One per glyph contour, drawn in this order. */
export const wordmarkStrokes: { d: string; length: number; letter: number; t0: number; t1: number }[] = ${JSON.stringify(
  strokes.map((s, i) => ({ d: s.d, length: Math.ceil(s.length) + 1, letter: s.letter, t0: strokeTimes[i][0], t1: strokeTimes[i][1] })),
)}

/** The letters' filled outlines; each fills once its last contour is traced. */
export const wordmarkFills: { d: string; letter: number }[] = ${JSON.stringify(fills)}

/** The ball: [t, x, y] keyframes, and the instants it touches down. */
export const ballKeys: [number, number, number][] = ${JSON.stringify(clean)}
export const ballLandings: number[] = ${JSON.stringify(landings)}

export const underline = { x0: ${r1(ulX0)}, x1: ${r1(ulX1)}, y: ${r1(ulY)}, t0: ${underlineStart}, t1: ${underlineEnd} } as const
export const writeTiming = { dropMs: ${DROP_MS}, writeEnd: ${writeEnd}, total: ${underlineEnd} } as const
`
writeFileSync(OUT, out)
console.log(`wrote ${OUT}: ${strokes.length} strokes, ${clean.length} ball keys, ${underlineEnd}ms, box ${width}×${height}`)
