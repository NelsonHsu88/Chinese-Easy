/*
 * Prepares the Reading Corner's artwork (SS1026 Reading UI Redesign) into
 * src/assets/images/library/.
 *
 * Sources (gitignored, under Photos for Reference/Beta 2.1 Photos/):
 *  - Book Cover/*.png — one watercolour cover per story, 1086×1448. Each is
 *    resized to a 540×720 JPEG named after its story id (covers/<id>.jpg).
 *    `components/reading/storyCovers.ts` requires them; a story missing from
 *    COVERS below keeps the general 讀 cover.
 *  - "SS1026 Reading UI Redesign.png" (881×1784) — the three shelf-chip icons
 *    (teacup, lantern, mountains), cut from their chips and keyed into alpha
 *    against each chip's own fill, then doubled so they stay crisp at 3×.
 *
 * The header painting is the one `processLibraryArt.mjs` already cuts
 * (header-scenery.png): SS1026 paints the same range, pagoda and branch.
 *
 * Run: node scripts/processReadingCornerArt.mjs, then compressImages.mjs.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join('Photos for Reference', 'Beta 2.1 Photos')
const COVER_DIR = path.join(DIR, 'Book Cover')
const MOCKUP = path.join(DIR, 'SS1026 Reading UI Redesign.png')
const OUT = path.join('src', 'assets', 'images', 'library')
const EXPECTED = { width: 881, height: 1784 }
const COVER_SRC = { width: 1086, height: 1448 }
const COVER_OUT = { width: 540, height: 720 }

/** Story id → its painting in the Book Cover folder. */
const COVERS = {
  // "Quiet Canal, Changing City" is a spare city scene; its white house by the water is SS1026's own My Family picture.
  'hsk1-easy-my-family': 'Quiet Canal, Changing City-4.png',
  'hsk2-easy-shopping': '16_Going_Shopping.png',
  'hsk2-hard-birthday': '17_The_Birthday_Party.png',
  'hsk3-easy-weather': '33_The_Weather_Forecast.png',
  'hsk3-hard-first-trip': '34_The_First_Trip.png',
  'hsk4-easy-workday': '35_A_Day_at_Work.png',
  'hsk4-hard-misunderstanding': '36_The_Misunderstanding.png',
  'hsk5-easy-festival': '22_Traditional_Festivals.png',
  'hsk5-hard-old-friends': '23_Old_Friends.png',
  'hsk6-easy-city-changes': 'From Old Street to Tomorrow-1.png',
  'hsk6-hard-lifes-choices': "A Traveler's Quiet Choice-2.png",
  'hsk2-tale-jinfa': '18_Goldilocks_and_Three_Bears.png',
  'hsk2-tale-langlaile': '19_The_Boy_Who_Cried_Wolf.png',
  'hsk2-tale-shouzhu': '20_Waiting_by_Tree_Stump.png',
  'hsk2-tale-caochong': '21_Cao_Chong_Weighs_Elephant.png',
  'hsk4-tale-jack-modou': '37_Jack_and_the_Beanstalk.png',
  'hsk4-tale-tangguowu': '38_Hansel_and_Gretel.png',
  'hsk4-idiom-bamiaozhuzhang': '39_Pulling_Up_the_Seedlings.png',
  'hsk4-idiom-yanerdaoling': '40_Plugging_Ears_to_Steal_Bell.png',
  'hsk4-idiom-huashetianzu': '41_Drawing_Legs_on_a_Snake.png',
  'hsk5-tale-baixue': '24_Snow_White.png',
  'hsk5-idiom-hujiahuwei': '25_Fox_Borrows_Tigers_Might.png',
  'hsk5-idiom-yubangxiangzheng': '26_Snipe_and_Clam.png',
  'hsk5-idiom-yegonghaolong': '27_Lord_Ye_Loves_Dragons.png',
  'hsk5-legend-zongzi': '28_Zongzi_Legend.png',
  'hsk5-legend-yuebing': '29_Mooncake_Legend.png',
  'hsk5-legend-zaowangye': '30_Kitchen_God_Legend.png',
  'hsk5-legend-shousui': '31_New_Year_Vigil.png',
  'hsk5-legend-chunlian': '32_Peach_Charms_to_Spring_Couplets.png',
  'hsk6-myth-jingweitianhai': "Jingwei's Pebble Over the Sea-5.png",
  'hsk6-myth-houyisheri': 'Hou Yi and the Falling Suns-3.png',
  'hsk6-myth-changebenyue': "Chang'e Ascends to the Moon-6.png",
  'hsk6-myth-niulangzhinv': 'Magpies Across the Star River-9.png',
  'hsk6-idiom-yugongyishan': 'The Old Man Moves Mountains-7.png',
  'hsk6-idiom-saiwengshima': 'The old man and the wandering horse-8.png',
  'hsk6-tale-mulan': 'Mulan rides toward dawn-10.png',
}

