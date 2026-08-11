/*
 * Turns the supplied story cover artwork into bundle-sized assets and wires each
 * one to its story in src/data/stories.ts.
 *
 * The source art is 1024x1536 PNG at ~3MB each — 96MB for the full set, far too
 * much to ship in an app bundle. Poster cards render 174pt wide, so 540px covers
 * every sensible pixel density with room to spare, and JPEG is the right format
 * here: these are photographic-style watercolours with no transparency.
 *
 * Artwork is matched to stories by the English title embedded in the filename,
 * and written out under the story id so the wiring can't drift. Stories with no
 * matching file keep the painted fallback tile.
 *
 * Re-runnable: covers are overwritten, and a story that already has an `art`
 * field is left alone rather than gaining a second one.
 *
 *   node scripts/buildStoryCovers.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const SRC_DIR = join(ROOT, 'Photos for Reference', 'ChatGPT Image', 'CHATGPT Book Images')
const OUT_DIR = join(ROOT, 'src', 'assets', 'images', 'covers')
const STORIES_FILE = join(ROOT, 'src', 'data', 'stories.ts')

const WIDTH = 540
const HEIGHT = 810 // the originals' native 2:3, preserved so nothing is cropped
const QUALITY = 82

if (!existsSync(SRC_DIR)) throw new Error(`Source artwork folder not found: ${SRC_DIR}`)
mkdirSync(OUT_DIR, { recursive: true })

// --- Match artwork to stories by English title --------------------------------
const storiesSrc = readFileSync(STORIES_FILE, 'utf8')
const byTitle = new Map()
const entryRe = /^ {4}id: '([^']+)',$[\s\S]*?^ {4}titleEnglish: '((?:\\.|[^'])*)',$/gm
let m
while ((m = entryRe.exec(storiesSrc)) !== null) {
  byTitle.set(m[2].replace(/\\'/g, "'"), m[1])
}
if (byTitle.size === 0) throw new Error('Parsed no stories — has the stories.ts shape changed?')

/** "01 - The Legend of the Nian Beast (Nian Shou de Chuanshuo).png" -> the title */
function titleFromFilename(file) {
  return file
    .replace(/\.png$/i, '')
    .replace(/^\d+\s*-\s*/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
}

const files = readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith('.png'))
const matched = []
const unmatched = []

for (const file of files) {
  const title = titleFromFilename(file)
  const id = byTitle.get(title)
  if (id) matched.push({ file, id })
  else unmatched.push({ file, title })
}

// A silent partial import would leave covers mysteriously missing, so this is fatal.
if (unmatched.length) {
  console.error('Could not match these covers to a story title:')
  for (const u of unmatched) console.error(`  ${u.file}  ->  "${u.title}"`)
  throw new Error(`${unmatched.length} unmatched cover(s) — refusing to run a partial import`)
}

// --- Resize -------------------------------------------------------------------
let bytesIn = 0
let bytesOut = 0
for (const { file, id } of matched) {
  const inPath = join(SRC_DIR, file)
  const outPath = join(OUT_DIR, `${id}.jpg`)
  bytesIn += statSync(inPath).size
  await sharp(inPath)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(outPath)
  bytesOut += statSync(outPath).size
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + 'MB'
console.log(`Resized ${matched.length} covers: ${mb(bytesIn)} -> ${mb(bytesOut)}`)

// --- Wire each cover into stories.ts -----------------------------------------
const withArt = new Map(matched.map((x) => [x.id, x]))
const lines = storiesSrc.split('\n')
const out = []
let pending = null
let injected = 0
let alreadyPresent = 0

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  out.push(line)

  const id = /^ {4}id: '([^']+)',$/.exec(line)
  if (id) {
    pending = withArt.has(id[1]) ? id[1] : null
    continue
  }

  // Sits right after `collection`, keeping all the card metadata together.
  if (pending && /^ {4}collection: /.test(line)) {
    if (/^ {4}art: /.test(lines[i + 1] ?? '')) alreadyPresent++
    else {
      out.push(`    art: require('../assets/images/covers/${pending}.jpg'),`)
      injected++
    }
    pending = null
  }
}

writeFileSync(STORIES_FILE, out.join('\n'), 'utf8')
console.log(
  `Wired ${injected} new cover(s) into stories.ts` +
    (alreadyPresent ? `, ${alreadyPresent} already present` : '') +
    `; ${byTitle.size - matched.length} stories keep the fallback tile.`,
)
