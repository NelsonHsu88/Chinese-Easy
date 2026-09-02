import sharp from 'sharp'
import { mkdirSync, readdirSync } from 'node:fs'

/**
 * Prepares the Review hub's drill icons for bundling.
 *
 * Same family as `processDashboardArt.mjs` and `processOnboardingArt.mjs` — the
 * renders carry a real alpha channel, so there is no keying to do — but the
 * shaping is different, and deliberately so.
 *
 * Each of these is a **painted disc**, dropped straight into the 58pt slot where
 * a tinted circle with a glyph in it used to be. So unlike the corner
 * decorations, these are not just trimmed: they are trimmed and then centred on
 * a square transparent canvas. Trimming alone leaves whatever asymmetric margin
 * the render happened to have, and a disc that is 4px off-centre inside a square
 * box reads as a circle sitting crooked in its row — which is exactly the kind
 * of fault that gets blamed on the stylesheet for a week. Square out means the
 * component can draw them at `width === height` and trust the result.
 *
 * **Sources are matched by their trailing `(N)`, not by name.** The exports are
 * called `ChatGPT Image <timestamp> (1..3).png`, which says nothing about what
 * is in them; the mapping below was established by eye and is recorded in
 * `MAPPING`. Re-exporting the set in a different order will silently swap the
 * icons, so check the pictures against the comments before re-running this.
 *
 * Sources live in the gitignored `Photos for Reference/`; the outputs are
 * committed, so a fresh clone builds without them.
 *
 * Usage: node scripts/processReviewIcons.mjs
 */

const ROOT = 'C:/Users/Nelson/Desktop/chinese-easy'
const SRC_DIR = `${ROOT}/Photos for Reference/ChatGPT Image/CHATGPT Review Assets`
const OUT_DIR = `${ROOT}/src/assets/images/review`

/**
 * Export index → drill, verified against the artwork itself:
 *
 * 1. Coral disc, flashcards on a ring showing 學, with a brush and a blossom.
 * 2. Green disc, a speaker with 听 in a speech bubble and sound waves.
 * 3. Periwinkle disc, an eraser rubbing out a red ✗ under an undo arrow.
 *
 * Each disc's colour already matches the `circle` in that drill's `revDrills`
 * entry, which is why these drop in where the tinted circle was rather than
 * needing the card repainted around them.
 */
const MAPPING = [
  { index: 1, out: 'flashcards.png' },
  { index: 2, out: 'listening.png' },
  { index: 3, out: 'mistakes.png' },
]

/**
 * Output edge, in pixels.
 *
 * The badge is drawn at `revCard.circle` = 58pt, so this is a shade over 3x —
 * crisp on every phone in the range without carrying a 1024px render for a 58pt
 * circle. Three of these ship in the bundle, so the size is not free.
 */
const EDGE = 192

/** Alpha at or below this is treated as empty when trimming. */
const TRIM_ALPHA = 6

/**
 * Bounding box of everything visible, so the trim is driven by the artwork
 * rather than by sharp's own `trim()` — which keys off a *colour* and gets
 * confused by soft edges that fade to transparent rather than to white.
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

/**
 * The one source file carrying `(n)` before its extension.
 *
 * Loud on both failure modes rather than picking one: no match means the export
 * is missing and the icon would silently keep its old artwork, and two matches
 * mean a duplicated download where guessing which is current is worse than
 * stopping.
 */
function sourceFor(index, files) {
  const matches = files.filter((name) => name.endsWith(`(${index}).png`))
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one source ending "(${index}).png" in ${SRC_DIR}, found ${matches.length}` +
        (matches.length ? `:\n  ${matches.join('\n  ')}` : ''),
    )
  }
  return matches[0]
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true })
  const files = readdirSync(SRC_DIR)

  for (const job of MAPPING) {
    const name = sourceFor(job.index, files)
    const source = `${SRC_DIR}/${name}`

    const meta = await sharp(source).metadata()
    if (!meta.hasAlpha) {
      throw new Error(`${name} has no alpha channel — it needs keying, not just a trim`)
    }

    const box = await contentBox(sharp(source))

    /*
     * `fit: 'contain'` on a square with a transparent background is what does
     * the centring: the trimmed disc is scaled to fit the longer edge and padded
     * evenly on the other, so the circle lands in the middle of the box no
     * matter how the render was framed.
     */
    const info = await sharp(source)
      .extract(box)
      .resize(EDGE, EDGE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, palette: false })
      .toFile(`${OUT_DIR}/${job.out}`)

    console.log(
      `${job.out.padEnd(18)} ${meta.width}x${meta.height} -> ${info.width}x${info.height}` +
        `  (${(info.size / 1024).toFixed(0)}kB)  from ${name}`,
    )
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