/** The chip icons, in mockup pixels, with a spot of chip fill beside each to key against. */
const ICONS = {
  everyday: { box: { left: 74, top: 1330, width: 56, height: 54 }, paper: { x: 140, y: 1340 } },
  culture: { box: { left: 368, top: 1330, width: 48, height: 60 }, paper: { x: 430, y: 1340 } },
  nature: { box: { left: 638, top: 1334, width: 86, height: 52 }, paper: { x: 736, y: 1340 } },
}
/** How far a channel must differ from the chip before a pixel counts as paint. */
const KEY_RANGE = 60

async function main() {
  await mkdir(path.join(OUT, 'covers'), { recursive: true })
  for (const [id, file] of Object.entries(COVERS)) {
    const src = path.join(COVER_DIR, file)
    const meta = await sharp(src).metadata()
    if (meta.width !== COVER_SRC.width || meta.height !== COVER_SRC.height) {
      throw new Error(`${file}: expected ${COVER_SRC.width}×${COVER_SRC.height}, got ${meta.width}×${meta.height}`)
    }
    const out = path.join(OUT, 'covers', `${id}.jpg`)
    await sharp(src).resize(COVER_OUT.width, COVER_OUT.height, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }).toFile(out)
  }
  console.log(`wrote ${Object.keys(COVERS).length} covers`)

  const meta = await sharp(MOCKUP).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} mockup, got ${meta.width}×${meta.height}`)
  }
  for (const [name, { box, paper }] of Object.entries(ICONS)) {
    const { data: bgPx } = await sharp(MOCKUP).extract({ left: paper.x, top: paper.y, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const bg = [bgPx[0], bgPx[1], bgPx[2]]
    const { data, info } = await sharp(MOCKUP).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.alloc(info.width * info.height * 4)
    for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
      const px = [data[i], data[i + 1], data[i + 2]]
      const diff = Math.max(...px.map((v, k) => Math.abs(v - bg[k])))
      const keyed = Math.min(1, Math.max(0, (diff - 4) / KEY_RANGE))
      for (let k = 0; k < 3; k++) {
        // Un-premultiply against the chip so a faint edge keeps its hue.
        const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[o + 3] = Math.round(keyed * 255)
    }
    const file = path.join(OUT, `chip-${name}.png`)
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize(info.width * 2, info.height * 2, { kernel: 'lanczos3' })
      .png()
      .toFile(file)
    console.log('wrote', file, `${info.width * 2}×${info.height * 2} (keyed against rgb(${bg.join(',')}))`)
  }
}

/*
 * SS1026's own header painting — blue cloud, range, pagoda and sakura — cut
 * from the mockup's top right. The title's last word ("Corner") and the
 * streak pill are painted out (masked, filled from the paper around them,
 * relaxed smooth), then the whole crop is keyed against the page into real
 * alpha, its left and bottom edges feathered so the screen's own title can
 * sit beside it on clean paper.
 */
const HEADER = { left: 430, top: 0, width: 451, height: 238 }
/** "Corner"'s box (mockup px); inside it, dark pixels are the type. */
const HEADER_TEXT = { left: 430, top: 106, right: 624, bottom: 182 }
/** The streak pill and its soft shadow, masked whole. */
const HEADER_PILL = { left: 660, top: 18, right: 866, bottom: 93 }
const HEADER_FEATHER = { left: 150, bottom: 40 }

async function buildHeader() {
  const { data, info } = await sharp(MOCKUP).extract(HEADER).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const { data: bgPx } = await sharp(MOCKUP).extract({ left: 5, top: 5, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const bg = [bgPx[0], bgPx[1], bgPx[2]]
  const lum = (i) => 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]

  let mask = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const mx = x + HEADER.left
      const my = y + HEADER.top
      const inText = mx >= HEADER_TEXT.left && mx <= HEADER_TEXT.right && my >= HEADER_TEXT.top && my <= HEADER_TEXT.bottom
      const inPill = mx >= HEADER_PILL.left && mx <= HEADER_PILL.right && my >= HEADER_PILL.top && my <= HEADER_PILL.bottom
      if (inPill || (inText && lum((y * W + x) * 3) < 185)) mask[y * W + x] = 1
    }
  }
  // Grow the type mask so its anti-aliased edge goes with it.
  for (let pass = 0; pass < 3; pass++) {
    const grown = mask.slice()
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x
        if (!mask[k] && (mask[k - 1] || mask[k + 1] || mask[k - W] || mask[k + W])) grown[k] = 1
      }
    mask = grown
  }

  const out = Float32Array.from(data)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue
      const sum = [0, 0, 0]
      let weight = 0
      // The pill sits over sky with the branch below it: fill it from above and the sides only, or the blossom smears up into it.
      const mx = x + HEADER.left
      const my = y + HEADER.top
      const inPill = mx >= HEADER_PILL.left && mx <= HEADER_PILL.right && my >= HEADER_PILL.top && my <= HEADER_PILL.bottom
      const dirs = inPill ? [[1, 0], [-1, 0], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]]
      for (const [dx, dy] of dirs) {
        let px = x
        let py = y
        let d = 0
        while (px >= 0 && py >= 0 && px < W && py < H && mask[py * W + px]) {
          px += dx
          py += dy
          d++
        }
        // Off the crop's edge counts as open paper.
        const src = px < 0 || py < 0 || px >= W || py >= H ? bg : [0, 1, 2].map((k) => data[(py * W + px) * 3 + k])
        const w = 1 / (d * d)
        for (let k = 0; k < 3; k++) sum[k] += src[k] * w
        weight += w
      }
      for (let k = 0; k < 3; k++) out[(y * W + x) * 3 + k] = sum[k] / weight
    }
  for (let sweep = 0; sweep < 80; sweep++)
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x
        if (!mask[k]) continue
        const o = k * 3
        // Pill pixels relax against left, right and above only, for the same reason.
        const below = y + HEADER.top >= HEADER_PILL.top && y + HEADER.top <= HEADER_PILL.bottom && x + HEADER.left >= HEADER_PILL.left && x + HEADER.left <= HEADER_PILL.right && !mask[k + W]
        for (let ch = 0; ch < 3; ch++)
          out[o + ch] = below
            ? (out[o - 3 + ch] + out[o + 3 + ch] + out[o - W * 3 + ch]) / 3
            : (out[o - 3 + ch] + out[o + 3 + ch] + out[o - W * 3 + ch] + out[o + W * 3 + ch]) / 4
      }

  const rgba = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = y * W + x
      const px = [out[k * 3], out[k * 3 + 1], out[k * 3 + 2]]
      const diff = Math.max(...px.map((v, i) => Math.abs(v - bg[i])))
      const keyed = Math.min(1, Math.max(0, (diff - 2) / 70))
      const t = Math.min(1, x / HEADER_FEATHER.left)
      const edge = t * t * (3 - 2 * t) * Math.min(1, (H - 1 - y) / HEADER_FEATHER.bottom)
      for (let ch = 0; ch < 3; ch++) {
        const v = keyed > 0 ? bg[ch] + (px[ch] - bg[ch]) / keyed : bg[ch]
        rgba[k * 4 + ch] = Math.max(0, Math.min(255, Math.round(v)))
      }
      rgba[k * 4 + 3] = Math.round(keyed * edge * 255)
    }
  const file = path.join(OUT, 'corner-header.png')
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toFile(file)
  console.log('wrote', file, `${W}×${H} (keyed against rgb(${bg.join(',')}))`)
}

main()
  .then(buildHeader)
  .catch((e) => {
  console.error(e)
  process.exit(1)
})
