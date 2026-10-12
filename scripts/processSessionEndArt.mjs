/*
 * Prepares the review session's two end screens' artwork into
 * src/assets/images/session-end/.
 *
 * Sources: the Beta 2.1 reference mockups themselves ("SS930 Nothing to Review
 * Redesign Ui.png" and "SS930 Session Complete Redesign UI.png", in the
 * gitignored Photos for Reference/), cropped and keyed into real alpha the same
 * way `processListeningArt.mjs` does:
 *
 *  - empty-hero / done-hero: the painted scene above the title — Shifu resting
 *    with the cat, and Shifu clapping at his desk. The mockups' settings gear is
 *    faded out as a soft hole; the screen has no gear.
 *  - empty-scroll: the scroll in the left of the tip card, keyed against the
 *    card rather than the page.
 *  - empty-foot / done-foot: the scenery under the button, with a soft hole
 *    where the mockup's button was. The screen lays its button over that hole
 *    at the same proportions (`endFoot` in components/sessionEnd/tokens.ts),
 *    so the two crop boxes and those numbers have to move together.
 *
 * The two mockups are on slightly different creams, and each piece is keyed
 * against its own. `endColors.emptyPage` / `.donePage` are those samples and
 * must stay exactly them, or the art reconstructs with a halo.
 *
 * Crop boxes are in each mockup's own pixels; the script refuses a source of
 * any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processSessionEndArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join('Photos for Reference', 'Beta 2.1 Photos')
const EMPTY = { file: path.join(DIR, 'SS930 Nothing to Review Redesign Ui.png'), width: 941, height: 1672 }
const DONE = { file: path.join(DIR, 'SS930 Session Complete Redesign UI.png'), width: 941, height: 1671 }
const OUT = path.join('src', 'assets', 'images', 'session-end')

/** How far a channel must differ from the background before a pixel counts as fully paint. */
const KEY_RANGE = 70

/** 0 inside the rectangle, rising to 1 over `ramp` pixels outside it. */
function outside(rect, x, y) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / rect.ramp))
}

/** 0 inside a circle, rising to 1 over `ramp` pixels outside it. */
function outsideCircle(cx, cy, r, ramp, x, y) {
  return Math.max(0, Math.min(1, (Math.hypot(x - cx, y - cy) - r) / ramp))
}

const PIECES = [
  {
    name: 'empty-hero',
    source: EMPTY,
    /* Below the status bar, down to the water's edge above the title. */
    box: { left: 0, top: 62, width: 941, height: 833 },
    sample: { x: 30, y: 900 },
    floor: 6,
    feather: { left: 0, top: 0, right: 0, bottom: 70 },
    /* The gear: centre (864, 141) in the mockup. */
    mask: (x, y) => outsideCircle(864, 141 - 62, 50, 14, x, y),
  },
  {
    name: 'empty-scroll',
    source: EMPTY,
    /* Left of the card's divider (x≈397), inside its border. */
    box: { left: 88, top: 1148, width: 292, height: 192 },
    sample: { x: 415, y: 1330 },
    floor: 8,
    feather: { left: 14, top: 10, right: 14, bottom: 6 },
    mask: () => 1,
  },
  {
    name: 'empty-foot',
    source: EMPTY,
    /* From just under the tip card to the bottom of the screen. */
    box: { left: 0, top: 1352, width: 941, height: 320 },
    sample: { x: 30, y: 900 },
    floor: 6,
    feather: { left: 0, top: 40, right: 0, bottom: 0 },
    /* The button, x 108–835, y 1378–1495. */
    mask: (x, y) => outside({ left: 108, top: 1378 - 1352, right: 835, bottom: 1495 - 1352, ramp: 18 }, x, y),
  },
  {
    name: 'done-hero',
    source: DONE,
    /* Below the status bar, down to the desk; the title starts at y≈790. */
    box: { left: 0, top: 60, width: 941, height: 715 },
    sample: { x: 30, y: 780 },
    floor: 6,
    feather: { left: 0, top: 0, right: 0, bottom: 50 },
    mask: (x, y) => outsideCircle(864, 141 - 60, 50, 14, x, y),
  },
  {
    name: 'done-foot',
    source: DONE,
    /* From just under the stats card (bottom y≈1282). */
    box: { left: 0, top: 1290, width: 941, height: 381 },
    sample: { x: 30, y: 780 },
    floor: 6,
    feather: { left: 0, top: 30, right: 0, bottom: 0 },
    /* The button, x 110–835, y 1320–1438. */
    mask: (x, y) => outside({ left: 110, top: 1320 - 1290, right: 835, bottom: 1438 - 1290, ramp: 18 }, x, y),
  },
]

async function main() {
  for (const src of [EMPTY, DONE]) {
    const meta = await sharp(src.file).metadata()
    if (meta.width !== src.width || meta.height !== src.height) {
      throw new Error(`Expected ${src.file} to be ${src.width}×${src.height}, got ${meta.width}×${meta.height}`)
    }
  }
  await mkdir(OUT, { recursive: true })

  for (const piece of PIECES) {
    const { data: bgPx } = await sharp(piece.source.file)
      .extract({ left: piece.sample.x, top: piece.sample.y, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const bg = [bgPx[0], bgPx[1], bgPx[2]]

    const { data, info } = await sharp(piece.source.file)
      .extract(piece.box)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
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
        piece.mask(x, y)
      const px = [data[i], data[i + 1], data[i + 2]]
      const diff = Math.max(...px.map((v, k) => Math.abs(v - bg[k])))
      /* The colour is recovered from the unfloored key so paint keeps its hue;
         only the opacity is floored. */
      const keyed = Math.min(1, diff / KEY_RANGE)
      const alpha = Math.min(1, Math.max(0, diff - piece.floor) / (KEY_RANGE - piece.floor))
      for (let k = 0; k < 3; k++) {
        const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[o + 3] = Math.round(alpha * edge * 255)
    }
    const file = path.join(OUT, `${piece.name}.png`)
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9, palette: false })
      .toFile(file)
    const hex = '#' + bg.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    console.log('wrote', file, `(${info.width}×${info.height}, keyed against ${hex})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
