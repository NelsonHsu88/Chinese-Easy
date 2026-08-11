import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

/**
 * Cuts the lesson-path unit badges out of their ChatGPT renders.
 *
 * These can't be cut the way the other art was. Neither existing script works:
 * a border flood fill (processBuildingAssets) has nowhere to stop, because the
 * badge's glow fades continuously into the backdrop; and luminance keying
 * (extractSoftOverlay) tears holes in the badge, because the embossed symbol on
 * its face is *darker* (v~130) than the glow just outside the disc (v~171).
 *
 * What is reliable is the bright ring: it's the only thing above v~210, and it's
 * a circle. So we find it geometrically — scan inward along rays from outside
 * the badge, take the first bright hit on each ray, and least-squares fit a
 * circle to those hits. Scanning inward matters: some badges have white symbols
 * on the face (the tea cup, the gift bow) that are just as bright as the ring,
 * and coming from outside means we always meet the ring first.
 *
 * The fit circle is also the crop: we cut at the ring's outer edge and discard
 * the dark 3D rim beyond it, which leaves a clean disc — green face, bright ring
 * border — that drops straight into the circular path node.
 *
 * Usage: node scripts/processUnitIcons.mjs
 */

const SRC_DIR = 'C:/Users/Nelson/Desktop/chinese-easy/Photos for Reference/ChatGPT Image'
const OUT_DIR = 'C:/Users/Nelson/Desktop/chinese-easy/src/assets/images/units'

// Source render -> unit id in src/data/units.ts. The renders came out in unit
// order, with one spare: there is both a gift and a music note for pop-culture.
// The gift is used because it matches the unit's existing glyph and the design
// mock; `pop-culture-music` is built too so it can be swapped in by changing one
// require in Lessons.tsx.
const MAP = [
  ['ChatGPT Image Jul 31, 2026, 02_46_03 PM.png', 'the-basics'],
  ['ChatGPT Image Jul 31, 2026, 02_45_52 PM (1).png', 'basic-food'],
  ['ChatGPT Image Jul 31, 2026, 02_45_52 PM (2).png', 'friendship'],
  ['ChatGPT Image Jul 31, 2026, 02_45_53 PM (3).png', 'travel'],
  ['ChatGPT Image Jul 31, 2026, 02_45_53 PM (4).png', 'electronics'],
  ['ChatGPT Image Jul 31, 2026, 02_45_53 PM (5).png', 'lifestyle'],
  ['ChatGPT Image Jul 31, 2026, 02_45_53 PM (6).png', 'beauty'],
  ['ChatGPT Image Jul 31, 2026, 02_45_54 PM (7).png', 'pop-culture'],
  ['ChatGPT Image Jul 31, 2026, 02_45_54 PM (8).png', 'pop-culture-music'],
]

const OUT_SIZE = 320 // node renders at ~104pt, so this covers 3x screens
const RAYS = 720
const RING_MIN = 0.24 // ray search window, as a fraction of image width...
const RING_MAX = 0.49 // ...starting outside any symbol on the badge face
const BRIGHT = 210 // ring sits at 240+, glow never exceeds ~191
const FEATHER = 1.5 // px of alpha falloff at the cut, to avoid a jagged edge

mkdirSync(OUT_DIR, { recursive: true })

/** Least-squares circle through points (Kåsa fit). */
function fitCircle(pts) {
  let sx = 0
  let sy = 0
  let sxx = 0
  let syy = 0
  let sxy = 0
  let sxz = 0
  let syz = 0
  let sz = 0
  const n = pts.length
  for (const [x, y] of pts) {
    const z = x * x + y * y
    sx += x
    sy += y
    sxx += x * x
    syy += y * y
    sxy += x * y
    sxz += x * z
    syz += y * z
    sz += z
  }
  // Solve the 3x3 normal equations for (A,B,C) in x^2+y^2 = A*x + B*y + C.
  const m = [
    [sxx, sxy, sx, sxz],
    [sxy, syy, sy, syz],
    [sx, sy, n, sz],
  ]
  for (let i = 0; i < 3; i++) {
    let p = i
    for (let r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[p][i])) p = r
    ;[m[i], m[p]] = [m[p], m[i]]
    for (let r = 0; r < 3; r++) {
      if (r === i) continue
      const f = m[r][i] / m[i][i]
      for (let c = i; c < 4; c++) m[r][c] -= f * m[i][c]
    }
  }
  const A = m[0][3] / m[0][0]
  const B = m[1][3] / m[1][1]
  const C = m[2][3] / m[2][2]
  const cx = A / 2
  const cy = B / 2
  return { cx, cy, r: Math.sqrt(C + cx * cx + cy * cy) }
}

