/*
 * Prepares the Challenges screen's artwork into src/assets/images/challenges/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS 929 Redesigned
 * Challenges.png", in the gitignored Photos for Reference/), cropped and keyed
 * the same way `processReviewArt.mjs` does:
 *
 *  (The hero painting is not made here. The reference's has Shifu in it, and
 *   he was taken off this screen — it borrows the Profile screen's hero, which
 *   is the same scene without him; see `processProfileArt.mjs`.)
 *  - card-words / card-writing / card-listening / card-review: the scene on
 *    the left of each challenge card, inside the card's border and left of its
 *    title, keyed against the card's own near-white.
 *  - gift: the present on the left of the Completion Reward card.
 *  - reward-corner: the sakura and pagoda at the right of that card, inside its
 *    border. The mockup's "+50" pill sits on top of the hill, so the pill is
 *    faded out of it as a soft hole.
 *
 * "Keyed" means un-blended into real alpha: each pixel's distance from the
 * background colour becomes its opacity, and its colour is recovered by
 * dividing that background back out. The page and card colours in
 * `components/challenges/tokens.ts` are the ones sampled here — change either
 * and re-run this, or the paintings grow a halo.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processChallengesArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS 929 Redesigned Challenges.png')
const OUT = path.join('src', 'assets', 'images', 'challenges')
const EXPECTED = { width: 941, height: 1672 }

/** How far a channel must differ from the background before a pixel counts as paint. */
const KEY_RANGE = 70

/*
 * Each card's own rounded border runs through the crop's corners on the side
 * it touches, so everything outside a rounded rectangle a few pixels inside it
 * is dropped — otherwise a sliver of the mockup's border is drawn inside the
 * app's.
 */
const CARD_LEFT = { inset: 3, radius: 24, side: 'left' }

const CARD_FEATHER = { left: 0, top: 0, right: 44, bottom: 0 }

const PIECES = [
  { name: 'card-words', box: { left: 54, top: 709, width: 200, height: 125 }, sample: { x: 600, y: 712 } },
  { name: 'card-writing', box: { left: 54, top: 852, width: 200, height: 127 }, sample: { x: 600, y: 856 } },
  { name: 'card-listening', box: { left: 54, top: 997, width: 200, height: 128 }, sample: { x: 600, y: 1000 } },
  { name: 'card-review', box: { left: 54, top: 1143, width: 200, height: 128 }, sample: { x: 600, y: 1146 } },
  {
    name: 'gift',
    box: { left: 56, top: 1350, width: 208, height: 134 },
    sample: { x: 600, y: 1356 },
  },
  {
    name: 'reward-corner',
    /* Inside the card's right border (x≈889) and its top and bottom
       (y≈1348–1487). */
    box: { left: 690, top: 1350, width: 197, height: 135 },
    sample: { x: 600, y: 1356 },
    feather: { left: 50, top: 0, right: 0, bottom: 0 },
    clip: { inset: 2, radius: 24, side: 'right' },
    /* The "+50" pill, x 692–820 / y 1386–1446. */
    hole: { left: -4, top: 34, right: 132, bottom: 98, radius: 30, ramp: 14 },
  },
].map((piece) => ({
  feather: CARD_FEATHER,
  clip: piece.name.startsWith('card-') || piece.name === 'gift' ? CARD_LEFT : undefined,
  ...piece,
}))

/** 0 inside the rounded rectangle, rising to 1 over `ramp` pixels outside it. */
function holeMask(hole, x, y) {
  const r = hole.radius
  const cx = Math.max(hole.left + r, Math.min(x, hole.right - r))
  const cy = Math.max(hole.top + r, Math.min(y, hole.bottom - r))
  const d = Math.hypot(x - cx, y - cy) - r
  return Math.max(0, Math.min(1, d / hole.ramp))
}

/**
 * 1 inside a rounded rectangle `inset` pixels in from the top and bottom edges
 * and from the given side, 0 outside it. The opposite side is left open.
 */
function clipMask(clip, width, height, x, y) {
  const r = clip.radius
  const fx = clip.side === 'left' ? x : width - 1 - x
  const cx = Math.max(clip.inset + r, fx)
  const cy = Math.max(clip.inset + r, Math.min(y, height - 1 - clip.inset - r))
  const d = Math.hypot(fx - cx, y - cy) - r
  return Math.max(0, Math.min(1, -d / 1.5))
}

async function main() {
  const meta = await sharp(SRC).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} source, got ${meta.width}×${meta.height}`)
  }
  await mkdir(OUT, { recursive: true })

  for (const piece of PIECES) {
    const { data: bgPx } = await sharp(SRC)
      .extract({ left: piece.sample.x, top: piece.sample.y, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const bg = [bgPx[0], bgPx[1], bgPx[2]]

    const { data, info } = await sharp(SRC).extract(piece.box).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.alloc(info.width * info.height * 4)
    const f = piece.feather
    for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
      const x = (i / 3) % info.width
      const y = Math.floor(i / 3 / info.width)
      const edge =
        (f.left ? Math.min(1, x / f.left) : 1) *
        (f.top ? Math.min(1, y / f.top) : 1) *
        (f.right ? Math.min(1, (info.width - 1 - x) / f.right) : 1) *
        (f.bottom ? Math.min(1, (info.height - 1 - y) / f.bottom) : 1) *
        (piece.hole ? holeMask(piece.hole, x, y) : 1) *
        (piece.clip ? clipMask(piece.clip, info.width, info.height, x, y) : 1)
      const px = [data[i], data[i + 1], data[i + 2]]
      const keyed = Math.min(1, Math.max(...px.map((v, k) => Math.abs(v - bg[k]))) / KEY_RANGE)
      for (let k = 0; k < 3; k++) {
        const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[o + 3] = Math.round(keyed * edge * 255)
    }
    const file = path.join(OUT, `${piece.name}.png`)
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(file)
    console.log('wrote', file, `(${info.width}×${info.height}, keyed against rgb(${bg.join(',')}))`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
