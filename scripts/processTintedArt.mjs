/*
 * Copies of card art that sit on a *tinted* card (the SS1017 "playful" redesign:
 * jade, blossom, sky and honey cards instead of one cream one).
 *
 * The originals were keyed against near-white cream, so most carry an opaque
 * paper rectangle behind the painting. On a cream card that rectangle is
 * invisible; on a pale pink card it shows as a box. This runs GIMP-style
 * colour-to-alpha against white on each one: paper becomes transparent in
 * proportion to how white it is, so the painting keeps its exact look and the
 * card's tint shows through wherever the paper was — the same result as a
 * multiply blend, baked in, so it works on every platform (no `mixBlendMode`).
 *
 * Reads only committed assets (so it runs on a fresh clone) and writes
 * `src/assets/images/tinted/<folder>-<name>.png`. Add a source to SOURCES and
 * re-run; follow with `node scripts/compressImages.mjs`.
 *
 *   node scripts/processTintedArt.mjs
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..', 'src', 'assets', 'images')
const OUT = join(ROOT, 'tinted')

const SOURCES = [
  'learn/new-words.png',
  'learn/books.png',
  'learn/writing-basics.png',
  'review/card-flashcards.png',
  'review/card-listening.png',
  'review/card-mistakes.png',
  'basics/pronunciation.png',
  'basics/characters.png',
  'basics/writing.png',
  'basics/sentences.png',
  'basics/continue.png',
  'challenges/card-listening.png',
  'challenges/card-review.png',
  'challenges/card-words.png',
  'challenges/card-writing.png',
  'home/review.png',
  'home/word-range.png',
  'new-words/card-scenery.png',
  'listening/card.png',
  'my-words/bamboo.png',
  'my-words/blossom.png',
  'profile/card-mountains.png',
]

/** Below this whiteness a pixel is left fully opaque — ink and colour are never thinned. */
const FLOOR = 0.04

/**
 * Only paper *connected to the image's edge* is keyed. A flood fill from the
 * border through pale pixels (darkness under REACH) finds the background; a
 * painted tile or sheet inside the scene — the 字 card, the 人 page — is ringed
 * by its own drawn edge, so it stays opaque cream as in the reference. The mask
 * is blurred by FEATHER px so the keyed and kept areas meet without a seam.
 */
const REACH = 62
const FEATHER = 3

function backgroundMask(data, w, h) {
  const mask = new Uint8Array(w * h)
  // Judged as the pixel looks over white: the originals store paper as warm
  // cream at low alpha, which is pale on screen however dark its raw colour.
  const pale = (p) => {
    const i = p * 4, k = data[i + 3] / 255
    return Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) * k < REACH
  }
  const stack = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const p = stack.pop()
    if (mask[p] || !pale(p)) continue
    mask[p] = 255
    const x = p % w, y = (p / w) | 0
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - w)
    if (y < h - 1) stack.push(p + w)
  }
  return mask
}

mkdirSync(OUT, { recursive: true })
for (const rel of SOURCES) {
  const { data, info } = await sharp(join(ROOT, rel)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const hard = backgroundMask(data, info.width, info.height)
  const soft = await sharp(Buffer.from(hard), { raw: { width: info.width, height: info.height, channels: 1 } })
    .blur(FEATHER).raw().toBuffer()
  for (let i = 0; i < data.length; i += 4) {
    const a0 = data[i + 3] / 255
    if (a0 === 0) continue
    const m = soft[i / 4] / 255
    if (m === 0) continue
    // The pixel as it shows over white, then colour-to-alpha against white:
    // the least alpha that reproduces that look.
    const w = [0, 1, 2].map((k) => 255 - (255 - data[i + k]) * a0)
    let a = Math.max(...w.map((c) => 255 - c)) / 255
    if (a < FLOOR) a = 0
    // Fade from keyed (inside the mask) back to the original where it ends.
    const alpha = m * a + (1 - m) * a0
    if (alpha <= 0) { data[i + 3] = 0; continue }
    for (let k = 0; k < 3; k++) {
      const keyed = a > 0 ? 255 - (255 - w[k]) / a : 255
      const c = (m * a * keyed + (1 - m) * a0 * data[i + k]) / alpha
      data[i + k] = Math.max(0, Math.min(255, Math.round(c)))
    }
    data[i + 3] = Math.round(alpha * 255)
  }
  const name = rel.replace('/', '-')
  await sharp(data, { raw: info }).png().toFile(join(OUT, name))
  console.log('tinted/' + name, `${info.width}x${info.height}`)
}
