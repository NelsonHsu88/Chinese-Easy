import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

/**
 * Prepares the subscription screen's artwork for bundling.
 *
 * Only one asset, because the rest of that screen is already in the app: the
 * bowing Shifu of the subscribed state is `dashboard/shifu-bow.png`, the
 * backdrop is onboarding's pagoda range mirrored, the branch is onboarding's
 * sakura, and the scenery along the foot is onboarding's mountain panorama.
 * Shipping second copies of four watercolours to put them on one more screen
 * would be several megabytes for nothing.
 *
 * The trim is the same job as `processDashboardArt.mjs` does and matters for
 * the same reason: Shifu is positioned against the hero's own edges, and an
 * untrimmed render's transparent margin is what those offsets would actually be
 * measuring. Trimmed, `bottom: 0` means the hem of his robe.
 *
 * Sources live in the gitignored `Photos for Reference/`; the output is
 * committed, so a fresh clone builds without them.
 *
 * Usage: node scripts/processSubscriptionArt.mjs
 */

const ROOT = 'C:/Users/Nelson/Desktop/chinese-easy'
const SRC_DIR = `${ROOT}/Photos for Reference/ChatGPT Image`
const OUT_DIR = `${ROOT}/src/assets/images/subscription`

/**
 * `width` is 2x the largest size the asset is drawn at, which is sharp on a 3x
 * phone without carrying a 1.2k-pixel render around for a 190pt illustration.
 */
const JOBS = [
  // The welcoming, thumbs-up Shifu of the purchase screen's hero. Drawn ~200pt
  // tall; the trimmed render is close to square, so that is ~200pt wide too.
  { src: 'SHIFU Derivates/Shifu 03 - Thumbs Up.png', out: 'shifu-thumbs-up.png', width: 400 },
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
      `${job.out.padEnd(22)} ${meta.width}x${meta.height} -> ${info.width}x${info.height}` +
        `  (${(info.size / 1024).toFixed(0)}kB)  ratio ${(info.width / info.height).toFixed(3)}`,
    )
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
