/*
 * Splits the flat app icon into the layers the launch intro animates.
 *
 * The icon is one flattened illustration, so there are no real layers to take
 * apart. It is, though, flat-shaded: every region is one of a handful of
 * colour families (robe blues, off-white cloth and hair, skin, the scroll's
 * tans, the dark eye lines) sitting on pure white. Each pixel is classed by
 * colour, then given to a layer by where it sits. Every pixel lands in exactly
 * one layer, so stacking all of them reproduces the icon exactly — which is
 * what lets the intro's last frame hand over to the real logo without a seam.
 *
 * What this cannot do is invent what's hidden: a layer has holes where
 * something sat in front of it. The choreography only ever moves layers
 * *into* their final place, so a hole is never uncovered on screen.
 *
 *   node scripts/launch/layers.mjs [debugDir]
 */
import sharp from 'sharp'

export const LAYERS = ['robe', 'garment', 'hand', 'scroll', 'beard', 'face', 'hair', 'ribbon']
const ICON = 'assets/images/icon.png'
const N = 1024

/** Polygon hit-test (even-odd) in icon pixels. */
function inside(poly, x, y) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/* Regions, traced from the icon at 1024px. Generous where a neighbour of a
   different colour family takes over anyway. */
const BEARD = [[160, 430], [225, 360], [470, 365], [525, 425], [505, 560], [478, 700], [446, 822], [402, 884], [326, 888], [268, 800], [210, 642], [165, 525]]
const BROWS = [[[335, 205], [425, 205], [425, 268], [335, 268]], [[462, 232], [572, 232], [572, 300], [462, 300]]]
const SCROLL = [[440, 640], [700, 590], [770, 700], [600, 850], [455, 830]]

function classify(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (b > r + 35 && b > 90) return 'blue'
  if (max < 120) return 'dark'
  if (r > g && g > b && r - b > 45) return 'warm'
  if (max - min < 40) return 'white'
  return 'other'
}

function layerOf(cls, r, g, b, x, y) {
  if (cls === 'blue') {
    const ribbon = (y < 470 && x > 560) || (x > 770 && y < 560) || (x > 875 && y < 705)
    return ribbon ? 'ribbon' : 'robe'
  }
  if (cls === 'dark') return y < 560 ? 'face' : inside(SCROLL, x, y) ? 'scroll' : 'robe'
  if (cls === 'warm') {
    if (inside(SCROLL, x, y) && (x > 520 || !(b > 140 && g < 200 && r > 235))) return 'scroll'
    return y < 560 ? 'face' : 'hand'
  }
  // Off-white and grey: hair, brows, beard or cloth.
  if (BROWS.some((p) => inside(p, x, y))) return 'face'
  if (y < 335 || (x > 590 && y < 560)) return 'hair'
  if (inside(BEARD, x, y)) return 'beard'
  if (y < 560 && x > 240 && x < 640) return 'face'
  return 'garment'
}

/**
 * Returns { width, height, layers: { name: Buffer (RGBA raw) }, bounds }.
 * `bounds[name]` is the layer's pixel bounding box, for pivots and sweeps.
 */
export async function splitIcon() {
  const { data, info } = await sharp(ICON).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  if (info.width !== N || info.height !== N) throw new Error(`expected a ${N}px icon`)

  // Background: near-white connected to the border. Interior whites survive.
  const bg = new Uint8Array(N * N)
  const stack = []
  const isBgish = (i) => data[i * 3] >= 247 && data[i * 3 + 1] >= 247 && data[i * 3 + 2] >= 247
  for (let k = 0; k < N; k++) for (const i of [k, (N - 1) * N + k, k * N, k * N + N - 1]) if (isBgish(i) && !bg[i]) { bg[i] = 1; stack.push(i) }
  while (stack.length) {
    const i = stack.pop()
    const x = i % N
    const y = (i / N) | 0
    for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1]) {
      if (j >= 0 && !bg[j] && isBgish(j)) { bg[j] = 1; stack.push(j) }
    }
  }

  const layers = Object.fromEntries(LAYERS.map((l) => [l, Buffer.alloc(N * N * 4)]))
  const bounds = Object.fromEntries(LAYERS.map((l) => [l, [N, N, 0, 0]]))
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x
      if (bg[i]) continue
      const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
      const l = layerOf(classify(r, g, b), r, g, b, x, y)
      const o = i * 4
      const buf = layers[l]
      buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255
      const bb = bounds[l]
      if (x < bb[0]) bb[0] = x
      if (y < bb[1]) bb[1] = y
      if (x > bb[2]) bb[2] = x
      if (y > bb[3]) bb[3] = y
    }
  }
  return { width: N, height: N, layers, bounds }
}

// Debug: each layer tinted, side by side with the icon.
if (process.argv[1]?.endsWith('layers.mjs')) {
  const out = process.argv[2] ?? '.'
  const { layers, bounds } = await splitIcon()
  const tint = { robe: [30, 90, 200], garment: [200, 200, 200], hand: [240, 150, 120], scroll: [200, 150, 60], beard: [120, 220, 120], face: [250, 120, 180], hair: [150, 120, 230], ribbon: [20, 200, 220] }
  const map = Buffer.alloc(N * N * 3, 255)
  for (const l of LAYERS) {
    const buf = layers[l]
    for (let i = 0; i < N * N; i++) if (buf[i * 4 + 3]) for (let c = 0; c < 3; c++) map[i * 3 + c] = tint[l][c]
    await sharp(buf, { raw: { width: N, height: N, channels: 4 } }).png().toFile(`${out}/layer-${l}.png`)
  }
  await sharp(map, { raw: { width: N, height: N, channels: 3 } }).resize(640).png().toFile(`${out}/layer-map.png`)
  console.log(bounds)
}
