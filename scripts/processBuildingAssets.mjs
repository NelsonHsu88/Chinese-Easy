import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC_DIR = 'C:/Users/Nelson/Desktop/chinese-easy/Photos for Reference/ChatGPT Image/ChatGPT Assets'
const OUT_DIR = 'C:/Users/Nelson/Desktop/chinese-easy/src/assets/images/buildings'

// asset number -> building id in src/data/townBuildings.ts
const MAP = {
  1: 'noodle-shop',
  2: 'tea-house',
  3: 'lantern-street',
  4: 'garden-pavilion',
  5: 'market-square',
  6: 'riverside-walk',
  7: 'temple',
  8: 'buddhist-statue',
  9: 'mountain-pagoda',
  10: 'grand-palace',
}

const TARGET = 384 // longest edge of the output sprite
// Per-step local colour tolerance for the flood fill. Needs to be loose enough to
// walk the backdrop's gradient but tight enough not to leak into pale parts of the
// subject — override with TOL=n for art with near-white areas touching the backdrop.
const TOL = Number(process.env.TOL ?? 10)

function srcName(n) {
  return `ChatGPT Image Jul 31, 2026, 04_31_23 AM (${n}).png`
}

/**
 * Region-grow from the image border. Because the backdrop is a smooth gradient we
 * compare each pixel to the neighbour we arrived from (not to a fixed seed colour),
 * so the fill follows the gradient and halts at the subject's hard edge.
 */
function backgroundMask(png) {
  const { width: w, height: h, data } = png
  const bg = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let qh = 0
  let qt = 0

  const at = (i) => {
    const o = i * 4
    return [data[o], data[o + 1], data[o + 2]]
  }

  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = y * w + x
      if (!bg[i]) { bg[i] = 1; queue[qt++] = i }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const i = y * w + x
      if (!bg[i]) { bg[i] = 1; queue[qt++] = i }
    }
  }

  while (qh < qt) {
    const i = queue[qh++]
    const x = i % w
    const y = (i / w) | 0
    const [r, g, b] = at(i)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const ni = ny * w + nx
      if (bg[ni]) continue
      const [nr, ng, nb] = at(ni)
      if (Math.abs(nr - r) + Math.abs(ng - g) + Math.abs(nb - b) <= TOL) {
        bg[ni] = 1
        queue[qt++] = ni
      }
    }
  }
  return bg
}

/** Box-filter downscale of an RGBA buffer, premultiplying so transparent pixels don't bleed dark edges. */
function resize(src, sw, sh, dw, dh) {
  const out = new PNG({ width: dw, height: dh })
  const sx = sw / dw
  const sy = sh / dh
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.min(sh, Math.ceil((y + 1) * sy))
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.min(sw, Math.ceil((x + 1) * sx))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const o = (yy * sw + xx) * 4
          const al = src[o + 3] / 255
          r += src[o] * al
          g += src[o + 1] * al
          b += src[o + 2] * al
          a += src[o + 3]
          n++
        }
      }
      const o = (y * dw + x) * 4
      const aa = a / n
      const norm = aa > 0 ? n * (aa / 255) : 1
      out.data[o] = Math.round(r / norm)
      out.data[o + 1] = Math.round(g / norm)
      out.data[o + 2] = Math.round(b / norm)
      out.data[o + 3] = Math.round(aa)
    }
  }
  return out
}

mkdirSync(OUT_DIR, { recursive: true })

// `node scripts/processBuildingAssets.mjs <srcPath> <destPath>` runs the same
// cutout over a one-off image (used for the Shifu mascot); with no args it
// regenerates every town building sprite.
const [argA, argB] = process.argv.slice(2)
const jobs = argB
  ? [{ src: argA, out: argB, label: argB }]
  : (argA ? [Number(argA)] : Object.keys(MAP).map(Number)).map((n) => ({
      src: join(SRC_DIR, srcName(n)),
      out: join(OUT_DIR, `${MAP[n]}.png`),
      label: MAP[n],
    }))

for (const job of jobs) {
  const png = PNG.sync.read(readFileSync(job.src))
  const { width: w, height: h, data } = png
  const bg = backgroundMask(png)

  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (bg[i]) {
        data[i * 4 + 3] = 0
      } else {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const cropped = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    data.copy(cropped, y * cw * 4, ((y + minY) * w + minX) * 4, ((y + minY) * w + minX + cw) * 4)
  }

  const scale = TARGET / Math.max(cw, ch)
  const dw = Math.max(1, Math.round(cw * scale))
  const dh = Math.max(1, Math.round(ch * scale))
  const out = resize(cropped, cw, ch, dw, dh)

  const buf = PNG.sync.write(out, { deflateLevel: 9 })
  writeFileSync(job.out, buf)
  const kept = (100 * (1 - bg.reduce((s, v) => s + v, 0) / (w * h))).toFixed(1)
  console.log(`${job.label}: ${w}x${h} -> crop ${cw}x${ch} -> ${dw}x${dh}  subject=${kept}%  ${(buf.length / 1024).toFixed(0)}KB`)
}