function findDisc(data, W, H) {
  const v = (x, y) => {
    const o = ((y | 0) * W + (x | 0)) * 4
    return Math.max(data[o], data[o + 1], data[o + 2])
  }

  let cx = W / 2
  let cy = H / 2
  let fit = null

  // Two passes: the first fit recentres the rays, the second sharpens it.
  for (let pass = 0; pass < 2; pass++) {
    const pts = []
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2
      const dx = Math.cos(a)
      const dy = Math.sin(a)
      let hit = -1
      for (let r = RING_MAX * W; r >= RING_MIN * W; r -= 0.5) {
        const x = cx + dx * r
        const y = cy + dy * r
        if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) continue
        if (v(x, y) >= BRIGHT) {
          hit = r
          break
        }
      }
      if (hit > 0) pts.push([cx + dx * hit, cy + dy * hit])
    }
    if (pts.length < 32) throw new Error(`only ${pts.length} ring points found`)

    fit = fitCircle(pts)

    // Drop rays that missed the ring (the extruded 3D lip at the bottom is the
    // usual culprit) and refit without them.
    const kept = pts.filter(([x, y]) => {
      const d = Math.hypot(x - fit.cx, y - fit.cy)
      return Math.abs(d - fit.r) < fit.r * 0.04
    })
    if (kept.length >= 32) fit = fitCircle(kept)

    cx = fit.cx
    cy = fit.cy

    if (pass === 1) {
      // The badges aren't perfectly circular — the 3D extrusion stretches them
      // slightly — so the averaged fit radius pokes past the ring on some rays
      // and picks up the dark rim as a crescent. Cutting at a low percentile of
      // the measured radii keeps the mask inside the ring the whole way round,
      // trading a sliver of ring for no dark fringe anywhere.
      const radii = kept.map(([x, y]) => Math.hypot(x - cx, y - cy)).sort((a, b) => a - b)
      fit.r = radii[Math.floor(radii.length * 0.2)] * 0.995
    }
  }

  return fit
}

let total = 0
for (const [file, id] of MAP) {
  const src = PNG.sync.read(readFileSync(`${SRC_DIR}/${file}`))
  const { width: W, height: H } = src
  const data = src.data

  const { cx, cy, r } = findDisc(data, W, H)

  const out = new PNG({ width: OUT_SIZE, height: OUT_SIZE })
  const scale = (2 * r) / OUT_SIZE // source px per output px
  const outR = OUT_SIZE / 2

  for (let oy = 0; oy < OUT_SIZE; oy++) {
    for (let ox = 0; ox < OUT_SIZE; ox++) {
      // Box-average the source pixels behind this output pixel.
      const sx0 = cx - r + ox * scale
      const sy0 = cy - r + oy * scale
      let rr = 0
      let gg = 0
      let bb = 0
      let n = 0
      for (let j = 0; j < scale; j++) {
        for (let i = 0; i < scale; i++) {
          const sx = Math.round(sx0 + i)
          const sy = Math.round(sy0 + j)
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue
          const s = (sy * W + sx) * 4
          rr += data[s]
          gg += data[s + 1]
          bb += data[s + 2]
          n++
        }
      }
      if (!n) continue

      // Circular matte, feathered so the rim isn't stair-stepped.
      const d = Math.hypot(ox + 0.5 - outR, oy + 0.5 - outR)
      const alpha = Math.max(0, Math.min(1, (outR - d) / FEATHER))

      const o = (oy * OUT_SIZE + ox) * 4
      out.data[o] = Math.round(rr / n)
      out.data[o + 1] = Math.round(gg / n)
      out.data[o + 2] = Math.round(bb / n)
      out.data[o + 3] = Math.round(alpha * 255)
    }
  }

  const dest = `${OUT_DIR}/${id}.png`
  writeFileSync(dest, PNG.sync.write(out))
  const size = readFileSync(dest).length
  total += size
  console.log(
    `${id.padEnd(18)} centre ${cx.toFixed(0)},${cy.toFixed(0)} r=${r.toFixed(0)} -> ${OUT_SIZE}px, ${(size / 1024).toFixed(0)}KB`,
  )
}
console.log(`\n${MAP.length} icons, ${(total / 1024).toFixed(0)}KB total -> ${OUT_DIR}`)
