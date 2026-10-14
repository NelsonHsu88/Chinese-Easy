// Builds the app icon set from the Beta 2.1 reference (`SS 1012 New App Icon.png`).
//
// The reference is a mockup: a rounded square on white page with a faint drop
// shadow round it. The stores want a full-bleed square (iOS and Android mask
// the corners themselves), so this crops to the square's interior and paints
// the corner arcs of page and shadow out to white.
//
// Outputs, under assets/images/:
//   icon.png                       1024², opaque — iOS, and the default
//   android-icon-foreground.png    512², adaptive foreground
//   android-icon-background.png    512², plain white
//   android-icon-monochrome.png    432², alpha-only themed icon
//   favicon.png                    48², web
//
// The adaptive layers place the art at FG_SCALE of the canvas, anchored to the
// bottom: a launcher only shows the middle two thirds of an adaptive icon, so
// full bleed would cut off Shifu's topknot. Anchoring at the bottom keeps his
// robe running off the edge as it does in the full icon, and the art's own
// white background meets the white background layer without a seam.
//
//   node scripts/processAppIcon.mjs

import sharp from 'sharp';
import path from 'node:path';

const SRC = 'Photos for Reference/Beta 2.1 Photos/SS 1012 New App Icon.png';
const OUT = 'assets/images';
const SRC_SIZE = 1254;
// The rounded square's interior, in the reference's pixels (it runs 76–1178 ×
// 78–1171); inset a few pixels so no edge of the shadow line comes along.
const CROP = { left: 80, top: 80, width: 1090, height: 1090 };
// How far in from each corner the page and shadow can show past the rounding.
const CORNER = 260;
const FG_SCALE = 0.8;
const MONO_FLOOR = 24;

const meta = await sharp(SRC).metadata();
if (meta.width !== SRC_SIZE || meta.height !== SRC_SIZE) {
  throw new Error(`${SRC} is ${meta.width}×${meta.height}, expected ${SRC_SIZE}²`);
}

const { data, info } = await sharp(SRC)
  .extract(CROP)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// In each corner box, anything grey (page, shadow) becomes white. The art is
// coloured there (blue robe) or already white, so only the mockup goes.
// Everywhere else, the reference's 253–254 paper becomes true white, or the
// cleaned corners show as a faint lighter frame.
const W = info.width;
const H = info.height;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const inCorner = (x < CORNER || x >= W - CORNER) && (y < CORNER || y >= H - CORNER);
    const i = (y * W + x) * 3;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) < 8 && r > (inCorner ? 200 : 249)) {
      data[i] = data[i + 1] = data[i + 2] = 255;
    }
  }
}

const art = () => sharp(data, { raw: { width: W, height: H, channels: 3 } });
const white = { r: 255, g: 255, b: 255, alpha: 1 };
const clear = { r: 0, g: 0, b: 0, alpha: 0 };

async function placed(canvas, input, background) {
  const size = Math.round(canvas * FG_SCALE);
  const layer = await input.resize(size, size).png().toBuffer();
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background } })
    .composite([{ input: layer, left: Math.round((canvas - size) / 2), top: canvas - size }])
    .png();
}

await art().resize(1024, 1024).png().toFile(path.join(OUT, 'icon.png'));
await art().resize(48, 48).png().toFile(path.join(OUT, 'favicon.png'));

await (await placed(512, art().ensureAlpha(), clear)).toFile(path.join(OUT, 'android-icon-foreground.png'));
await sharp({ create: { width: 512, height: 512, channels: 4, background: white } })
  .png()
  .toFile(path.join(OUT, 'android-icon-background.png'));

// Monochrome: the launcher tints it and reads alpha alone, so ink is darkness —
// with a floor, so the paper's last few levels don't tint the whole tile.
const grey = await art().greyscale().negate().toColourspace('b-w').raw().toBuffer();
const mono = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  mono[i * 4] = mono[i * 4 + 1] = mono[i * 4 + 2] = 0;
  mono[i * 4 + 3] = Math.min(255, Math.max(0, (grey[i] - MONO_FLOOR) * 1.4));
}
await (await placed(432, sharp(mono, { raw: { width: W, height: H, channels: 4 } }), clear)).toFile(
  path.join(OUT, 'android-icon-monochrome.png'),
);

console.log('App icons written to', OUT);
