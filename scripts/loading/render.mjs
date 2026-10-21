/*
 * Renders the "Shifu writing" loading loop.
 *
 *   node scripts/loading/render.mjs                         full render → src/assets/video/loading-shifu.mp4 (+ still)
 *   node scripts/loading/render.mjs --sheet 0,0.2,… --out d  contact sheet of loop phases (0..1)
 *
 * One loop is LOOP_S long and ends exactly where it began, so the player can
 * repeat it for as long as loading takes:
 *
 *   0.00–0.12  the brush, held just above the paper, comes down to it
 *   0.12–0.56  one calligraphy stroke: pressed in, eased across with a turn of
 *              the wrist, pressed again and released; ink appears under the tip
 *   0.56–0.66  the brush lifts
 *   0.66–0.80  a pause; Shifu settles back, pleased
 *   0.78–1.00  the hand returns, raised, to the start while the scroll advances
 *              and carries the fresh ink down toward the roller
 *
 * Under that, on the same period: a breath, a faint nod, the hair ribbon
 * swaying with follow-through, the sleeve following the hand, and two petals
 * drifting through (each invisible at the loop seam).
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { cpus, tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { buildPlate, IW, IH, TIP, WRIST, KNOT, NECK, CUFF, PAPER, inPoly } from './plate.mjs'

export const LOOP_S = 3.2
const FPS = 60
const OUT_W = 810
const OUT_H = 1080
const OUT = 'src/assets/video/loading-shifu.mp4'
const STILL = 'src/assets/images/loading/shifu-writing-still.jpg'
const LOOP_TS = 'src/components/loading/loop.ts'
/** The loading screen's page colour; the video's edges fade into it. */
export const PAGE = [250, 249, 246] // #FAF9F6

// ── Easing ──────────────────────────────────────────────────────────────────
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const span = (t, a, b) => clamp01((t - a) / (b - a))
const smooth = (v) => v * v * (3 - 2 * v)
const ease = (v) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2) // in-out cubic
const lerp = (a, b, u) => a + (b - a) * u

// ── The writing hand ────────────────────────────────────────────────────────
const LIFT = -15 // px the brush rises off the paper
const STROKE_LEN = 50 // how far the tip travels along the stroke
const ADVANCE = 66 // how far the scroll moves the ink per loop

/**
 * Hand pose at loop phase u: translation, wrist rotation (degrees) and brush
 * pressure (0 = in the air).
 */
function handPose(u) {
  // Lowering to the paper.
  if (u < 0.12) {
    const v = ease(span(u, 0, 0.12))
    const start = handPose(0.12)
    return { dx: lerp(0, start.dx, v), dy: lerp(LIFT, start.dy, v), rot: lerp(-2, start.rot, v), p: 0 }
  }
  // The stroke. The tip's path is what's designed — a level stroke with a
  // gentle wave, like the painting's own — and the hand is solved from it
  // and the wrist's turn, so the ink lands exactly under the brush.
  if (u < 0.56) {
    const v = span(u, 0.12, 0.56)
    const travel = ease(v)
    const tx = STROKE_LEN * travel
    const ty = 6 * Math.sin(Math.PI * 2 * travel * 0.9 - 0.3) * (1 - 0.3 * travel) + 4 * travel + 1.8
    const rot = lerp(3, -3.5, smooth(v))
    const [rx, ry] = applyPose({ dx: 0, dy: 0, rot }, TIP)
    // Press in, lighten through the middle, press again, release.
    const p = v < 0.08 ? lerp(0.5, 0.82, smooth(v / 0.08)) : v < 0.5 ? lerp(0.82, 0.42, smooth((v - 0.08) / 0.42)) : v < 0.84 ? lerp(0.42, 0.78, smooth((v - 0.5) / 0.34)) : lerp(0.78, 0, smooth((v - 0.84) / 0.16))
    return { dx: TIP[0] + tx - rx, dy: TIP[1] + ty - ry, rot, p }
  }
  // Lift at the end of the stroke.
  if (u < 0.66) {
    const v = ease(span(u, 0.56, 0.66))
    const end = handPose(0.5599)
    return { dx: end.dx + 3 * v, dy: lerp(end.dy, LIFT, v), rot: lerp(end.rot, -2, v), p: 0 }
  }
  // Pause, then the raised hand drifts back to the start.
  const back = ease(span(u, 0.8, 1))
  const lifted = handPose(0.6599)
  return { dx: lerp(lifted.dx, 0, back), dy: LIFT - 2 * Math.sin(Math.PI * span(u, 0.66, 0.8)), rot: -2, p: 0 }
}

