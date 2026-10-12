/*
 * Prepares the Profile screen's artwork into src/assets/images/profile/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS 929 Redesigned Profile UI
 * Screen.png", in the gitignored Photos for Reference/), cropped and keyed the
 * same way `processReviewArt.mjs` does. Everything the Profile family draws
 * comes from here:
 *
 *  - hero: the sun, the misty range, the pagoda and the sakura branch at the
 *    top right. It has no Shifu in it, which is why the Challenges screen
 *    borrows it too.
 *  - card-mountains: the pale range inside the profile card — drawn only while
 *    the Misty Mountain Background reward is equipped.
 *  - reward-misty / reward-sakura / reward-ink: the three reward thumbnails.
 *    The sakura one is a full wreath, and doubles as the Sakura Frame drawn
 *    around the avatar.
 *  - garden: the Scholar's Garden scene (range, pavilion, bridge, pond, rocks)
 *    with the bamboo and the sakura tree faded out of it as soft holes: those
 *    two are decorations the learner places, so the empty garden must not
 *    already have them painted in.
 *  - deco-*: the decorations. Bamboo and sakura tree come from the garden
 *    scene, the two lanterns from the collection tray, the pagoda from the
 *    hero. The bonsai is the Dashboard's own render and is not made here.
 *
 * "Keyed" means un-blended into real alpha against the surface each piece was
 * painted on: each pixel's distance from that colour becomes its opacity, and
 * its colour is recovered by dividing the background back out.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processProfileArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS 929 Redesigned Profile UI Screen.png')
const OUT = path.join('src', 'assets', 'images', 'profile')
const EXPECTED = { width: 941, height: 1672 }

const KEY_RANGE = 70

const PAGE = { x: 20, y: 100 }
const GARDEN_BG = { x: 700, y: 1250 }

const PIECES = [
  {
    name: 'hero',
    /* Right of "celebrate" (x≈480), from below the status bar to the profile
       card's top border (y≈294). */
    box: { left: 486, top: 52, width: 455, height: 242 },
    sample: PAGE,
    feather: { left: 60, top: 0, right: 0, bottom: 14 },
  },
  {
    name: 'card-mountains',
    box: { left: 612, top: 318, width: 270, height: 140 },
    sample: { x: 480, y: 330 },
    feather: { left: 70, top: 20, right: 0, bottom: 40 },
  },
  { name: 'reward-misty', box: { left: 84, top: 732, width: 114, height: 106 }, sample: { x: 340, y: 834 }, feather: { left: 6, top: 6, right: 6, bottom: 6 } },
  { name: 'reward-sakura', box: { left: 370, top: 728, width: 108, height: 114 }, sample: { x: 600, y: 836 } },
  { name: 'reward-ink', box: { left: 636, top: 728, width: 96, height: 112 }, sample: { x: 850, y: 836 } },
  {
    name: 'garden',
    box: { left: 22, top: 1222, width: 486, height: 212 },
    sample: GARDEN_BG,
    floor: 0.08,
    /* The top feather is what drops the mockup's panel border, which runs
       along the crop's top edge as a faint grey line. */
    feather: { left: 24, top: 28, right: 30, bottom: 12 },
    holes: [
      /* The bamboo clump, left, and the sakura tree right of the bridge. The
         ramps are long on purpose: a short one left the mist behind each hole
         ending on a hard vertical edge, the seam the preview showed. */
      { left: 20, top: 10, right: 128, bottom: 150, radius: 40, ramp: 48 },
      { left: 336, top: -10, right: 488, bottom: 150, radius: 50, ramp: 44 },
    ],
  },
  { name: 'deco-bamboo', floor: 0.22, box: { left: 36, top: 1240, width: 140, height: 182 }, sample: GARDEN_BG, feather: { left: 8, top: 10, right: 30, bottom: 14 } },
  { name: 'deco-sakura-tree', floor: 0.12, box: { left: 334, top: 1220, width: 172, height: 180 }, sample: GARDEN_BG, feather: { left: 12, top: 4, right: 10, bottom: 12 } },
  { name: 'deco-stone-lantern', floor: 0.22, box: { left: 594, top: 1324, width: 52, height: 74 }, sample: { x: 592, y: 1322 } },
  { name: 'deco-hanging-lantern', floor: 0.22, box: { left: 666, top: 1326, width: 46, height: 72 }, sample: { x: 663, y: 1322 } },
  { name: 'deco-pagoda', floor: 0.22, box: { left: 752, top: 162, width: 108, height: 132 }, sample: PAGE, feather: { left: 12, top: 4, right: 12, bottom: 16 } },
]

/** 0 inside the rounded rectangle, rising to 1 over `ramp` pixels outside it. */
function holeMask(hole, x, y) {
  const r = hole.radius
  const cx = Math.max(hole.left + r, Math.min(x, hole.right - r))
  const cy = Math.max(hole.top + r, Math.min(y, hole.bottom - r))
  const d = Math.hypot(x - cx, y - cy) - r
  return Math.max(0, Math.min(1, d / hole.ramp))
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
    const f = piece.feather ?? { left: 0, top: 0, right: 0, bottom: 0 }
    for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
      const x = (i / 3) % info.width
      const y = Math.floor(i / 3 / info.width)
      let edge =
        (f.left ? Math.min(1, x / f.left) : 1) *
        (f.top ? Math.min(1, y / f.top) : 1) *
        (f.right ? Math.min(1, (info.width - 1 - x) / f.right) : 1) *
        (f.bottom ? Math.min(1, (info.height - 1 - y) / f.bottom) : 1)
      for (const hole of piece.holes ?? []) edge *= holeMask(hole, x, y)
      const px = [data[i], data[i + 1], data[i + 2]]
      const keyed = Math.min(1, Math.max(...px.map((v, k) => Math.abs(v - bg[k]))) / KEY_RANGE)
      for (let k = 0; k < 3; k++) {
        const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      /* `floor` drops paint fainter than it: on a decoration, anything that
         faint is the mockup's panel border or a wisp of the scene behind the
         object, not the object. */
      const floor = piece.floor ?? 0
      const alpha = floor ? Math.max(0, (keyed - floor) / (1 - floor)) : keyed
      out[o + 3] = Math.round(alpha * edge * 255)
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
