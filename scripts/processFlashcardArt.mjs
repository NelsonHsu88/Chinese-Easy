/*
 * Prepares the flashcard's writing-card artwork into src/assets/images/flashcard/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS 1011 Flashcards Redesign
 * UI.png", in the gitignored Photos for Reference/), cropped and keyed the same
 * way `processListeningArt.mjs` does:
 *
 *  - sakura: the branch in the writing card's top-right corner. The mockup's
 *    diagonal and horizontal stroke guides run through it as dashed lines and
 *    are faded out as soft bands; the writer draws its own guides.
 *  - hills: the misty range in the writing card's bottom-left, with the
 *    diagonal guide faded out the same way.
 *
 * The mockup's answer card also carries a pagoda corner; it is left out by
 * request, so the word and its example sentence sit on plain paper.
 *
 * Both sit on the card, and every card in the mockup is the same
 * near-white,  so both are keyed against one fixed colour rather than a
 * per-piece sample — `fcColors.card` has to stay exactly that, or the art grows
 * a halo. Each piece's rounded card corner is clipped away so no sliver of the
 * mockup's border comes with it.
 *
 * Crop boxes are in the mockup's own 705×1179 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processFlashcardArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS 1011 Flashcards Redesign UI.png')
const OUT = path.join('src', 'assets', 'images', 'flashcard')
const EXPECTED = { width: 705, height: 1179 }

/** `fcColors.card`. */
const CARD = [0xfd, 0xfc, 0xf9]

/** How far a channel must differ from the background before a pixel counts as fully paint. */
const KEY_RANGE = 70

/** The mockup cards' corner radius, in its own pixels. */
const RADIUS = 28

/** 0 inside the rectangle, rising to 1 over `ramp` pixels outside it. */
function outside(rect, x, y) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / rect.ramp))
}

/** 0 on a line segment, rising to 1 over `ramp` pixels either side of it. */
function offLine([x1, y1], [x2, y2], half, ramp, x, y) {
  const dx = x2 - x1
  const dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
  const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
  return Math.max(0, Math.min(1, (d - half) / ramp))
}

/** 1 inside a rounded corner's arc, 0 outside it (antialiased over a pixel). `sx`/`sy` say which corner. */
function insideCorner(cx, cy, r, sx, sy, x, y) {
  if ((x - cx) * sx <= 0 || (y - cy) * sy <= 0) return 1
  return Math.max(0, Math.min(1, r - Math.hypot(x - cx, y - cy) + 0.5))
}

/*
 * Each piece's box, and its masks in *reference* coordinates (the loop below
 * translates), so the guide lines can be given as the two points they were
 * measured at.
 */
const PIECES = [
  {
    name: 'sakura',
    box: { left: 495, top: 60, width: 190, height: 245 },
    floor: 16,
    feather: { left: 40, top: 0, right: 0, bottom: 40 },
    mask: (x, y) =>
      Math.min(
        insideCorner(684 - RADIUS, 58 + RADIUS, RADIUS, 1, -1, x, y),
        offLine([440, 196], [560, 74], 3, 5, x, y),
        // The horizontal centre guide, as far as it runs.
        offLine([495, 289], [582, 289], 3, 5, x, y),
      ),
  },
  {
    name: 'hills',
    box: { left: 23, top: 340, width: 320, height: 175 },
    floor: 16,
    feather: { left: 0, top: 50, right: 70, bottom: 0 },
    mask: (x, y) =>
      Math.min(
        insideCorner(23 + RADIUS, 514 - RADIUS, RADIUS, -1, 1, x, y),
        offLine([160, 489], [345, 300], 3, 5, x, y),
        // The foot of the mockup's own 你, which reaches into the crop.
        outside({ left: 268, top: 300, right: 360, bottom: 405, ramp: 14 }, x, y),
      ),
  },
]

async function main() {
  const meta = await sharp(SRC).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} source, got ${meta.width}×${meta.height}`)
  }
  await mkdir(OUT, { recursive: true })

  for (const piece of PIECES) {
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
        piece.mask(x + piece.box.left, y + piece.box.top)
      const px = [data[i], data[i + 1], data[i + 2]]
      const diff = Math.max(...px.map((v, k) => Math.abs(v - CARD[k])))
      /* The colour is recovered from the unfloored key so paint keeps its hue;
         only the opacity is floored. */
      const keyed = Math.min(1, diff / KEY_RANGE)
      const alpha = Math.min(1, Math.max(0, diff - piece.floor) / (KEY_RANGE - piece.floor))
      for (let k = 0; k < 3; k++) {
        const v = keyed > 0 ? CARD[k] + (px[k] - CARD[k]) / keyed : CARD[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[o + 3] = Math.round(alpha * edge * 255)
    }
    const file = path.join(OUT, `${piece.name}.png`)
    // Upscaled ×2: the mockup is a 705px-wide screenshot of a ~390pt screen,
    // so its pixels are already close to 1x on a 3x phone.
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize({ width: info.width * 2, kernel: 'lanczos3' })
      .png()
      .toFile(file)
    console.log('wrote', file, `(${info.width}×${info.height} source)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
