/*
 * Re-encodes every PNG under src/assets/images as a 256-colour palette PNG.
 *
 * The art scripts (process*Art.mjs and friends) write full truecolour PNGs,
 * which for this app's watercolour came to ~24MB of the install. Quantised with
 * dithering the same art is ~75-80% smaller and indistinguishable at the size
 * a phone draws it: no banding in the soft washes, and alpha edges keep their
 * feather because libimagequant quantises RGBA, not RGB. Filenames and
 * extensions are unchanged, so nothing that `require`s an image is touched.
 *
 * Re-run after any art script — they overwrite their outputs at full size.
 * Idempotent: an image already stored with a palette is skipped, and a result
 * is only written if it is at least 10% smaller than what is there.
 *
 *   node scripts/compressImages.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..', 'src', 'assets', 'images')

function* pngs(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* pngs(p)
    else if (name.toLowerCase().endsWith('.png')) yield p
  }
}

let before = 0
let after = 0
let changed = 0
for (const file of pngs(ROOT)) {
  const input = readFileSync(file)
  before += input.length
  const meta = await sharp(input).metadata()
  if (meta.isPalette) {
    after += input.length
    continue
  }
  const output = await sharp(input)
    .png({ palette: true, quality: 100, dither: 1, compressionLevel: 9, effort: 7 })
    .toBuffer()
  if (output.length < input.length * 0.9) {
    writeFileSync(file, output)
    after += output.length
    changed++
    console.log(`${(input.length / 1024) | 0}K -> ${(output.length / 1024) | 0}K  ${relative(ROOT, file)}`)
  } else {
    after += input.length
  }
}
const mb = (n) => (n / 1048576).toFixed(1) + 'MB'
console.log(`\n${changed} re-encoded; ${mb(before)} -> ${mb(after)}`)
