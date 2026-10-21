/*
 * Cuts the jumping Shifu out of the "Great job!" painting as a transparent
 * layer for the completion celebration (src/assets/images/celebration/).
 *
 * The figure sits on pale watercolour paper. Inside a hand-traced outline
 * (which leaves out the mountains, trees, sparkle marks and the ground
 * shadow), each pixel's opacity is how far it is from the paper: paper goes
 * clear, the robe, skin and line work stay solid. His white beard, hair and
 * trousers are close to paper colour, so an inner outline holds them fully
 * opaque. What paper does survive at the edges is the same ivory as the
 * screen behind it, so it never reads as a halo.
 *
 *   node scripts/celebration/cutout.mjs [debugDir]
 */
import sharp from 'sharp'

const SRC = 'scripts/celebration/great-job-reference.webp'
const OUT = 'src/assets/images/celebration/shifu-jump.png'
const OX = 120
const OY = 290

function inPoly(poly, x, y) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
const shift = (pts) => pts.map(([x, y]) => [x + OX, y + OY])

/* Traced on the reference, in a crop from (120,290). */
const OUTER = shift([
  [98, 12], [122, 40], [146, 96], [152, 128], [188, 146], [196, 200], [200, 236],
  [226, 210], [236, 182], [262, 132], [300, 100], [356, 86], [384, 64], [416, 50], [470, 56], [500, 88], [504, 126],
  [552, 146], [560, 178], [608, 240], [600, 256], [556, 252], [520, 258], [500, 296], [548, 300],
  [586, 286], [624, 302], [630, 342], [612, 368], [612, 400], [644, 456], [672, 498], [694, 542], [688, 558], [656, 560],
  [622, 572], [622, 616], [586, 620], [552, 648], [516, 668], [446, 680], [448, 724], [408, 754],
  [380, 760], [382, 832], [312, 840], [312, 790], [262, 770], [202, 724], [130, 700], [104, 650],
  [104, 560], [54, 470], [24, 400], [20, 336], [58, 290], [108, 262], [150, 240], [124, 140], [92, 50],
])
/** Dilate (grow) or erode a binary mask by a disc of radius r. */
function morph(m, w, h, r, grow) {
  const out = new Uint8Array(w * h)
  const offs = []
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) offs.push([dx, dy])
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = grow ? 0 : 1
    for (const [dx, dy] of offs) {
      const X = x + dx, Y = y + dy
      const s = X < 0 || Y < 0 || X >= w || Y >= h ? 0 : m[Y * w + X]
      if (grow && s) { v = 1; break }
      if (!grow && !s) { v = 0; break }
    }
    out[y * w + x] = v
  }
  return out
}

function largestComponent(m, w, h) {
  const label = new Int32Array(w * h)
  let best = 0, bestSize = 0, n = 0
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || label[i]) continue
    n++
    let size = 0
    const st = [i]
    label[i] = n
    while (st.length) {
      const k = st.pop()
      size++
      const x = k % w, y = (k / w) | 0
      for (const j of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (j >= 0 && m[j] && !label[j]) { label[j] = n; st.push(j) }
      }
    }
    if (size > bestSize) { bestSize = size; best = n }
  }
  const out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) out[i] = label[i] === best ? 1 : 0
  return out
}

export async function cutout() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  // The paper: the median of a thin band just outside the outline, all round —
  // the colour actually surrounding the figure.
  const samples = []
  for (let y = OY - 10; y < OY + 870; y += 2) for (let x = OX - 10; x < OX + 730; x += 2) {
    if (inPoly(OUTER, x, y)) continue
    let near = false
    for (const [dx, dy] of [[14, 0], [-14, 0], [0, 14], [0, -14]]) if (inPoly(OUTER, x + dx, y + dy)) near = true
    if (near) samples.push([0, 1, 2].map((c) => data[(y * W + x) * 3 + c]))
  }
  const lum = (s) => s[0] + s[1] + s[2]
  samples.sort((a, b) => lum(a) - lum(b))
  // The brighter half: the band also crosses mountains and petals.
  const top = samples.slice(samples.length >> 1)
  const paper = [0, 1, 2].map((c) => top.map((s) => s[c]).sort((a, b) => a - b)[top.length >> 1])

  const x0 = OX, y0 = OY, w = 720, h = 860
  const alpha = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = x + x0, Y = y + y0
    if (!inPoly(OUTER, X, Y)) continue
    const i = (Y * W + X) * 3
    const dev = Math.max(Math.abs(data[i] - paper[0]), Math.abs(data[i + 1] - paper[1]), Math.abs(data[i + 2] - paper[2]))
    alpha[y * w + x] = Math.max(0, Math.min(1, (dev - 7) / 26))
  }
  // A solid silhouette: what is clearly figure, gaps closed, every enclosed
  // area filled — so cream linings, beard and hair inside his outline are
  // opaque however close to paper they are — then eased back to the edge.
  const solid = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) solid[i] = alpha[i] > 0.4 ? 1 : 0
  const R = 6
  const grown = morph(solid, w, h, R, true)
  const outside = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (!grown[y * w + x]) { outside[y * w + x] = 1; stack.push(y * w + x) }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (!grown[y * w + x] && !outside[y * w + x]) { outside[y * w + x] = 1; stack.push(y * w + x) }
  while (stack.length) {
    const i = stack.pop()
    const x = i % w, y = (i / w) | 0
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && !outside[j] && !grown[j]) { outside[j] = 1; stack.push(j) }
    }
  }
  const filled = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) filled[i] = outside[i] ? 0 : 1
  const silhouette = morph(filled, w, h, R, false)
  // Only the largest piece is Shifu; specks and stray scenery go.
  const keepPiece = largestComponent(silhouette, w, h)
  const near = morph(keepPiece, w, h, 2, true)
  for (let i = 0; i < w * h; i++) alpha[i] = near[i] ? (keepPiece[i] ? 1 : alpha[i]) : 0

  // Soften the edge: a 3×3 box.
  const soft = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let s = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += alpha[(y + dy) * w + x + dx]
    soft[y * w + x] = s / 9
  }
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y + y0) * W + x + x0) * 3
    const o = (y * w + x) * 4
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]
    out[o + 3] = Math.round(soft[y * w + x] * 255)
  }
  return { buf: out, w, h, paper }
}

if (process.argv[1]?.endsWith('cutout.mjs')) {
  const dbg = process.argv[2]
  const { buf, w, h, paper } = await cutout()
  const { mkdirSync } = await import('node:fs')
  mkdirSync('src/assets/images/celebration', { recursive: true })
  // Trim to the figure and save at 1x of the source (≈ 3x at its on-screen size).
  const png = sharp(buf, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).png({ compressionLevel: 9, palette: true, quality: 96, effort: 10 })
  const info = await png.toFile(OUT)
  console.log(`wrote ${OUT} ${info.width}×${info.height}, paper rgb(${paper})`)
  if (dbg) {
    for (const [name, bg] of [['dark', '#30343c'], ['ivory', '#FAF9F6']]) {
      const flat = await sharp({ create: { width: w, height: h, channels: 3, background: bg } }).composite([{ input: buf, raw: { width: w, height: h, channels: 4 } }]).png().toBuffer()
      await sharp(flat).resize(Math.round(w / 1.6)).png().toFile(`${dbg}/cut-${name}.png`)
    }
  }
}
