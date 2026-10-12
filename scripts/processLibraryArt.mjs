/*
 * Prepares the Reading Library's artwork into src/assets/images/library/.
 *
 * Sources (both in the gitignored Photos for Reference/Beta 2.1 Photos/):
 *  - "SS103 Redesigned Library Cover Art.png", the library mockup. Its header
 *    painting (ink-wash range, pagoda, sakura branch) is cropped straight out of
 *    it and unblended against the mockup's page cream into real alpha, the same
 *    treatment as processLearnArt.mjs. The crop starts right of the title's last
 *    letter; the streak pill inside it is faded out as a soft hole, because the
 *    screen draws its own pill over the same place.
 *  - "Book General Cover.png", the one cover every book now wears. Resized to
 *    JPEG; it is an opaque painting, so there is nothing to key.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processLibraryArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join('Photos for Reference', 'Beta 2.1 Photos')
const MOCKUP = path.join(DIR, 'SS103 Redesigned Library Cover Art.png')
const COVER = path.join(DIR, 'Book General Cover.png')
const OUT = path.join('src', 'assets', 'images', 'library')
const EXPECTED = { width: 941, height: 1672 }

/** Range, pagoda and branch in the top-right corner, stopping above the chip row. */
const SCENERY = { left: 590, top: 0, width: 351, height: 245 }
/** Px over which the cut edges fade out, so the crop never shows as a line. */
const FEATHER = { left: 90, bottom: 55 }
/** The mockup's streak pill, in crop coordinates, and how softly its hole fades. */
const PILL = { left: 137, top: 12, right: 298, bottom: 68, soft: 14 }

/** How far a channel must differ from the page before a pixel counts as paint. */
const KEY_RANGE = 70

const COVER_OUT = { width: 540, height: 720 }

