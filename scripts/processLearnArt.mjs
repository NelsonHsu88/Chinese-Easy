/*
 * Prepares the Learn screen's artwork into src/assets/images/learn/.
 *
 * Source: the Beta 2.1 reference mockup itself ("NEW Learn Screen.png", in the
 * gitignored Photos for Reference/). The three card scenes and the header's
 * bamboo-and-mountains wash are cropped straight out of it, so the screen uses
 * exactly the art that was signed off rather than stand-ins.
 *
 * Two treatments:
 *  - Card scenes are cropped to the illustration half of each card and saved as
 *    JPEG. They are drawn with `cover` into a panel the card clips, so the crop
 *    only has to stay clear of the card's own border and shadow.
 *  - The header scenery sits on the mockup's cream page, which is a shade off
 *    the app's. It is "unblended" against that cream into real alpha, so it
 *    lands on any paper colour without a visible rectangle behind it.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels. Re-export the mockup at
 * another size and they have to move with it — the script refuses a source of
 * any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processLearnArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'NEW Learn Screen.png')
const OUT = path.join('src', 'assets', 'images', 'learn')
const EXPECTED = { width: 941, height: 1672 }

/** Illustration half of each card, inset a few px from the card's edge. */
const CARDS = {
  'new-words': { left: 58, top: 394, width: 372, height: 352 },
  books: { left: 58, top: 803, width: 372, height: 358 },
  'writing-basics': { left: 58, top: 1215, width: 372, height: 346 },
}

/**
 * Bamboo, sun and mountain wash in the top-right corner. Starts right of the
 * subtitle, which runs to x≈640 — any further left and the crop carries the
 * tail of "study today." with it.
 */
const SCENERY = { left: 655, top: 0, width: 286, height: 350 }
/** Px over which the left and bottom edges fade out, so the cut never shows as a line. */
const FEATHER = { left: 70, bottom: 60 }

/** How far a channel must differ from the page before a pixel counts as paint. */
const KEY_RANGE = 70

async function main() {
  const meta = await sharp(SRC).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} source, got ${meta.width}×${meta.height}`)
  }
  await mkdir(OUT, { recursive: true })

  for (const [name, box] of Object.entries(CARDS)) {
    const file = path.join(OUT, `${name}.jpg`)
    await sharp(SRC).extract(box).jpeg({ quality: 88, mozjpeg: true }).toFile(file)
    console.log('wrote', file)
  }

  // Sample the page colour from open paper left of the title.
  const { data: bgPx } = await sharp(SRC).extract({ left: 20, top: 20, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true })
  const bg = [bgPx[0], bgPx[1], bgPx[2]]

  const { data, info } = await sharp(SRC).extract(SCENERY).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const px = [data[i], data[i + 1], data[i + 2]]
    const diff = Math.max(...px.map((v, k) => Math.abs(v - bg[k])))
    const x = (i / 3) % info.width
    const y = Math.floor(i / 3 / info.width)
    const edge = Math.min(1, x / FEATHER.left) * Math.min(1, (info.height - 1 - y) / FEATHER.bottom)
    const keyed = Math.min(1, diff / KEY_RANGE)
    const alpha = keyed * edge
    for (let k = 0; k < 3; k++) {
      // Un-premultiply against the page so a faint stroke keeps its hue.
      const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
      out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
    }
    out[o + 3] = Math.round(alpha * 255)
  }
  const sceneryFile = path.join(OUT, 'header-scenery.png')
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(sceneryFile)
  console.log('wrote', sceneryFile, `(keyed against rgb(${bg.join(',')}))`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
