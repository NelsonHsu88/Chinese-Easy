import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

/**
 * Prepares the Dashboard's watercolour art for bundling.
 *
 * Same job, and the same three steps, as `processOnboardingArt.mjs`: these
 * renders already carry a real alpha channel, so there is no keying to do —
 * what they need is a trim and a resize.
 *
 * The trim is the part that matters. Every one of these sits in a *corner* of
 * a card, positioned against `right: 0` / `bottom: 0`, and a render's invisible
 * transparent margin is what that offset is actually measured from. Ship them
 * untrimmed and the fire floats an inch off the card's edge while the bonsai
 * sits flush, for reasons nothing in the stylesheet explains. Trimmed, `right:
 * 0` means the artwork's own edge.
 *
 * Sources live in the gitignored `Photos for Reference/`; the outputs are
 * committed, so a fresh clone builds without them.
 *
 * Usage: node scripts/processDashboardArt.mjs
 */

const ROOT = 'C:/Users/Nelson/Desktop/chinese-easy'
const SRC_DIR = `${ROOT}/Photos for Reference/ChatGPT Image`
const OUT_DIR = `${ROOT}/src/assets/images/dashboard`

/**
 * `width` is 2x the largest size the asset is drawn at on screen — sharp on a
 * 3x phone without carrying a 1.5k-pixel render around for a 120pt decoration.
 */
const JOBS = [
  // The bowing Shifu, right-centre of the hero. Drawn ~165pt tall; this render
  // is portrait, so the width that produces is around 230.
  { src: 'SHIFU Derivates/Shifu 01 - Greeting Bow.png', out: 'shifu-bow.png', width: 300 },
  // Lower-right of the Start Review card. Drawn ~140pt wide.
  { src: 'Dashboard Assets/Fire.png', out: 'fire.png', width: 300 },
  // Lower-right of the Learn a new word card. The widest of the four at ~215pt.
  { src: 'Dashboard Assets/Mountains.png', out: 'word-mountains.png', width: 440 },
  // Lower-right of the Daily Challenges card. Drawn ~115pt wide.
  { src: 'Dashboard Assets/Scroll.png', out: 'scroll.png', width: 250 },
  // Lower-right of the This Week card. Drawn ~135pt wide.
  { src: 'Dashboard Assets/Banzi Tree.png', out: 'bonsai.png', width: 290 },
]

/** Alpha at or below this is treated as empty when trimming. */
const TRIM_ALPHA = 6

/**
 * Bounding box of everything visible, so the trim is driven by the artwork
 * rather than by sharp's own `trim()` — which keys off a *colour* and gets
 * confused by watercolour edges that fade to transparent rather than to white.
 */
async function contentBox(image) {
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let top = height
  let left = width
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] <= TRIM_ALPHA) continue
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }

  if (bottom < 0) throw new Error('image is entirely transparent')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true })

  for (const job of JOBS) {
    const source = `${SRC_DIR}/${job.src}`
    const meta = await sharp(source).metadata()
    if (!meta.hasAlpha) throw new Error(`${job.src} has no alpha channel — it needs keying, not just a trim`)

    const box = await contentBox(sharp(source))

    const info = await sharp(source)
      .extract(box)
      .resize({ width: job.width, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: false })
      .toFile(`${OUT_DIR}/${job.out}`)

    console.log(
      `${job.out.padEnd(20)} ${meta.width}x${meta.height} -> ${info.width}x${info.height}` +
        `  (${(info.size / 1024).toFixed(0)}kB)`,
    )
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