async function main() {
  const meta = await sharp(MOCKUP).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} source, got ${meta.width}×${meta.height}`)
  }
  await mkdir(OUT, { recursive: true })

  // Open paper at the top-left corner, above the back arrow.
  const { data: bgPx } = await sharp(MOCKUP).extract({ left: 20, top: 20, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true })
  const bg = [bgPx[0], bgPx[1], bgPx[2]]

  const { data, info } = await sharp(MOCKUP).extract(SCENERY).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const px = [data[i], data[i + 1], data[i + 2]]
    const diff = Math.max(...px.map((v, k) => Math.abs(v - bg[k])))
    const x = (i / 3) % info.width
    const y = Math.floor(i / 3 / info.width)
    const edge = Math.min(1, x / FEATHER.left) * Math.min(1, (info.height - 1 - y) / FEATHER.bottom)
    // Distance outside the pill's box: 0 inside it, rising to 1 at `soft` px out.
    const dx = Math.max(PILL.left - x, 0, x - PILL.right)
    const dy = Math.max(PILL.top - y, 0, y - PILL.bottom)
    const hole = Math.min(1, Math.hypot(dx, dy) / PILL.soft)
    const keyed = Math.min(1, diff / KEY_RANGE)
    const alpha = keyed * edge * hole
    for (let k = 0; k < 3; k++) {
      // Un-premultiply against the page so a faint stroke keeps its hue.
      const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
      out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
    }
    out[o + 3] = Math.round(alpha * 255)
  }
  const sceneryFile = path.join(OUT, 'header-scenery.png')
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(sceneryFile)
  console.log('wrote', sceneryFile, `${info.width}×${info.height} (keyed against rgb(${bg.join(',')}))`)

  const coverFile = path.join(OUT, 'general-cover.jpg')
  await sharp(COVER).resize(COVER_OUT.width, COVER_OUT.height, { fit: 'cover' }).jpeg({ quality: 86, mozjpeg: true }).toFile(coverFile)
  console.log('wrote', coverFile)

  await buildRoom()
}

/*
 * The book-entry screen's room ("SS103 Book Entry UI Redesign.png"): the desk
 * scene with the mockup's own type and button painted out, so the screen can
 * draw live ones in the same places. The book stays in — the screen lays its
 * own, opening book exactly over it (`ROOM.book` in book/tokens.ts).
 *
 * Painting out is done two ways. Type is light on a darker, defocused ground,
 * so a pixel is masked where it stands well above a heavy blur of its
 * surroundings. The button and its brackets are masked whole. Masked pixels
 * are then filled from the nearest unmasked pixel in each of the four
 * directions, weighted by distance, smoothed, and given back a little grain so
 * the patch doesn't read as plastic against the photo around it.
 */
const ROOM_SRC = path.join(DIR, 'SS103 Book Entry UI Redesign.png')
/** Regions holding type, in mockup pixels: back arrow, title block, stats and blurb. */
const ROOM_TEXT = [
  { left: 180, top: 18, width: 45, height: 50 },
  { left: 330, top: 110, width: 320, height: 270 },
  { left: 180, top: 1335, width: 580, height: 105 },
]
/** The button and its brackets, masked whole. */
const ROOM_SOLID = [
  { left: 246, top: 1462, width: 450, height: 108 },
  { left: 205, top: 1488, width: 540, height: 56 },
]
/** How far above its blurred surroundings a pixel's luminance must be to count as type. */
const TEXT_LIFT = 16
/** How far below it a pixel must sit to count as the type's drop shadow. */
const TEXT_SHADOW = 5

async function buildRoom() {
  const meta = await sharp(ROOM_SRC).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} room, got ${meta.width}×${meta.height}`)
  }
  const W = meta.width
  const H = meta.height
  const { data } = await sharp(ROOM_SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { data: blur } = await sharp(ROOM_SRC).removeAlpha().blur(14).raw().toBuffer({ resolveWithObject: true })
  const lum = (buf, i) => 0.3 * buf[i] + 0.59 * buf[i + 1] + 0.11 * buf[i + 2]

  let mask = new Uint8Array(W * H)
  for (const r of ROOM_TEXT) {
    for (let y = r.top; y < r.top + r.height; y++) {
      for (let x = r.left; x < r.left + r.width; x++) {
        const i = (y * W + x) * 3
        const lift = lum(data, i) - lum(blur, i)
        // The type, and the soft dark shadow the mockup set under it.
        if (lift > TEXT_LIFT || -lift > TEXT_SHADOW) mask[y * W + x] = 1
      }
    }
  }
  // Grow the type mask so anti-aliased edges and glow go with it.
  for (let pass = 0; pass < 7; pass++) {
    const grown = mask.slice()
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x
        if (!mask[k] && (mask[k - 1] || mask[k + 1] || mask[k - W] || mask[k + W])) grown[k] = 1
      }
    }
    mask = grown
  }
  for (const r of ROOM_SOLID) {
    for (let y = r.top; y < r.top + r.height; y++) for (let x = r.left; x < r.left + r.width; x++) mask[y * W + x] = 1
  }

  const out = Float32Array.from(data)
  // Initial fill: inverse-distance blend of the nearest clear pixel left, right, up and down.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue
      let sum = [0, 0, 0]
      let weight = 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let px = x
        let py = y
        let d = 0
        while (px >= 0 && py >= 0 && px < W && py < H && mask[py * W + px]) {
          px += dx
          py += dy
          d++
        }
        if (px < 0 || py < 0 || px >= W || py >= H) continue
        const w = 1 / (d * d)
        const i = (py * W + px) * 3
        for (let k = 0; k < 3; k++) sum[k] += data[i + k] * w
        weight += w
      }
      const o = (y * W + x) * 3
      for (let k = 0; k < 3; k++) out[o + k] = sum[k] / weight
    }
  }
  // Smooth the fill (Gauss–Seidel relaxation, masked pixels only).
  for (let sweep = 0; sweep < 60; sweep++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x
        if (!mask[k]) continue
        const o = k * 3
        for (let c = 0; c < 3; c++) {
          out[o + c] = (out[o - 3 + c] + out[o + 3 + c] + out[o - W * 3 + c] + out[o + W * 3 + c]) / 4
        }
      }
    }
  }
  // A little grain, seeded so the output is stable between runs.
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5
  const bytes = Buffer.alloc(W * H * 3)
  for (let k = 0; k < W * H; k++) {
    const g = mask[k] ? rand() * 5 : 0
    for (let c = 0; c < 3; c++) bytes[k * 3 + c] = Math.max(0, Math.min(255, Math.round(out[k * 3 + c] + g)))
  }
  const roomFile = path.join(OUT, 'book-room.jpg')
  await sharp(bytes, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 84, mozjpeg: true }).toFile(roomFile)
  console.log('wrote', roomFile)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
