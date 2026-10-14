/*
 * Prepares the redesigned Home screen's artwork into src/assets/images/home/.
 *
 * Source: the reference mockup itself ("SS1012 Home Page Redesign UI 2.png",
 * in the gitignored Photos for Reference/), cropped and keyed the same way
 * `processMyWordsArt.mjs` does:
 *
 *  - hero: Shifu, the sun, the misty range, the pagoda and the blossom branch
 *    — the whole right half of the greeting. The tail of "Afternoon,", the
 *    speech bubble and the streak pill overlap it, so all three are masked out
 *    (the screen draws its own over those spots).
 *  - review: the stacked 字 cards on their rocks, with the blossom, at the
 *    Review card's right end.
 *  - word-range: the misty range and its sun behind the word on offer. Its foot
 *    runs under the "Add this word" button, so it fades out there.
 *  - hero-backdrop: the same range, mirrored, its sun painted out (the hero
 *    has its own) and feathered on every side. Home lays it behind the
 *    greeting so the scenery spans the whole hero, not just Shifu's half.
 *  - lantern: the 挑 lantern on the Daily Challenges card.
 *  - challenge-trees / challenge-rocks / challenge-gift: the card's scenery —
 *    left corner, the rocks under step 2 (its check ring in-painted out) and
 *    the gift corner (the "Earn reward" pill in-painted out).
 *
 * The This Week card carries no painting in this reference.
 *
 * "Keyed" means un-blended into real alpha against the surface the art sits
 * on: each pixel's distance from that colour becomes its opacity, and its
 * colour is recovered by dividing the surface back out. The card fills in
 * `homeSurfaces` (dashboard/tokens.ts) are the colours sampled here and have to
 * stay that way, or the art reconstructs with a halo.
 *
 * Crop boxes are in the mockup's own 863×1822 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processHomeArt.mjs   (then node scripts/compressImages.mjs)
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS1012 Home Page Redesign UI 2.png')
const OUT = path.join('src', 'assets', 'images', 'home')
const EXPECTED = { width: 863, height: 1822 }

/** How far a channel must differ from the surface before a pixel counts as paint. */
const KEY_RANGE = 70

/* Sample points on each surface, clear of any painting. */
const PAGE = { x: 20, y: 600 }
const REVIEW_CARD = { x: 420, y: 520 }
const WORD_CARD = { x: 300, y: 900 }
const CHALLENGE_CARD = { x: 450, y: 1240 }

/** 0 inside the rectangle, rising to 1 over `ramp` pixels outside it. */
function outside(rect, x, y) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / rect.ramp))
}

/** 0 inside the circle, rising to 1 over `ramp` pixels outside it. */
function outsideCircle(circle, x, y) {
  return Math.max(0, Math.min(1, (Math.hypot(x - circle.x, y - circle.y) - circle.r) / circle.ramp))
}

const keep = () => 1

/*
 * Every box, mask and in-paint rectangle below is in *mockup* coordinates;
 * `main` converts masks and in-paints into crop space.
 */
