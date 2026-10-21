/*
 * "Chinese Easy" as pen strokes: each letter of Caveat Bold reduced to its
 * centre line (the path a pen would actually travel), with the local stroke
 * half-width at every point.
 *
 * The intro writes the word by revealing the real letterform along those
 * centre lines — a mask of round-capped segments, each as wide as the stroke
 * is at that point, drawn on progressively. So the ink follows true stroke
 * paths, and the finished word is the font's own outline, thick-and-thin
 * contrast included.
 *
 * Centre lines come from the glyph rasterised large: a distance transform
 * gives the half-width, Zhang–Suen thinning gives the skeleton, the skeleton
 * is traced into strokes (spurs pruned), and the strokes are put in writing
 * order — letter by letter, left to right, each stroke started from its left
 * (or, for an upright one, its top) end.
 */
import sharp from 'sharp'
import { loadFont, layoutText } from './ttf.mjs'

const FONT = 'node_modules/@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf'
export const WORD = 'Chinese Easy'
/* Working size: big enough that thinning is clean. Output is in these units. */
export const WORK_PX = 220
const LETTER_SPACING = 2
const MARGIN = 12

function distanceTransform(bin, w, h) {
  // Two-pass chamfer (1, √2), good to well under a pixel at this size.
  const INF = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) d[i] = bin[i] ? INF : 0
  const D = Math.SQRT2
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (!d[i]) continue
    let v = d[i]
    if (x > 0) v = Math.min(v, d[i - 1] + 1)
    if (y > 0) {
      v = Math.min(v, d[i - w] + 1)
      if (x > 0) v = Math.min(v, d[i - w - 1] + D)
      if (x < w - 1) v = Math.min(v, d[i - w + 1] + D)
    }
    d[i] = v
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x
    if (!d[i]) continue
    let v = d[i]
    if (x < w - 1) v = Math.min(v, d[i + 1] + 1)
    if (y < h - 1) {
      v = Math.min(v, d[i + w] + 1)
      if (x < w - 1) v = Math.min(v, d[i + w + 1] + D)
      if (x > 0) v = Math.min(v, d[i + w - 1] + D)
    }
    d[i] = v
  }
  return d
}

function thin(bin, w, h) {
  const img = Uint8Array.from(bin)
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x])
  let changed = true
  while (changed) {
    changed = false
    for (const step of [0, 1]) {
      const kill = []
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!img[y * w + x]) continue
        const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)]
        const B = p.reduce((a, b) => a + b, 0)
        if (B < 2 || B > 6) continue
        let A = 0
        for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) A++
        if (A !== 1) continue
        if (step === 0 ? p[0] * p[2] * p[4] || p[2] * p[4] * p[6] : p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue
        kill.push(y * w + x)
      }
      for (const i of kill) img[i] = 0
      if (kill.length) changed = true
    }
  }
  return img
}

const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

/** Skeleton → list of pixel paths (graph edges, loops included). */
function trace(sk, w, h) {
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sk[y * w + x]
  // A diagonal step only counts when no straight neighbour already bridges it;
  // otherwise thinning's stair-steps read as junctions and split every curve.
  const nbrs = (x, y) =>
    N8.filter(([dx, dy]) => on(x + dx, y + dy) && !(dx && dy && (on(x + dx, y) || on(x, y + dy)))).map(([dx, dy]) => [x + dx, y + dy])
  const deg = (x, y) => nbrs(x, y).length
  const used = new Set()
  const key = (x, y, a, b) => (y * w + x) * 8 * w * h + (b * w + a)
  const ek = (p, q) => (p[1] * w + p[0] < q[1] * w + q[0] ? key(p[0], p[1], q[0], q[1]) : key(q[0], q[1], p[0], p[1]))
  const paths = []
  const walk = (start, next) => {
    const path = [start, next]
    used.add(ek(start, next))
    let prev = start
    let cur = next
    while (deg(cur[0], cur[1]) === 2) {
      const nx = nbrs(cur[0], cur[1]).find((q) => !(q[0] === prev[0] && q[1] === prev[1]) && !used.has(ek(cur, q)))
      if (!nx) break
      used.add(ek(cur, nx))
      path.push(nx)
      prev = cur
      cur = nx
    }
    return path
  }
  // From nodes (ends and junctions) first, then any pure loops left over.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y) || deg(x, y) === 2) continue
    for (const q of nbrs(x, y)) if (!used.has(ek([x, y], q))) paths.push(walk([x, y], q))
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue
    for (const q of nbrs(x, y)) if (!used.has(ek([x, y], q))) paths.push(walk([x, y], q))
  }
  const ends = (p) => [p[0], p.at(-1)].filter(([x, y]) => deg(x, y) === 1).length
  return paths.map((p) => Object.assign(p, { freeEnds: ends(p) }))
}

const plen = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0)

