import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

/**
 * Prepares the onboarding watercolour art for bundling.
 *
 * The source renders are already cut out — every one of them carries a real
 * alpha channel — so unlike `processBuildingAssets` / `extractSoftOverlay`
 * there is no keying to do here. What they need is the other three things:
 *
 *  - **A crop of the mountain panorama.** Its render came back with a row of
 *    stray sakura petals along the very top edge, left over from the prompt
 *    that produced it. On the pages that use it the panorama is anchored to
 *    the bottom of the screen, so those petals would float in mid-air halfway
 *    up the page with no branch attached to them.
 *  - **A trim.** Several renders have a wide transparent margin. That margin is
 *    invisible but not free: it is what the layout positions against, so a
 *    branch nudged into the corner ends up looking like it is floating an inch
 *    away from it, and every offset in the screen becomes a fudge factor for
 *    padding rather than a real measurement.
 *  - **A resize.** These are decoration behind text, and shipping a 905px
 *    panorama to draw it 430pt wide is a megabyte spent on pixels no one sees.
 *    Everything is emitted at 2x its largest on-screen size.
 *
 * Only one file is flipped here (the sakura for the left edge of the welcome
 * screen). The upper-right placements reuse the same file mirrored at render
 * time with `scaleX: -1`, since a second copy of a 450px PNG to save one
 * transform is a bad trade.
 *
 * Usage: node scripts/processOnboardingArt.mjs
 */

const SRC_DIR =
  'C:/Users/Nelson/Desktop/chinese-easy/Photos for Reference/ChatGPT Image/Chinese Easy Onboarding Decorative Assets'
const OUT_DIR = 'C:/Users/Nelson/Desktop/chinese-easy/src/assets/images/onboarding'

/**
 * `width` is 2x the largest size the asset is drawn at in the app, so it stays
 * sharp on a 3x phone without carrying a full-resolution render around.
 * `cropTop` is in source pixels, applied before the trim.
 */
const JOBS = [
  { src: 'sakura_branch_large.png', out: 'sakura-branch.png', width: 560 },
  { src: 'sakura_branch_small.png', out: 'sakura-sprig.png', width: 320 },
  { src: 'pagoda_mountains.png', out: 'pagoda-mountains.png', width: 460 },
  // 26px clears the petals with room to spare; the nearest mountain ridge does
  // not begin until well below it.
  { src: 'mountains_landscape.png', out: 'mountains-panorama.png', width: 880, cropTop: 26 },
  { src: 'cloud_01.png', out: 'cloud-a.png', width: 200 },
  { src: 'cloud_02.png', out: 'cloud-b.png', width: 200 },
  { src: 'cloud_03.png', out: 'cloud-c.png', width: 180 },
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
    const meta = await sharp(`${SRC_DIR}/${job.src}`).metadata()

    /*
     * The crop is baked to a buffer before anything else touches it. Two
     * `extract` calls in one sharp pipeline are not composed — the second is
     * measured against the original image, not the output of the first — so
     * chaining them silently asks for a region outside the crop.
     */
    const cropped = job.cropTop
      ? await sharp(`${SRC_DIR}/${job.src}`)
          .extract({ left: 0, top: job.cropTop, width: meta.width, height: meta.height - job.cropTop })
          .png()
          .toBuffer()
      : await sharp(`${SRC_DIR}/${job.src}`).png().toBuffer()

    const box = await contentBox(sharp(cropped))

    const outPath = `${OUT_DIR}/${job.out}`
    const info = await sharp(cropped)
      .extract(box)
      .resize({ width: job.width, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: false })
      .toFile(outPath)

    console.log(
      `${job.out.padEnd(24)} ${meta.width}x${meta.height} -> ${info.width}x${info.height}` +
        `  (${(info.size / 1024).toFixed(0)}kB)`,
    )
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
