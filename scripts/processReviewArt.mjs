/*
 * Prepares the Review hub's artwork into src/assets/images/review/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS928 Redesigned Review
 * Screen.png", in the gitignored Photos for Reference/), cropped and keyed the
 * same way `processLearnArt.mjs` and `processNewWordsArt.mjs` do:
 *
 *  - hero: Shifu with his hands together, the pagoda, the sakura branch and the
 *    mountain wash behind them. The crop starts right of the subtitle and the
 *    speech bubble, and ends where the stats card's top edge cuts him off —
 *    the screen puts the stats card over the same line.
 *  - card-flashcards / card-listening / card-mistakes: the scene on the left of
 *    each drill card, inside the card's border and left of its title. Keyed
 *    against the card's own near-white and feathered on the right, where the
 *    art fades into the text column.
 *  - foot: the misty range and trees along the bottom of the screen. The two
 *    buttons sit on top of it in the mockup, so the region under them is faded
 *    out rather than carried as a picture of buttons; the screen's own buttons
 *    cover the same area.
 *
 * "Keyed" means un-blended into real alpha: each pixel's distance from the
 * background colour becomes its opacity, and its colour is recovered by
 * dividing that background back out.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processReviewArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS928 Redesigned Review Screen.png')
const OUT = path.join('src', 'assets', 'images', 'review')
const EXPECTED = { width: 941, height: 1672 }

/** How far a channel must differ from the background before a pixel counts as paint. */
const KEY_RANGE = 70

/** Open page left of the speech bubble — the page cream. */
const PAGE = { x: 30, y: 330 }

/*
 * The card's own rounded border runs through the crop's left-hand corners, so
 * everything outside a rounded rectangle a few pixels inside it is dropped —
 * otherwise a sliver of the mockup's border is drawn inside the app's.
 */
const CARD_CLIP = { inset: 4, radius: 26 }

const PIECES = [
  {
    name: 'hero',
    /* Right of "learned." (x≈540) and the bubble's tail, below the streak pill
       (y≈100), down to the stats card's top border (y≈538). */
    box: { left: 542, top: 102, width: 399, height: 434 },
    sample: PAGE,
    feather: { left: 70, top: 40, right: 0, bottom: 0 },
  },
  {
    name: 'card-flashcards',
    /* Inside the border (x≈50, y≈770–977) and left of the title (x≈343). */
    box: { left: 51, top: 771, width: 290, height: 205 },
    sample: { x: 640, y: 800 },
    feather: { left: 0, top: 0, right: 70, bottom: 0 },
    clip: CARD_CLIP,
  },
  {
    name: 'card-listening',
    box: { left: 51, top: 998, width: 290, height: 205 },
    sample: { x: 640, y: 1030 },
    feather: { left: 0, top: 0, right: 70, bottom: 0 },
    clip: CARD_CLIP,
  },
  {
    name: 'card-mistakes',
    box: { left: 51, top: 1223, width: 290, height: 204 },
    sample: { x: 640, y: 1250 },
    feather: { left: 0, top: 0, right: 70, bottom: 0 },
    clip: CARD_CLIP,
  },
  {
    name: 'foot',
    box: { left: 0, top: 1440, width: 941, height: 232 },
    sample: PAGE,
    feather: { left: 0, top: 50, right: 0, bottom: 0 },
    /* Both buttons, as one rounded block in the crop's own coordinates, faded
       out over `ramp` pixels so no button edge or shadow survives as paint. */
    hole: { left: 100, top: 7, right: 841, bottom: 190, radius: 43, ramp: 26 },
  },
]

/** 0 inside the rounded rectangle, rising to 1 over `ramp` pixels outside it. */
function holeMask(hole, x, y) {
  const r = hole.radius
  const cx = Math.max(hole.left + r, Math.min(x, hole.right - r))
  const cy = Math.max(hole.top + r, Math.min(y, hole.bottom - r))
  const d = Math.hypot(x - cx, y - cy) - r
  return Math.max(0, Math.min(1, d / hole.ramp))
}

/** 1 inside a rounded rectangle `inset` pixels in from the left, top and bottom edges, 0 outside it. */
function clipMask(clip, width, height, x, y) {
  const r = clip.radius
  const cx = Math.max(clip.inset + r, x)
  const cy = Math.max(clip.inset + r, Math.min(y, height - 1 - clip.inset - r))
  const d = Math.hypot(x - cx, y - cy) - r
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
