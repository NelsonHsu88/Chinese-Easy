/*
 * Prepares the redesigned onboarding's artwork into src/assets/images/onboarding/redesign/.
 *
 * Source: the eight Beta 2.1 references ("Onboarding New UI Redesign.png" through
 * "… 7.png", plus "… 4.1 If they chose Gmail.png", in the gitignored Photos for
 * Reference/), cropped and keyed the way `processLearnArt.mjs` does it:
 *
 *  - a hero per page that has one (welcome, script, reminders, ready) — Shifu
 *    in his scene, cut between the page's text above and its first card below;
 *  - a sakura branch per page, cut from that page's own corner, with a soft
 *    hole wherever the mockup's title, subtitle or back arrow crossed it;
 *  - a foot per page (goal, account, profile, reminders, placement, ready),
 *    with soft holes where the mockup's buttons, dots, footnotes or — on the
 *    placement test — the question card sat, so none of them is carried into
 *    the app as a picture of a control.
 *
 * "Keyed" means un-blended into real alpha against the paper sampled beside
 * each piece. The references' paper is lightly textured and drifts a few
 * levels across a page, so differences under `FLOOR` count as paper rather
 * than paint — without it the texture comes through as a faint grey haze.
 *
 * Crop boxes are in the mockups' own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processOnboardingRedesignArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join('Photos for Reference', 'Beta 2.1 Photos')
const REF = {
  /* Renamed from "Onboarding New UI Redesign.png" on 2026-10-25; the same design. */
  welcome: 'SS1025 New Onboarding.png',
  script: 'Onboarding New UI Redesign 2.png',
  goal: 'Onboarding New UI Redesign 3.png',
  account: 'Onboarding New UI Redesign 4.png',
  profile: 'Onboarding New UI Redesign 4.1 If they chose Gmail.png',
  reminders: 'Onboarding New UI Redesign 5.png',
  test: 'Onboarding New UI Redesign 6.png',
  ready: 'Onboarding New UI Redesign 7.png',
}
const OUT = path.join('src', 'assets', 'images', 'onboarding', 'redesign')
const EXPECTED = { width: 941, height: 1672 }

/** A channel difference this large from the paper is fully opaque paint. */
const KEY_RANGE = 70
/** Below this the difference is the paper's own texture, not paint. */
const FLOOR = 4

/* Full-width pieces fade at the sides, so a column narrower than the window
   (a tablet, a desktop browser) never shows a hard edge where the painting stops. */
const SIDES = { left: 24, right: 24 }