const PIECES = [
  {
    name: 'hero',
    box: { left: 375, top: 70, width: 488, height: 436 },
    sample: PAGE,
    feather: { left: 46, top: 0, right: 0, bottom: 0 },
    mask: (x, y) =>
      Math.min(
        /* The comma of "Afternoon,". */
        outside({ left: 0, top: 145, right: 424, bottom: 230, ramp: 10 }, x, y),
        /* The speech bubble and its tail. */
        outside({ left: 0, top: 306, right: 412, bottom: 474, ramp: 10 }, x, y),
        /* The streak pill and its shadow. */
        outside({ left: 612, top: 0, right: 818, bottom: 94, ramp: 6 }, x, y),
      ),
    /*
     * Shifu's outline. His white hair, brows, beard and collar are as pale as
     * the page, so keying alone left them see-through and the backdrop showed
     * through him. Inside this outline the painting is kept fully opaque.
     */
    solid: [
      [580, 210], [583, 198], [595, 193], [610, 192], [623, 196], [629, 205], [631, 220], [635, 229],
      [643, 233], [655, 242], [663, 255], [667, 270], [668, 285], [665, 302], [671, 306], [677, 315],
      [677, 332], [671, 342], [660, 346], [650, 352], [637, 362], [647, 367], [657, 378], [670, 392],
      [680, 406], [687, 425], [690, 450], [691, 506], [482, 506], [484, 460], [487, 432], [496, 408], [507, 392], [518, 380], [530, 370], [541, 363],
      [535, 350], [523, 346], [512, 336], [509, 320], [513, 306], [525, 302], [529, 285], [535, 265],
      [543, 250], [555, 238], [570, 232], [578, 226],
    ],
  },
  {
    name: 'review',
    box: { left: 455, top: 524, width: 361, height: 278 },
    sample: REVIEW_CARD,
    feather: { left: 30, top: 6, right: 4, bottom: 4 },
    mask: keep,
  },
  {
    name: 'word-range',
    box: { left: 385, top: 902, width: 431, height: 194 },
    sample: WORD_CARD,
    feather: { left: 40, top: 16, right: 4, bottom: 34 },
    mask: keep,
  },
  {
    name: 'hero-backdrop',
    box: { left: 385, top: 902, width: 431, height: 194 },
    sample: WORD_CARD,
    feather: { left: 60, top: 24, right: 60, bottom: 40 },
    /* The sun: the hero already paints one. */
    mask: (x, y) => outsideCircle({ x: 578, y: 925, r: 30, ramp: 12 }, x, y),
    flop: true,
  },
  {
    name: 'lantern',
    box: { left: 66, top: 1212, width: 94, height: 132 },
    sample: CHALLENGE_CARD,
    feather: { left: 0, top: 0, right: 0, bottom: 0 },
    /* The blossom of the corner trees, at the lower left. */
    mask: (x, y) => outside({ left: 0, top: 1322, right: 104, bottom: 9999, ramp: 4 }, x, y),
  },
  {
    name: 'challenge-trees',
    /* Below the lantern's tassel, inside the card's border. */
    box: { left: 45, top: 1318, width: 82, height: 178 },
    sample: CHALLENGE_CARD,
    feather: { left: 0, top: 16, right: 18, bottom: 0 },
    /* The lantern's tassel, at the top right. */
    mask: (x, y) => outside({ left: 100, top: 0, right: 999, bottom: 1352, ramp: 4 }, x, y),
  },
  {
    name: 'challenge-rocks',
    box: { left: 238, top: 1452, width: 240, height: 44 },
    sample: CHALLENGE_CARD,
    feather: { left: 18, top: 10, right: 18, bottom: 0 },
    mask: keep,
    /* Step 2's check ring. */
    inpaint: [{ left: 338, top: 1448, right: 379, bottom: 1488 }],
  },
  {
    name: 'challenge-gift',
    box: { left: 605, top: 1280, width: 212, height: 216 },
    sample: CHALLENGE_CARD,
    feather: { left: 30, top: 18, right: 0, bottom: 0 },
    /* The "!" ending the subtitle, in the top-left corner. */
    mask: (x, y) => outside({ left: 0, top: 0, right: 636, bottom: 1306, ramp: 6 }, x, y),
    inpaint: [{ left: 630, top: 1420, right: 800, bottom: 1472 }],
  },
]

