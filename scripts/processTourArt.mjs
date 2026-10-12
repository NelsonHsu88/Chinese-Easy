import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

/**
 * Cuts the guided tour's watercolour out of its Beta 2.1 asset sheet
 * (`SS107 Tour UI Redesign.png`) into `src/assets/images/tour/`.
 *
 * Unlike the screen mockups the other `process*Art` scripts read, this sheet
 * already carries real alpha — every illustration on it sits on transparency,
 * with its file-name caption drawn underneath as separate text. So there is no
 * keying: each job names a search box that holds one illustration and none of
 * its caption, the box is trimmed to what is actually painted inside it, and
 * the result is written out as-is.
 *
 * The trim matters for the usual reason (see `processDashboardArt.mjs`): Shifu
 * is positioned against the tooltip's own edges, and an untrimmed margin is
 * what those offsets would otherwise be measuring.
 *
 * The sheet is small — each Shifu is under 200px — so nothing is enlarged;
 * the tour draws him at 56–84pt, where that is enough.
 *
 * Sources live in the gitignored `Photos for Reference/`; the output is
 * committed, so a fresh clone builds without them.
 *
 * Usage: node scripts/processTourArt.mjs
 */

const ROOT = 'C:/Users/Nelson/Desktop/chinese-easy'
const SOURCE = `${ROOT}/Photos for Reference/Beta 2.1 Photos/SS107 Tour UI Redesign.png`
const OUT_DIR = `${ROOT}/src/assets/images/tour`

/** The sheet's own pixel size. Boxes below are in these pixels. */
const SHEET = { width: 1536, height: 1024 }

/**
 * One illustration each. A box must hold the whole painting and stop above its
 * caption, which starts ~270px down on the Shifu row.
 */
const JOBS = [
  { out: 'shifu-welcome.png', box: { left: 18, top: 58, width: 212, height: 213 } },
  { out: 'shifu-point.png', box: { left: 232, top: 58, width: 216, height: 213 } },
  { out: 'shifu-celebrate.png', box: { left: 448, top: 52, width: 170, height: 221 } },
  { out: 'shifu-thinking.png', box: { left: 626, top: 64, width: 160, height: 210 } },
  // The small sakura branch the tooltips carry in one corner.
  { out: 'corner-sakura.png', box: { left: 732, top: 756, width: 150, height: 104 } },
]

/**
 * Alpha at or below this is treated as empty when trimming. Above the sheet's
 * own faint glow round each figure (alpha ~15 in the gap before a caption),
 * which is invisible on cream and would otherwise set the trim.
 */
const TRIM_ALPHA = 20

async function contentBox(buffer, width, height) {
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (buffer[(y * width + x) * 4 + 3] <= TRIM_ALPHA) continue
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
  if (bottom < 0) throw new Error('box is entirely transparent')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

async function run() {
  const meta = await sharp(SOURCE).metadata()
  if (meta.width !== SHEET.width || meta.height !== SHEET.height) {
    throw new Error(`expected a ${SHEET.width}×${SHEET.height} sheet, got ${meta.width}×${meta.height}`)
  }
  if (!meta.hasAlpha) throw new Error('the sheet has no alpha channel — it needs keying, not cropping')

  mkdirSync(OUT_DIR, { recursive: true })

  for (const job of JOBS) {
    const { data, info } = await sharp(SOURCE)
      .extract(job.box)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const inner = await contentBox(data, info.width, info.height)
    /*
     * Anything painted right up to the search box's edge means the box cut the
     * illustration short. Fail rather than ship a Shifu missing an elbow.
     */
    if (inner.left === 0 || inner.top === 0 || inner.left + inner.width === info.width || inner.top + inner.height === info.height) {
      throw new Error(`${job.out}: painting touches the edge of its box — widen the box`)
    }

    const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract(inner)
      .png({ compressionLevel: 9 })
      .toFile(`${OUT_DIR}/${job.out}`)
    console.log(`${job.out}: ${out.width}×${out.height}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