export async function buildHandwriting() {
  const font = loadFont(FONT)
  const { letters, width } = layoutText(font, WORD, WORK_PX, LETTER_SPACING)
  const strokes = []
  for (const [li, l] of letters.entries()) {
    if (!l.d) continue
    const xs = l.polys.flat().map((p) => p[0])
    const ys = l.polys.flat().map((p) => p[1])
    const x0 = Math.floor(Math.min(...xs)) - MARGIN
    const y0 = Math.floor(Math.min(...ys)) - MARGIN
    const w = Math.ceil(Math.max(...xs)) + MARGIN - x0
    const h = Math.ceil(Math.max(...ys)) + MARGIN - y0
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#000"/><path transform="translate(${-x0} ${-y0})" d="${l.d}" fill="#fff"/></svg>`
    const { data } = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer({ resolveWithObject: true })
    const bin = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) bin[i] = data[i] > 127 ? 1 : 0
    const dist = distanceTransform(bin, w, h)
    const sk = thin(bin, w, h)
    let paths = trace(sk, w, h)
    // Prune spurs: short edges ending free, no longer than the stroke is wide.
    const maxR = Math.max(...paths.flat().map(([x, y]) => dist[y * w + x]))
    // Spurs (one free end) go; isolated marks (the i's dot) and loops stay.
    paths = paths.filter((p) => p.freeEnds !== 1 || plen(p) > maxR * 1.2 || paths.length === 1)
    for (const p of paths) {
      // Pen direction: from the top end, or the left end for a mostly
      // level stroke — the way a hand moves through a letter.
      const a = p[0]
      const b = p.at(-1)
      const level = Math.abs(b[1] - a[1]) < Math.abs(b[0] - a[0]) * 0.6
      const flip = level ? b[0] < a[0] : b[1] < a[1]
      const q = flip ? p.slice().reverse() : p
      // Thin to every ~2px and keep the half-width.
      const pts = []
      let acc = 0
      for (let i = 0; i < q.length; i++) {
        if (i) acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1])
        if (i === 0 || i === q.length - 1 || acc >= 2) {
          const [x, y] = q[i]
          pts.push([+(x + x0).toFixed(1), +(y + y0).toFixed(1), +dist[y * w + x].toFixed(2)])
          acc = 0
        }
      }
      strokes.push({ letter: li, pts, length: plen(pts), minX: Math.min(...pts.map((p) => p[0])), minY: Math.min(...pts.map((p) => p[1])) })
    }
  }
  // Within a letter: begin at the stroke starting furthest up and left, then
  // keep taking whichever remaining stroke starts nearest where the pen is.
  const ordered = []
  for (const li of [...new Set(strokes.map((s) => s.letter))].sort((a, b) => a - b)) {
    const left = strokes.filter((s) => s.letter === li)
    let pen = null
    while (left.length) {
      let best = 0
      let bestCost = Infinity
      left.forEach((s, i) => {
        const [x, y] = s.pts[0]
        const cost = pen ? Math.hypot(x - pen[0], y - pen[1]) : x + y * 0.5
        if (cost < bestCost) { bestCost = cost; best = i }
      })
      const [s] = left.splice(best, 1)
      ordered.push(s)
      pen = s.pts.at(-1)
    }
  }
  strokes.splice(0, strokes.length, ...ordered)
  const top = Math.min(...letters.flatMap((l) => l.polys.flat().map((p) => p[1])))
  const bottom = Math.max(...letters.flatMap((l) => l.polys.flat().map((p) => p[1])))
  return {
    workPx: WORK_PX,
    width,
    top,
    bottom,
    letters: letters.map((l) => ({ ch: l.ch, d: l.d })),
    strokes: strokes.map(({ letter, pts, length }) => ({ letter, pts, length })),
  }
}

// Debug: the word, its centre lines, and the stroke order.
if (process.argv[1]?.endsWith('handwriting.mjs')) {
  const out = process.argv[2] ?? '.'
  const hw = await buildHandwriting()
  const pad = 20
  const W = Math.ceil(hw.width + pad * 2)
  const H = Math.ceil(hw.bottom - hw.top + pad * 2)
  const hue = (i) => `hsl(${(i * 47) % 360} 80% 45%)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff"/><g transform="translate(${pad} ${pad - hw.top})">${hw.letters.map((l) => `<path d="${l.d}" fill="#d9e3f5"/>`).join('')}${hw.strokes.map((s, i) => `<polyline fill="none" stroke="${hue(i)}" stroke-width="2.5" points="${s.pts.map((p) => p[0] + ',' + p[1]).join(' ')}"/><circle cx="${s.pts[0][0]}" cy="${s.pts[0][1]}" r="4" fill="${hue(i)}"/><text x="${s.pts[0][0] + 5}" y="${s.pts[0][1] - 5}" font-size="13" fill="#000">${i}</text>`).join('')}</g></svg>`
  await sharp(Buffer.from(svg)).png().toFile(`${out}/handwriting.png`)
  console.log(`${hw.strokes.length} strokes, width ${hw.width.toFixed(0)}`)
}