function applyPose(pose, [x, y]) {
  const a = (pose.rot * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a)
  const rx = x - WRIST[0], ry = y - WRIST[1]
  return [WRIST[0] + rx * c - ry * s + pose.dx, WRIST[1] + rx * s + ry * c + pose.dy]
}

/** The stroke this loop writes: tip positions and widths along the way. */
function strokeSamples() {
  const pts = []
  for (let u = 0.12; u <= 0.56; u += 0.0006) {
    const pose = handPose(u)
    if (pose.p <= 0.02) continue
    const [x, y] = applyPose(pose, TIP)
    pts.push({ u, x, y, w: 2.5 + 14 * pose.p ** 1.4, p: pose.p })
  }
  return pts
}

/** The scroll's progress at phase u (0 → 1 over the advance). */
const advanceAt = (u) => ease(span(u, 0.78, 1))

// ── Living details ──────────────────────────────────────────────────────────
const TAU = Math.PI * 2
function lifeAt(u) {
  return {
    breath: 1.7 * (0.5 - 0.5 * Math.cos(TAU * u)), // px at the shoulders
    nod: 0.35 * Math.sin(TAU * u + 0.6) - 0.9 * Math.sin(Math.PI * span(u, 0.64, 0.86)) ** 2, // degrees
    ribbon: 2.2 * Math.sin(TAU * u), // degrees at the tips
    ribbonLag: 2.2 * Math.sin(TAU * u - 0.9),
  }
}

// ── Frame ───────────────────────────────────────────────────────────────────
function bilinear(img, ch, x, y, c) {
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x > IW - 1.001) x = IW - 1.001
  if (y > IH - 1.001) y = IH - 1.001
  const x0 = x | 0, y0 = y | 0
  const fx = x - x0, fy = y - y0
  const i = (y0 * IW + x0) * ch + c
  return (img[i] * (1 - fx) + img[i + ch] * fx) * (1 - fy) + (img[i + IW * ch] * (1 - fx) + img[i + IW * ch + ch] * fx) * fy
}

