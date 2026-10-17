/*
 * The launch intro's logo: the app icon, downsized for the screen it plays on.
 *
 * The intro slices this image into diagonal threads that fly together, so it is
 * drawn 20+ times at once — a 1024px source decoded that often is wasted
 * memory for a logo that never shows wider than ~280pt. 720px covers 3x
 * density at that size.
 *
 * The icon's background is pure white (checked below), which is what lets the
 * threads sit on the intro's white page with no visible edges. If the icon is
 * ever repainted on another colour, the intro's `launchColors.page` must change
 * with it.
 *
 *   node scripts/processLaunchArt.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = 'assets/images/icon.png'
const OUT_DIR = 'src/assets/images/launch'
const OUT = `${OUT_DIR}/shifu-logo.png`
const SIZE = 720

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
if (info.width !== 1024 || info.height !== 1024) {
  throw new Error(`Expected a 1024×1024 icon, got ${info.width}×${info.height}`)
}
for (const [x, y] of [[0, 0], [1023, 0], [0, 1023], [1023, 1023]]) {
  const i = (y * info.width + x) * info.channels
  if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
    throw new Error(`Icon corner (${x},${y}) is not pure white — see the note above`)
  }
}

mkdirSync(OUT_DIR, { recursive: true })
await sharp(SRC)
  .resize(SIZE, SIZE, { kernel: 'lanczos3' })
  .png({ palette: true, quality: 95, effort: 10 })
  .toFile(OUT)
console.log(`wrote ${OUT}`)