async function sampleAt(point) {
  const { data } = await sharp(SRC)
    .extract({ left: point.x, top: point.y, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return [data[0], data[1], data[2]]
}

/**
 * Fills `rect` from its border inwards, as if the paint had diffused in.
 *
 * Seeded by bridging each row from its left neighbour to its right one, then
 * relaxed (Jacobi) until every pixel is the average of its four neighbours. A
 * plain row bridge leaves streaks wherever the two ends differ; the relaxation
 * turns them into the soft wash the surrounding mist already is.
 */
function inpaint(data, width, rect, iterations = 600) {
  const w = rect.right - rect.left + 1
  const h = rect.bottom - rect.top + 1
  const at = (x, y) => (y * width + x) * 3
  for (let y = rect.top; y <= rect.bottom; y++) {
    const l = at(rect.left - 1, y)
    const r = at(rect.right + 1, y)
    for (let x = rect.left; x <= rect.right; x++) {
      const t = (x - rect.left + 1) / (w + 1)
      for (let k = 0; k < 3; k++) data[at(x, y) + k] = data[l + k] * (1 - t) + data[r + k] * t
    }
  }
  const field = new Float64Array(w * h * 3)
  for (let n = 0; n < iterations; n++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const X = rect.left + x
        const Y = rect.top + y
        for (let k = 0; k < 3; k++) {
          field[(y * w + x) * 3 + k] =
            (data[at(X - 1, Y) + k] + data[at(X + 1, Y) + k] + data[at(X, Y - 1) + k] + data[at(X, Y + 1) + k]) / 4
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let k = 0; k < 3; k++) data[at(rect.left + x, rect.top + y) + k] = field[(y * w + x) * 3 + k]
      }
    }
  }
  for (let y = rect.top; y <= rect.bottom; y++) {
    for (let x = rect.left; x <= rect.right; x++) {
      for (let k = 0; k < 3; k++) data[at(x, y) + k] = Math.round(data[at(x, y) + k])
    }
  }
}

/**
 * A polygon (mockup coordinates) as a one-channel mask over `box`: 255 inside,
 * feathered *inwards* over a few pixels, so its edge falls on the figure's own
 * soft outline and never pulls surrounding page into the art.
 */
async function solidMask(points, box) {
  const pts = points.map(([x, y]) => `${x - box.left},${y - box.top}`).join(' ')
  const svg = `<svg width="${box.width}" height="${box.height}"><rect width="100%" height="100%" fill="black"/><polygon points="${pts}" fill="white"/></svg>`
  const { data } = await sharp(Buffer.from(svg)).blur(2).extractChannel(0).raw().toBuffer({ resolveWithObject: true })
  return data.map((v) => Math.max(0, Math.min(255, (v - 128) * 2)))
}

async function main() {
  const meta = await sharp(SRC).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} source, got ${meta.width}×${meta.height}`)
  }
  await mkdir(OUT, { recursive: true })

  const { data: full } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })

  for (const piece of PIECES) {
    const bg = await sampleAt(piece.sample)
    const { left, top, width, height } = piece.box

    /* Work on a copy of the whole mockup, so an in-paint can reach just past the crop. */
    const src = Float64Array.from(full)
    for (const rect of piece.inpaint ?? []) inpaint(src, EXPECTED.width, rect)

    const solid = piece.solid ? await solidMask(piece.solid, piece.box) : null
    const out = Buffer.alloc(width * height * 4)
    const f = piece.feather
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = ((top + y) * EXPECTED.width + (left + x)) * 3
        const o = (y * width + x) * 4
        const edge =
          (f.left ? Math.min(1, x / f.left) : 1) *
          (f.top ? Math.min(1, y / f.top) : 1) *
          (f.right ? Math.min(1, (width - 1 - x) / f.right) : 1) *
          (f.bottom ? Math.min(1, (height - 1 - y) / f.bottom) : 1) *
          piece.mask(left + x, top + y)
        const px = [src[i], src[i + 1], src[i + 2]]
        const keyed = Math.max(
          Math.min(1, Math.max(...px.map((v, k) => Math.abs(v - bg[k]))) / KEY_RANGE),
          solid ? solid[y * width + x] / 255 : 0,
        )
        for (let k = 0; k < 3; k++) {
          const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
          out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
        }
        out[o + 3] = Math.round(keyed * edge * 255)
      }
    }
    const file = path.join(OUT, `${piece.name}.png`)
    let image = sharp(out, { raw: { width, height, channels: 4 } })
    if (piece.flop) image = image.flop()
    await image.png().toFile(file)
    console.log('wrote', file, `(${width}×${height}, keyed against rgb(${bg.join(',')}))`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