export function renderFrame(u, P) {
  const { plate, handRGBA, stroke, petal } = P
  const out = new Float32Array(IW * IH * 3)
  const pose = handPose(u)
  const life = lifeAt(u)

  // 1. The plate through the displacement fields (inverse-mapped, first order).
  const cuffTo = applyPose(pose, CUFF)
  const cuffD = [cuffTo[0] - CUFF[0], cuffTo[1] - CUFF[1]]
  const nod = (life.nod * Math.PI) / 180
  for (let y = 0; y < IH; y++) {
    for (let x = 0; x < IW; x++) {
      let dx = 0, dy = 0
      if (y < 990) {
        // Breath: the upper body rises a touch, nothing below the desk moves.
        const body = smooth(clamp01((y - 300) / 120)) * smooth(clamp01((975 - y) / 260)) * smooth(clamp01(1 - Math.abs(x - 560) / 330))
        dy -= life.breath * body
        // Head: a faint turn about the neck.
        const hr = Math.hypot(x - 560, y - 560)
        if (hr < 330 && y < 780) {
          const wgt = smooth(clamp01((330 - hr) / 90)) * smooth(clamp01((780 - y) / 60))
          const rx = x - NECK[0], ry = y - NECK[1]
          dx += wgt * (rx * Math.cos(nod) - ry * Math.sin(nod) - rx)
          dy += wgt * (rx * Math.sin(nod) + ry * Math.cos(nod) - ry)
        }
        // Ribbon: sways about its knot, the tails lagging behind the bow.
        if (x > 690 && x < 920 && y > 395 && y < 650) {
          const d = Math.hypot(x - KNOT[0], y - KNOT[1])
          const wgt = smooth(clamp01(d / 170)) * smooth(clamp01((920 - x) / 40)) * smooth(clamp01((650 - y) / 40)) * smooth(clamp01((x - 690) / 30))
          const ang = (lerp(life.ribbon, life.ribbonLag, clamp01((y - 470) / 140)) * Math.PI) / 180
          const rx = x - KNOT[0], ry = y - KNOT[1]
          dx += wgt * (rx * Math.cos(ang) - ry * Math.sin(ang) - rx)
          dy += wgt * (rx * Math.sin(ang) + ry * Math.cos(ang) - ry)
        }
        // Sleeve: the forearm goes with the hand, fading back toward the
        // shoulder; bounded by the arm's outline, feathered, so nothing
        // beside it (beard, robe front) is dragged along.
        const arm = P.armMask[y * IW + x]
        if (arm > 0) {
          const dc = Math.hypot(x - CUFF[0], y - CUFF[1])
          // Full at the cuff, gone by the elbow — which, like a real elbow, stays put.
          const wgt = arm * smooth(clamp01((215 - dc) / 150)) * smooth(clamp01((x - 205) / 90))
          dx += wgt * cuffD[0]
          dy += wgt * cuffD[1]
        }
      }
      const o = (y * IW + x) * 3
      if (dx === 0 && dy === 0) {
        out[o] = plate[o]; out[o + 1] = plate[o + 1]; out[o + 2] = plate[o + 2]
      } else {
        for (let c = 0; c < 3; c++) out[o + c] = bilinear(plate, 3, x - dx, y - dy, c)
      }
    }
  }

  // 2. Ink: this loop's stroke so far, plus earlier loops' carried down the scroll.
  const ink = new Float32Array(IW * IH)
  const adv = advanceAt(u) * ADVANCE
  const drawn = stroke.filter((s) => s.u <= u)
  const passes = [{ pts: drawn, off: adv }]
  for (let k = 1; k <= 3; k++) passes.push({ pts: stroke, off: adv + k * ADVANCE })
  for (const { pts, off } of passes) {
    for (let i = 0; i < pts.length; i++) {
      const s = pts[i]
      const cy = s.y + off
      const r = s.w / 2
      // Direction of travel, for the bristle streaks across the stroke.
      const a0 = pts[Math.max(0, i - 3)], a1 = pts[Math.min(pts.length - 1, i + 3)]
      let nx = -(a1.y - a0.y), ny = a1.x - a0.x
      const nl = Math.hypot(nx, ny) || 1
      nx /= nl; ny /= nl
      // The brush runs dry as the stroke goes on, most where it lightens.
      const along = pts.length > 1 ? i / (pts.length - 1) : 0
      const dryness = smooth(clamp01((along - 0.55) / 0.45)) * (0.35 + 0.65 * (1 - s.p))
      for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) {
        for (let x = Math.floor(s.x - r - 2); x <= Math.ceil(s.x + r + 2); x++) {
          if (x < 0 || y < 0 || x >= IW || y >= IH) continue
          const d = Math.hypot(x - s.x, y - cy)
          // Solid body, with a faint wet bloom just outside it.
          let a = clamp01(r + 0.5 - d) + 0.16 * clamp01(r + 2 - d) * (1 - clamp01(r + 0.5 - d))
          if (!a) continue
          if (dryness > 0) {
            const across = ((x - s.x) * nx + (y - cy) * ny) / Math.max(r, 1) // −1..1
            const hair = BRISTLE_GAPS[Math.max(0, Math.min(BRISTLE_GAPS.length - 1, Math.round((across + 1) * 0.5 * (BRISTLE_GAPS.length - 1))))]
            a *= 1 - dryness * hair
          }
          const j = y * IW + x
          if (a > ink[j]) ink[j] = a
        }
      }
    }
  }
  for (let y = 980; y < 1215; y++) {
    for (let x = 260; x < 840; x++) {
      const j = y * IW + x
      if (!ink[j] || !inPoly(PAPER, x, y)) continue
      // Ink fades as the paper rolls toward the bottom roller.
      const a = ink[j] * 0.93 * (1 - smooth(clamp01((y - 1150) / 50)))
      const o = j * 3
      out[o] = out[o] * (1 - a) + 34 * a
      out[o + 1] = out[o + 1] * (1 - a) + 31 * a
      out[o + 2] = out[o + 2] * (1 - a) + 32 * a
    }
  }

  // 3. The hand and brush, rigidly placed (inverse-mapped from the pose).
  const a = (pose.rot * Math.PI) / 180
  const ca = Math.cos(a), sa = Math.sin(a)
  for (let y = 680; y < 1060; y++) {
    for (let x = 270; x < 580; x++) {
      const qx = x - WRIST[0] - pose.dx, qy = y - WRIST[1] - pose.dy
      const sx = WRIST[0] + qx * ca + qy * sa
      const sy = WRIST[1] - qx * sa + qy * ca
      if (sx < 1 || sy < 1 || sx > IW - 2 || sy > IH - 2) continue
      const al = bilinear(handRGBA, 4, sx, sy, 3)
      if (al <= 0.001) continue
      const o = (y * IW + x) * 3
      // The layer is premultiplied, so its sampled colour is already × alpha.
      for (let c = 0; c < 3; c++) out[o + c] = out[o + c] * (1 - al) + bilinear(handRGBA, 4, sx, sy, c)
    }
  }

  // 4. Two petals drifting through, invisible at the loop seam.
  for (const pt of PETAL_PATHS) {
    const v = span(u, pt.t0, pt.t1)
    if (v <= 0 || v >= 1) continue
    const px = lerp(pt.from[0], pt.to[0], v) + pt.sway * Math.sin(TAU * v * 1.3)
    const py = lerp(pt.from[1], pt.to[1], v) + 0.25 * pt.sway * Math.sin(TAU * v * 2)
    const alpha = smooth(span(v, 0, 0.18)) * smooth(span(1 - v, 0, 0.22))
    const ang = pt.spin * v
    const cA = Math.cos(ang), sA = Math.sin(ang)
    const R = Math.ceil(Math.hypot(petal.w, petal.h) / 2) + 1
    for (let y = Math.floor(py - R); y <= py + R; y++) for (let x = Math.floor(px - R); x <= px + R; x++) {
      if (x < 0 || y < 0 || x >= IW || y >= IH) continue
      const rx = x - px, ry = y - py
      const sx = rx * cA + ry * sA + petal.w / 2
      const sy = -rx * sA + ry * cA + petal.h / 2
      if (sx < 0 || sy < 0 || sx >= petal.w - 1 || sy >= petal.h - 1) continue
      const x0 = sx | 0, y0 = sy | 0
      const k = (y0 * petal.w + x0) * 4
      const al = (petal.data[k + 3] / 255) * alpha * pt.scale
      if (al <= 0) continue
      const o = (y * IW + x) * 3
      for (let c = 0; c < 3; c++) out[o + c] = out[o + c] * (1 - al) + petal.data[k + c] * al
    }
  }

  // 5. Edges fade into the page.
  const F = 46
  for (let y = 0; y < IH; y++) {
    const ey = Math.min(y, IH - 1 - y)
    for (let x = 0; x < IW; x++) {
      const e = Math.min(ey, x, IW - 1 - x)
      if (e >= F) continue
      const k = 1 - smooth(e / F)
      const o = (y * IW + x) * 3
      for (let c = 0; c < 3; c++) out[o + c] = out[o + c] * (1 - k) + PAGE[c] * k
    }
  }
  return out
}

