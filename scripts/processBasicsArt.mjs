/*
 * Prepares the Chinese Basics hub's artwork into src/assets/images/basics/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS 1014 Writing Basic UI
 * redesign.png", in the gitignored Photos for Reference/), cropped and keyed
 * the same way `processLearnArt.mjs` does:
 *
 *  - hero: the sun, the cranes, the pine and the pavilion top right of the
 *    title. Ends just above the Continue card's top border.
 *  - continue: Shifu with his brush and the four tone cards, the right half of
 *    the Continue card, clipped to the card's rounded right-hand corners.
 *  - pronunciation / characters / writing / sentences: the scene across the top
 *    of each category tile, clipped to the tile's rounded top corners and
 *    feathered at the bottom into the title beneath it.
 *  - foot: the blossom, mist and pagoda along the bottom of the screen.
 *
 * "Keyed" means un-blended into real alpha: each pixel's distance from the
 * surface it was painted on becomes its opacity, and its colour is recovered by
 * dividing that surface back out. Cards are sampled at a blank spot inside
 * themselves, the page at its own margin; `basicsColors.card` is the card
 * sample, so change neither without re-running this.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processBasicsArt.mjs   (then scripts/compressImages.mjs)
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS 1014 Writing Basic UI redesign.png')
const OUT = path.join('src', 'assets', 'images', 'basics')
const EXPECTED = { width: 941, height: 1672 }

/** How far a channel must differ from the surface before a pixel counts as paint. */
const KEY_RANGE = 70

const PAGE = { x: 20, y: 20 }

/* Tile columns, and the art band across the top of each row of tiles. */
const LEFT_TILE = { left: 34, width: 424 }
const RIGHT_TILE = { left: 485, width: 424 }
const TOP_ROW = { top: 774, height: 296 }
const BOTTOM_ROW = { top: 1257, height: 190 }
/* The tile's rounded top corners, in crop coordinates (bottom left open). */
const TILE_CLIP = (w, h) => ({ left: 0, top: 0, right: w - 1, bottom: h + 60, radius: 28 })

const PIECES = [
  {
    name: 'hero',
    box: { left: 560, top: 0, width: 381, height: 284 },
    sample: PAGE,
    feather: { left: 50, top: 0, right: 0, bottom: 14 },
  },
  {
    name: 'continue',
    /* Right of the "Continue Learning" pill (x≈443), inside the card (x 25–915, y 287–747). */
    box: { left: 448, top: 290, width: 466, height: 455 },
    sample: { x: 470, y: 720 },
    feather: { left: 60, top: 0, right: 0, bottom: 0 },
    clip: { left: -80, top: -1, right: 465, bottom: 454, radius: 30 },
  },
  { name: 'pronunciation', box: { ...LEFT_TILE, ...TOP_ROW }, sample: { x: 300, y: 1225 } },
  { name: 'characters', box: { ...RIGHT_TILE, ...TOP_ROW }, sample: { x: 700, y: 1230 } },
  { name: 'writing', box: { ...LEFT_TILE, ...BOTTOM_ROW }, sample: { x: 300, y: 1560 } },
  { name: 'sentences', box: { ...RIGHT_TILE, ...BOTTOM_ROW }, sample: { x: 700, y: 1562 } },
  {
    name: 'foot',
    box: { left: 0, top: 1574, width: 941, height: 98 },
    sample: PAGE,
    feather: { left: 40, top: 24, right: 40, bottom: 0 },
  },
].map((p) =>
  p.feather
    ? p
    : {
        ...p,
        feather: { left: 0, top: 0, right: 0, bottom: 36 },
        clip: TILE_CLIP(p.box.width, p.box.height),
      },
)

/** 1 inside the rounded rectangle, 0 outside, over a pixel and a half. */
function clipMask(clip, x, y) {
  const r = clip.radius
  const cx = Math.max(clip.left + r, Math.min(x, clip.right - r))
  const cy = Math.max(clip.top + r, Math.min(y, clip.bottom - r))
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
        (piece.clip ? clipMask(piece.clip, x, y) : 1)
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
