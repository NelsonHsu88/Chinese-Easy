/**
 * Cuts a soft, edgeless overlay (mist, clouds, glow) out of a gradient backdrop.
 *
 * The flood-fill in processBuildingAssets.mjs can't do this: it needs a hard edge
 * to stop at, and a misty cloud fading into a smooth grey gradient has none — any
 * tolerance either keeps the whole backdrop or eats the whole cloud. Instead this
 * derives alpha from luminance: the subject is brighter than the backdrop, so each
 * pixel's opacity is how far above its row's background level it sits. Row-wise,
 * because the backdrop is a vertical gradient.
 *
 * Usage: node scripts/extractSoftOverlay.mjs <src.png> <dest.png> [targetWidth]
 */
import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'node:fs'

const [src, dest, widthArg] = process.argv.slice(2)
if (!src || !dest) {
  console.error('usage: node scripts/extractSoftOverlay.mjs <src.png> <dest.png> [targetWidth]')
  process.exit(1)
}
const TARGET_W = Number(widthArg ?? 768)

const png = PNG.sync.read(readFileSync(src))
const { width: w, height: h, data } = png

const luma = (o) => 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]

/**
 * How far a pixel sits from the backdrop, as an unsigned colour distance. Must be
 * unsigned: keying on brightness *above* the backdrop silently dropped the green
 * mountains, which are darker than the grey they sit on, leaving only pale haze
 * that then vanished against a cream page.
 */
const distance = (o, bgR, bgG, bgB) =>
  (Math.abs(data[o] - bgR) + Math.abs(data[o + 1] - bgG) + Math.abs(data[o + 2] - bgB)) / 3

// Background level per row, sampled from the outer columns. A row median doesn't
// work: across the middle of the image the subject covers more than half the row,
// so the median lands on the cloud and the backdrop never gets subtracted. The far
// left/right edges are always backdrop, so average those instead.
const EDGE = Math.max(2, Math.round(w * 0.03))
const rowBgR = new Float64Array(h)
const rowBgG = new Float64Array(h)
const rowBgB = new Float64Array(h)
for (let y = 0; y < h; y++) {
  let r = 0, g = 0, b = 0, n = 0
  for (let x = 0; x < EDGE; x++) {
    for (const o of [(y * w + x) * 4, (y * w + (w - 1 - x)) * 4]) {
      r += data[o]; g += data[o + 1]; b += data[o + 2]; n++
    }
  }
  rowBgR[y] = r / n
  rowBgG[y] = g / n
  rowBgB[y] = b / n
}

let maxLift = 1
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const d = distance((y * w + x) * 4, rowBgR[y], rowBgG[y], rowBgB[y])
    if (d > maxLift) maxLift = d
  }
}

// Anything within this much of the backdrop is treated as backdrop. Without it,
// sensor-ish noise across the whole frame lands just above zero alpha and the
// grey panel stays faintly visible.
const FLOOR = maxLift * 0.12

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4
    const lift = distance(o, rowBgR[y], rowBgG[y], rowBgB[y]) - FLOOR
    // Gamma < 1 lifts the mid-range so the mist stays readable once it's off the
    // dark backdrop it was drawn against.
    const a = Math.max(0, Math.min(1, lift / (maxLift - FLOOR))) ** 0.75
    data[o + 3] = Math.round(a * 255)
  }
}

// Crop to rows/cols carrying any meaningful alpha.
let minX = w, minY = h, maxX = -1, maxY = -1
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
const cw = maxX - minX + 1
const ch = maxY - minY + 1

const scale = Math.min(1, TARGET_W / cw)
const dw = Math.max(1, Math.round(cw * scale))
const dh = Math.max(1, Math.round(ch * scale))
const out = new PNG({ width: dw, height: dh })

for (let y = 0; y < dh; y++) {
  const y0 = Math.floor((y * ch) / dh) + minY
  const y1 = Math.min(minY + ch, Math.floor(((y + 1) * ch) / dh) + minY + 1)
  for (let x = 0; x < dw; x++) {
    const x0 = Math.floor((x * cw) / dw) + minX
    const x1 = Math.min(minX + cw, Math.floor(((x + 1) * cw) / dw) + minX + 1)
    let r = 0, g = 0, b = 0, a = 0, n = 0
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const o = (yy * w + xx) * 4
        r += data[o]; g += data[o + 1]; b += data[o + 2]; a += data[o + 3]; n++
      }
    }
    const o = (y * dw + x) * 4
    out.data[o] = Math.round(r / n)
    out.data[o + 1] = Math.round(g / n)
    out.data[o + 2] = Math.round(b / n)
    out.data[o + 3] = Math.round(a / n)
  }
}

const buf = PNG.sync.write(out, { deflateLevel: 9 })
writeFileSync(dest, buf)
console.log(`${dest}: ${w}x${h} -> crop ${cw}x${ch} -> ${dw}x${dh}  ${(buf.length / 1024).toFixed(0)}KB`)