/** Where the dry brush's hairs leave gaps, across the stroke (fixed, so every frame agrees). */
const BRISTLE_GAPS = Array.from({ length: 23 }, (_, k) => {
  const n = Math.sin(k * 91.7 + 13.1) * 43758.5453
  return Math.max(0, (n - Math.floor(n)) * 1.6 - 0.45)
})

const PETAL_PATHS = [
  { t0: 0.04, t1: 0.92, from: [1010, 250], to: [800, 640], sway: 26, spin: 2.6, scale: 1 },
  { t0: 0.38, t1: 0.98, from: [250, 520], to: [70, 860], sway: 18, spin: -2.1, scale: 0.85 },
]

async function loadParts() {
  const { plate, handRGBA } = await buildPlate()
  // A petal from the painting itself, keyed out of the ivory by its pinkness.
  const box = { left: 902, top: 400, width: 44, height: 50 }
  const { data } = await sharp('scripts/loading/shifu-writing.webp').removeAlpha().extract(box).raw().toBuffer({ resolveWithObject: true })
  const pet = Buffer.alloc(box.width * box.height * 4)
  for (let i = 0; i < box.width * box.height; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
    const pink = clamp01((r - g - 12) / 40) * clamp01((255 - g) / 40)
    pet[i * 4] = r; pet[i * 4 + 1] = g; pet[i * 4 + 2] = b; pet[i * 4 + 3] = Math.round(pink * 255)
  }
  // The writing arm's sleeve, feathered over ~28px.
  const ARM = [[40, 852], [200, 776], [310, 744], [420, 776], [460, 860], [466, 962], [300, 972], [60, 980]]
  const armMask = new Float32Array(IW * IH)
  for (let y = 680; y < 1040; y++) for (let x = 0; x < 520; x++) {
    if (!inPoly(ARM, x, y)) continue
    let edge = 28
    for (let k = 0; k < ARM.length; k++) {
      const [ax, ay] = ARM[k], [bx, by] = ARM[(k + 1) % ARM.length]
      const vx = bx - ax, vy = by - ay
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
      edge = Math.min(edge, Math.hypot(x - ax - t * vx, y - ay - t * vy))
    }
    armMask[y * IW + x] = smooth(edge / 28)
  }
  return { plate, handRGBA, armMask, stroke: strokeSamples(), petal: { data: pet, w: box.width, h: box.height } }
}