const PIECES = [
  // --- 1. Welcome ------------------------------------------------------------
  {
    name: 'welcome-hero',
    ref: 'welcome',
    /* Under the subtitle (ends y≈455), down to the feature card's top (y≈1003). */
    box: { left: 0, top: 458, width: 941, height: 538 },
    sample: { x: 470, y: 470 },
    feather: { ...SIDES, top: 70, bottom: 36 },
  },
  {
    /*
     * The welcome page's whole landscape, as the reference lays it: from just
     * under the wordmark's cap height, so the mountains and pavilion stand
     * either side of the subtitle, down to the feature card. The title and
     * subtitle are painted into the reference, so a soft hole clears that
     * patch back to paper — the app draws its own text there.
     */
    name: 'welcome-scene',
    ref: 'welcome',
    box: { left: 0, top: 280, width: 941, height: 723 },
    sample: { x: 470, y: 470 },
    feather: { ...SIDES, top: 50, bottom: 36 },
    holes: [{ left: 222, right: 735, top: -60, bottom: 188, radius: 46, ramp: 34 }],
  },
  {
    /*
     * The flowers along the welcome page's foot, so the painting reaches the
     * bottom edge as the reference's does. The card's last edge, the button
     * and the dots are cleared to paper: the app draws its own over them.
     * `buttonY` is the cleared button's centre, for `PageFoot`.
     */
    name: 'welcome-foot',
    ref: 'welcome',
    box: { left: 0, top: 1420, width: 941, height: 252 },
    sample: { x: 470, y: 1662 },
    feather: { top: 50 },
    holes: [
      { left: 45, right: 896, top: -80, bottom: 196, radius: 52, ramp: 34 },
      { left: 355, right: 586, top: 180, bottom: 246, radius: 22, ramp: 22 },
    ],
  },
  {
    name: 'welcome-branch',
    ref: 'welcome',
    /* Clear of the app icon (x≈397) and the wordmark (y≈285). */
    box: { left: 0, top: 0, width: 335, height: 280 },
    sample: { x: 360, y: 40 },
    feather: { right: 30, bottom: 30 },
  },

  // --- 2. Script -------------------------------------------------------------
  {
    name: 'script-hero',
    ref: 'script',
    /* Under "You can change this…" (y≈895), down to the button (y≈1435). */
    box: { left: 0, top: 905, width: 941, height: 522 },
    sample: { x: 470, y: 915 },
    feather: { ...SIDES, top: 60, bottom: 40 },
  },
  {
    /* The garden under the script page's button and dots, to the bottom edge. */
    name: 'script-foot',
    ref: 'script',
    /* From under the desk's edge (y≈1420), so no sliver of it floats here. */
    box: { left: 0, top: 1428, width: 941, height: 244 },
    sample: { x: 470, y: 1662 },
    feather: { top: 46 },
    holes: [
      { left: 70, right: 870, top: -8, bottom: 130, radius: 54, ramp: 30 },
      { left: 352, right: 592, top: 120, bottom: 184, radius: 22, ramp: 22 },
    ],
  },
  {
    name: 'script-branch',
    ref: 'script',
    box: { left: 0, top: 0, width: 470, height: 250 },
    sample: { x: 600, y: 40 },
    feather: { right: 40, bottom: 30 },
    holes: [
      /* The back arrow, drawn over the branch — the app's own sits there. */
      { left: 40, top: 45, right: 100, bottom: 105, radius: 30, ramp: 14 },
      /* "Which characters?" */
      { left: 170, top: 150, right: 600, bottom: 300, radius: 20, ramp: 16 },
    ],
  },

  // --- 3. Goal ---------------------------------------------------------------
  {
    name: 'goal-branch',
    ref: 'goal',
    /* Starts under the mockup's phone status bar (signal, battery: y≈20–50). */
    box: { left: 600, top: 58, width: 341, height: 252 },
    sample: { x: 560, y: 120 },
    feather: { left: 30, top: 6, bottom: 30 },
    /* The title's "goal?" and the subtitle's tail, in the crop's coordinates. */
    holes: [{ left: -60, top: 122, right: 150, bottom: 312, radius: 20, ramp: 18 }],
  },
  {
    name: 'goal-foot',
    ref: 'goal',
    /* Under the last card (y≈1205). */
    box: { left: 0, top: 1215, width: 941, height: 457 },
    sample: { x: 470, y: 1225 },
    feather: { ...SIDES, top: 50 },
    holes: [
      { left: 85, top: 273, right: 857, bottom: 370, radius: 48, ramp: 16 },
      /* The page dots. */
      { left: 345, top: 395, right: 595, bottom: 432, radius: 18, ramp: 12 },
    ],
  },

  // --- 4. Account ------------------------------------------------------------
  {
    name: 'account-branch',
    ref: 'account',
    box: { left: 470, top: 0, width: 471, height: 250 },
    sample: { x: 430, y: 40 },
    feather: { left: 40, bottom: 30 },
  },
  {
    name: 'account-foot',
    ref: 'account',
    /* Under "Already have an account? Log in" (y≈1185). */
    box: { left: 0, top: 1195, width: 941, height: 477 },
    sample: { x: 470, y: 1205 },
    feather: { ...SIDES, top: 60 },
  },

  // --- 4.1 Profile -----------------------------------------------------------
  {
    name: 'profile-branch',
    ref: 'profile',
    box: { left: 530, top: 0, width: 411, height: 270 },
    sample: { x: 480, y: 40 },
    feather: { left: 40, bottom: 30 },
  },
  {
    name: 'profile-foot',
    ref: 'profile',
    /* Under the email field (y≈1095). */
    box: { left: 0, top: 1105, width: 941, height: 567 },
    sample: { x: 470, y: 1115 },
    feather: { ...SIDES, top: 60 },
    holes: [
      { left: 93, top: 345, right: 847, bottom: 452, radius: 52, ramp: 16 },
      { left: 355, top: 488, right: 585, bottom: 527, radius: 18, ramp: 12 },
    ],
  },

  // --- 5. Reminders ----------------------------------------------------------
  {
    name: 'reminders-branch',
    ref: 'reminders',
    box: { left: 640, top: 0, width: 301, height: 310 },
    sample: { x: 600, y: 120 },
    feather: { left: 30, bottom: 30 },
    /* "Stay on track" and the subtitle's line ends. */
    holes: [{ left: -60, top: 165, right: 105, bottom: 400, radius: 20, ramp: 18 }],
  },
  {
    name: 'reminders-hero',
    ref: 'reminders',
    /* Under the subtitle (y≈362), down to the reminders card (y≈983). */
    box: { left: 0, top: 370, width: 941, height: 606 },
    sample: { x: 470, y: 378 },
    feather: { ...SIDES, top: 60, bottom: 30 },
  },
  {
    name: 'reminders-foot',
    ref: 'reminders',
    /* Under the time cards (y≈1365). */
    box: { left: 0, top: 1372, width: 941, height: 300 },
    sample: { x: 470, y: 1380 },
    feather: { ...SIDES, top: 30 },
    holes: [
      { left: 72, top: 41, right: 870, bottom: 155, radius: 56, ramp: 16 },
      /* "Maybe later". */
      { left: 370, top: 188, right: 570, bottom: 236, radius: 20, ramp: 14 },
    ],
  },

  // --- 6. Placement test -----------------------------------------------------
  {
    name: 'test-branch',
    ref: 'test',
    box: { left: 560, top: 0, width: 381, height: 300 },
    sample: { x: 520, y: 120 },
    feather: { left: 30, bottom: 30 },
    /* "Placement test" and the subtitle's "right". */
    holes: [{ left: -60, top: 170, right: 170, bottom: 380, radius: 20, ramp: 18 }],
  },
  {
    name: 'test-foot',
    ref: 'test',
    box: { left: 0, top: 1020, width: 941, height: 652 },
    sample: { x: 60, y: 1030 },
    feather: { ...SIDES, top: 50 },
    holes: [
      /* The question card (x 110–832, bottom y≈1330), its shadow included. */
      { left: 104, top: -420, right: 838, bottom: 316, radius: 34, ramp: 18 },
      { left: 135, top: 493, right: 807, bottom: 590, radius: 48, ramp: 16 },
    ],
  },

  // --- 7. Ready --------------------------------------------------------------
  {
    name: 'ready-hero',
    ref: 'ready',
    /* Everything above "You're all set!" (y≈720). */
    box: { left: 0, top: 0, width: 941, height: 705 },
    sample: { x: 470, y: 20 },
    feather: { ...SIDES, bottom: 50 },
  },
  {
    name: 'ready-foot',
    ref: 'ready',
    /* Under the summary card (y≈1372). */
    box: { left: 0, top: 1380, width: 941, height: 292 },
    sample: { x: 470, y: 1390 },
    feather: { ...SIDES, top: 30 },
    holes: [
      { left: 103, top: 33, right: 838, bottom: 142, radius: 54, ramp: 16 },
      /* "You can change this anytime in settings." */
      { left: 305, top: 155, right: 635, bottom: 222, radius: 22, ramp: 14 },
    ],
  },
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
  await mkdir(OUT, { recursive: true })
  for (const [key, file] of Object.entries(REF)) {
    const meta = await sharp(path.join(DIR, file)).metadata()
    if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
      throw new Error(`${key}: expected ${EXPECTED.width}×${EXPECTED.height}, got ${meta.width}×${meta.height}`)
    }
  }

  /* `node scripts/processOnboardingRedesignArt.mjs welcome-scene` re-cuts only the named pieces. */
  const only = process.argv.slice(2)
  for (const piece of PIECES.filter((p) => only.length === 0 || only.includes(p.name))) {
    const src = path.join(DIR, REF[piece.ref])
    /* A 5×5 average, so one speck of paper texture can't set the key. */
    const { data: bgPx } = await sharp(src)
      .extract({ left: piece.sample.x - 2, top: piece.sample.y - 2, width: 5, height: 5 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const bg = [0, 1, 2].map((k) => {
      let sum = 0
      for (let i = k; i < bgPx.length; i += 3) sum += bgPx[i]
      return sum / 25
    })

    const { data, info } = await sharp(src).extract(piece.box).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.alloc(info.width * info.height * 4)
    const f = piece.feather ?? {}
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
      const diff = Math.max(...px.map((v, k) => Math.abs(v - bg[k])))
      const keyed = Math.min(1, Math.max(0, diff - FLOOR) / (KEY_RANGE - FLOOR))
      for (let k = 0; k < 3; k++) {
        /* Divided by the alpha actually emitted, so the piece composites back
           to exactly the source colour over the paper wherever it is kept. */
        const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[o + 3] = Math.round(keyed * edge * 255)
    }
    const file = path.join(OUT, `${piece.name}.png`)
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9, palette: false })
      .toFile(file)
    console.log('wrote', file, `(${info.width}×${info.height}, keyed against rgb(${bg.map(Math.round).join(',')}))`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