async function toPng(frame) {
  return sharp(Buffer.from(Uint8ClampedArray.from(frame)), { raw: { width: IW, height: IH, channels: 3 } })
    .resize(OUT_W, OUT_H, { kernel: 'lanczos3' })
    .png({ compressionLevel: 1 })
}

if (!isMainThread) {
  const { frames, dir, P } = workerData
  for (const f of frames) {
    await (await toPng(renderFrame(f / (LOOP_S * FPS), P))).toFile(join(dir, `f${String(f).padStart(4, '0')}.png`))
    parentPort.postMessage(1)
  }
  process.exit(0)
}

const args = process.argv.slice(2)
const flag = (n) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : undefined)
const P = await loadParts()

if (flag('--sheet')) {
  const phases = flag('--sheet').split(',').map(Number)
  const out = flag('--out') ?? '.'
  const cell = 360
  const cellH = Math.round((cell * OUT_H) / OUT_W)
  const crop = flag('--crop') // x,y,w,h in source px
  const tiles = []
  for (const ph of phases) {
    let img = sharp(Buffer.from(Uint8ClampedArray.from(renderFrame(ph, P))), { raw: { width: IW, height: IH, channels: 3 } })
    if (crop) {
      const [x, y, w, h] = crop.split(',').map(Number)
      img = img.extract({ left: x, top: y, width: w, height: h })
    }
    const png = await img.resize(cell, cellH, { fit: 'contain', background: '#888' }).png().toBuffer()
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="26"><text x="6" y="20" font-size="18" font-family="sans-serif" fill="#c00">${ph.toFixed(2)}</text></svg>`)
    tiles.push(await sharp(png).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer())
  }
  const cols = Math.min(phases.length, 5)
  const rows = Math.ceil(phases.length / cols)
  await sharp({ create: { width: cols * cell, height: rows * cellH, channels: 3, background: '#888' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cell, top: Math.floor(i / cols) * cellH })))
    .png()
    .toFile(join(out, 'loading-sheet.png'))
  console.log('sheet written')
  process.exit(0)
}

// Full render.
const total = Math.round(LOOP_S * FPS) // frame `total` would equal frame 0: the loop is open-ended
const dir = join(tmpdir(), 'loading-shifu-frames')
if (existsSync(dir)) rmSync(dir, { recursive: true })
mkdirSync(dir, { recursive: true })
const nWorkers = Math.max(1, Math.min(cpus().length - 1, 8))
let done = 0
const started = Date.now()
await Promise.all(
  Array.from({ length: nWorkers }, (_, w) => {
    const frames = []
    for (let f = w; f < total; f += nWorkers) frames.push(f)
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { frames, dir, P } })
      worker.on('message', () => {
        if (++done % 32 === 0) console.log(`${done}/${total} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`)
      })
      worker.on('error', reject)
      worker.on('exit', (code) => (code ? reject(new Error(`worker exit ${code}`)) : resolve()))
    })
  }),
)
mkdirSync('src/assets/video', { recursive: true })
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-i', join(dir, 'f%04d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  // Every frame a keyframe-friendly GOP of one loop, so the seam decodes cleanly.
  '-g', String(total), '-movflags', '+faststart', '-an', OUT,
], { stdio: 'inherit' })
// The still: the loop's first frame exactly, so it can sit under the video
// until playback starts (no change when it does), and stand alone for
// reduced motion — brush raised, earlier strokes on the page.
mkdirSync('src/assets/images/loading', { recursive: true })
await sharp(Buffer.from(Uint8ClampedArray.from(renderFrame(0, P))), { raw: { width: IW, height: IH, channels: 3 } })
  .resize(OUT_W, OUT_H, { kernel: 'lanczos3' })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(STILL)
mkdirSync('src/components/loading', { recursive: true })
writeFileSync(
  LOOP_TS,
  `/*
 * GENERATED by scripts/loading/render.mjs — don't edit by hand.
 * The "Shifu writing" loop's shape, for the app to time its exit by.
 */
export const SHIFU_LOOP = {
  durationMs: ${Math.round(LOOP_S * 1000)},
  /** The video's pixel size (its aspect is what the screen fits). */
  width: ${OUT_W},
  height: ${OUT_H},
  /** The brush is on the paper between these loop phases (0..1). */
  brushDown: [0.12, 0.56],
  /** Edge colour the frames fade into: the loading page must match it. */
  page: '#${PAGE.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}',
} as const
`,
)
console.log(`wrote ${OUT} (${(readFileSync(OUT).length / 1024).toFixed(0)} KB), ${STILL} and ${LOOP_TS} in ${((Date.now() - started) / 1000).toFixed(0)}s`)
