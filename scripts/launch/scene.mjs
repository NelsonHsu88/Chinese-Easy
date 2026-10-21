/*
 * The launch intro's choreography: everything that happens on screen, as a
 * pure function of time → SVG. `render.mjs` rasterises it frame by frame.
 *
 * Space: a 900×1950 composition (a 9:19.5 phone). The logo sits in
 * LOGO_RECT; its layers live in icon pixels (1024) inside a group that maps
 * them there. Silk is modelled in 3D (z > 0 is away from the viewer) and
 * projected with a gentle perspective about the figure.
 *
 * Phases (seconds):
 *   0.0–1.0  silk rises from below, sweeping toward the viewer in overlapping arcs
 *   1.0–2.3  the silk spirals round the figure and lays itself down as the robe;
 *            the white garment shows between the folds; hand and scroll settle
 *   2.3–3.0  beard sweeps down, hair gathers to the topknot, the hair ribbon
 *            loops and settles, the face appears; a small spring
 *   3.0–4.1  "Chinese Easy" is written along its pen strokes
 *   4.1–4.6  hold on the finished lockup (the last frame is the exact logo)
 */

export const W = 900
export const H = 1950
/** The video's length. The choreography below is authored on a 4.6s timeline
    (SCENE_END) and played through `sceneTime`, which compresses each phase. */
export const DURATION = 3.0
const SCENE_END = 4.6
/*
 * Video time → choreography time, piecewise linear between phase boundaries:
 *   0.00–1.30  silk rises, spirals and becomes the robe   (scene 0.0–2.05)
 *   1.30–1.95  beard, hair, hair ribbon, face, the spring (scene 2.05–3.0)
 *   1.95–2.80  "Chinese Easy" is written                  (scene 3.0–4.1)
 *   2.80–3.00  a brief hold, then the app's wave takes over (scene 4.1–4.6)
 */
const TIME_MAP = [[0, 0], [1.3, 2.05], [1.95, 3.0], [2.8, 4.1], [3.0, SCENE_END]]
export function sceneTime(t) {
  for (let i = 1; i < TIME_MAP.length; i++) {
    const [a0, b0] = TIME_MAP[i - 1]
    const [a1, b1] = TIME_MAP[i]
    if (t <= a1) return b0 + ((Math.max(t, a0) - a0) / (a1 - a0)) * (b1 - b0)
  }
  return SCENE_END
}
/** Where the 1024px icon lands in the composition. */
export const LOGO_RECT = { x: 130, y: 500, size: 640 }
const K = LOGO_RECT.size / 1024
const toComp = ([x, y]) => [LOGO_RECT.x + x * K, LOGO_RECT.y + y * K]

/** Perspective: about the figure's chest, focal length in composition px. */
const CAM = { x: 450, y: 900, f: 950 }

export const INK = '#12408A'

// ── Easing ──────────────────────────────────────────────────────────────────
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const span = (t, a, b) => clamp01((t - a) / (b - a))
const smooth = (v) => v * v * (3 - 2 * v)
const easeInOutCubic = (v) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2)
const easeOutCubic = (v) => 1 - (1 - v) ** 3
const easeOutQuint = (v) => 1 - (1 - v) ** 5
/** Cubic bezier easing (CSS-style), solved by bisection. */
function bezier(x1, y1, x2, y2) {
  const f = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0, hi = 1
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (f(mid, x1, x2) < x) lo = mid
      else hi = mid
    }
    return f((lo + hi) / 2, y1, y2)
  }
}
/** Silk: a soft start, a long glide, an unhurried landing. */
const SILK = bezier(0.3, 0.0, 0.18, 1)
/** Damped spring from 0 to 1 (ζ≈0.55): a small, friendly overshoot. */
function springRaw(v) {
  const z = 0.55
  const w = 11
  const wd = w * Math.sqrt(1 - z * z)
  const t = v * 0.9
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}
const SPRING_END = springRaw(1)
/** Normalised so it lands exactly on 1 — the last frame must be the logo. */
function spring(v) {
  if (v <= 0) return 0
  if (v >= 1) return 1
  return springRaw(v) / SPRING_END
}

// ── Splines ─────────────────────────────────────────────────────────────────
/** Centripetal-ish Catmull–Rom through 3D points, sampled densely and arc-length indexed. */
function spline(points, perSeg = 40) {
  const P = [points[0], ...points, points.at(-1)]
  const out = []
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg
      const t2 = t * t, t3 = t2 * t
      out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)))
    }
  }
  out.push(points.at(-1))
  const s = [0]
  for (let i = 1; i < out.length; i++) s.push(s[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1], out[i][2] - out[i - 1][2]))
  const at = (d) => {
    if (d <= 0) return out[0]
    if (d >= s.at(-1)) return out.at(-1)
    let lo = 0, hi = s.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] < d) lo = m; else hi = m }
    const u = (d - s[lo]) / (s[hi] - s[lo])
    return [0, 1, 2].map((c) => out[lo][c] + (out[hi][c] - out[lo][c]) * u)
  }
  return { at, length: s.at(-1) }
}

// ── The silk ────────────────────────────────────────────────────────────────
/*
 * Each ribbon is the trail of a moving head along a 3D path: its body is the
 * last `reach` px of path behind the head, so it follows through every curve
 * like silk on a dancer's stick. Its last stretch (`land`, icon pixels, z = 0)
 * runs along the part of the robe it becomes: as the head travels it, that
 * part of the robe is laid down underneath, and the tail then draws in after
 * the head until the ribbon is gone and only the robe remains.
 */
const L = (pts) => pts.map((p) => [...toComp(p), 0])
const RIBBONS = [
  { // the main sweep round the lower robe, with the knot
    id: 'front', t0: 0.0, t1: 2.0, width: 132, reach: 1350, maskW: 230, twist: 0.0034, phase: 0.4, layer: 'robe',
    path: [[470, 2080, 240], [330, 1790, -180], [610, 1480, -330], [560, 1290, -260], [430, 1250, -190], [395, 1345, -250], [500, 1385, -300], [730, 1190, -90], [800, 1330, 140], [450, 1400, 280], [130, 1250, 120]],
    land: [[210, 1010], [380, 905], [540, 862], [700, 920], [810, 1012]],
  },
  { // the left of the robe
    id: 'left', t0: 0.0, t1: 1.75, width: 120, reach: 1250, maskW: 270, twist: 0.0038, phase: 1.7, layer: 'robe',
    path: [[170, 2060, 280], [110, 1660, -90], [330, 1190, -400], [720, 990, -170], [800, 880, 190], [450, 820, 330], [120, 900, 130]],
    land: [[340, 590], [235, 700], [140, 835], [60, 975]],
  },
  { // the right of the robe
    id: 'right', t0: 0.06, t1: 1.85, width: 120, reach: 1250, maskW: 270, twist: -0.0036, phase: 3.1, layer: 'robe',
    path: [[760, 2060, 280], [830, 1700, -60], [570, 1270, -410], [180, 1010, -160], [120, 880, 200], [450, 800, 340], [790, 870, 150]],
    land: [[720, 520], [850, 680], [930, 820], [990, 965]],
  },
  { // the collar, curling up and folding in
    id: 'collar', t0: 0.18, t1: 1.95, width: 84, reach: 950, maskW: 150, twist: 0.0045, phase: 0.9, layer: 'robe',
    path: [[960, 2040, 120], [790, 1560, -220], [660, 1120, -260], [520, 770, -150], [420, 700, 110]],
    land: [[715, 520], [600, 600], [520, 690], [470, 790], [450, 880]],
  },
  { // left sleeve
    id: 'sleeveL', t0: 0.28, t1: 2.05, width: 74, reach: 820, maskW: 190, twist: -0.005, phase: 2.2, layer: 'robe',
    path: [[-120, 2000, 140], [90, 1530, -170], [320, 1270, -120], [190, 1160, 60]],
    land: [[40, 860], [150, 945], [270, 1015]],
  },
  { // right sleeve
    id: 'sleeveR', t0: 0.34, t1: 2.1, width: 74, reach: 820, maskW: 190, twist: 0.0048, phase: 4.0, layer: 'robe',
    path: [[1030, 1950, 90], [860, 1520, -210], [650, 1310, -90], [730, 1180, 90]],
    land: [[600, 880], [760, 935], [905, 1005]],
  },
  { // the hair ribbon: loops over the head, twists once, settles into the bow
    id: 'hairRibbon', t0: 2.0, t1: 2.85, width: 50, reach: 560, maskW: 125, twist: 0.0075, phase: 1.1, layer: 'ribbon',
    path: [[150, 720, 220], [300, 470, -90], [540, 360, -190], [760, 360, -60], [700, 280, 110], [610, 390, 20]],
    land: [[600, 165], [700, 215], [790, 280], [862, 362], [912, 470], [950, 580], [975, 690]],
  },
].map((r) => {
  const landComp = L(r.land)
  const sp = spline([...r.path, ...landComp], 36)
  // Arc length where the landing begins: walk the spline to its nearest point.
  let landAt = 0
  let best = Infinity
  for (let d = 0; d <= sp.length; d += 4) {
    const p = sp.at(d)
    const e = Math.hypot(p[0] - landComp[0][0], p[1] - landComp[0][1]) + Math.abs(p[2]) * 2
    if (e < best && d > sp.length * 0.4) { best = e; landAt = d }
  }
  return { ...r, sp, landAt }
})

const TAIL_MS = 0.38

function ribbonState(r, t) {
  if (t < r.t0) return null
  const v = span(t, r.t0, r.t1)
  const head = sp(r).length * SILK(v)
  let tail
  // The body shortens through the glide, so the tail keeps drawing in.
  const reach = r.reach * (1 - 0.55 * smooth(span(t, r.t0 + (r.t1 - r.t0) * 0.5, r.t1)))
  if (t <= r.t1) tail = Math.max(0, head - reach)
  else {
    const tailAtLand = Math.max(0, sp(r).length - r.reach * 0.45)
    tail = tailAtLand + (sp(r).length - tailAtLand) * easeInOutCubic(span(t, r.t1, r.t1 + TAIL_MS))
  }
  if (head - tail < 2) return { head, tail, gone: t > r.t1 }
  return { head, tail }
}
const sp = (r) => r.sp

function project([x, y, z]) {
  const k = CAM.f / (CAM.f + z)
  return [CAM.x + (x - CAM.x) * k, CAM.y + (y - CAM.y) * k, k]
}

const mix = (a, b, u) => (typeof a === 'string' ? unhex(a) : a).map((v, i) => Math.round(v + (b[i] - v) * u))
const unhex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const hex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
const FRONT_DARK = [29, 110, 204]
const FRONT_LIGHT = [104, 168, 242]
const BACK_DARK = [10, 52, 112]
const BACK_LIGHT = [24, 84, 165]

/** The ribbon as depth-sortable quads: { z, k, d, fill, edge }. */
function ribbonQuads(r, t, st) {
  const { head, tail } = st
  const STEP = 9
  const pts = []
  for (let d = tail; d <= head + 0.01; d += STEP) pts.push(Math.min(d, head))
  if (pts.at(-1) < head) pts.push(head)
  if (pts.length < 2) return []
  const settleOf = (d) => smooth(span(d, r.landAt - 260, r.landAt + 40))
  const samples = pts.map((d) => {
    const p = sp(r).at(d)
    const settle = settleOf(d)
    const [sx, sy, k] = project(p)
    return { d, p, sx, sy, k, settle }
  })
  // Screen-space normals, flutter, twist and taper.
  const quadsOut = []
  const len = head - tail
  const edge = []
  for (let i = 0; i < samples.length; i++) {
    // A wide window: silk heading straight into depth projects to almost a
    // point, and a narrow tangent there jitters into a sawtooth.
    const a = samples[Math.max(0, i - 3)]
    const b = samples[Math.min(samples.length - 1, i + 3)]
    let tx = b.sx - a.sx
    let ty = b.sy - a.sy
    const tl = Math.hypot(tx, ty) || 1
    tx /= tl
    ty /= tl
    const s = samples[i]
    const free = 1 - s.settle
    const flutter = free * (s.p[2] > 0 ? 6 : 14) * s.k * Math.sin(s.d * 0.011 - t * 7.5 + r.phase)
    const cx = s.sx - ty * flutter
    const cy = s.sy + tx * flutter
    // Twist is per 3D length; silk running away into depth would cram whole
    // turns into a few screen pixels (a string of beads), so it mostly stops
    // turning behind the figure.
    const depthCalm = 1 - 0.8 * smooth(clamp01(s.p[2] / 220))
    const theta = free * depthCalm * (r.twist * s.d - t * 1.1 + r.phase)
    const c = Math.cos(theta)
    const fromTail = s.d - tail
    const fromHead = head - s.d
    const taper = smooth(clamp01(fromTail / Math.min(160, len * 0.4))) * (0.35 + 0.65 * smooth(clamp01(fromHead / Math.min(90, len * 0.3))))
    // Behind the figure the silk turns less sharply edge-on (no leafy pinches).
    const pinch = s.p[2] > 0 ? 0.55 : 0.32
    // Silk already lying on its finished panel draws in to nothing behind the
    // head — absorbed into the robe underneath. Narrowing, not fading: a
    // translucent strip of quads shows every seam.
    const melt = smooth(span(s.settle, 0.55, 1)) * smooth(clamp01((head - s.d - 40) / 160))
    const w = (r.width / 2) * s.k * taper * (1 - melt) * (pinch + (1 - pinch) * Math.abs(c)) * Math.sign(c || 1)
    edge.push({ wAbs: Math.abs(w), x1: cx - ty * w, y1: cy + tx * w, x2: cx + ty * w, y2: cy - tx * w, cx, cy, ang: Math.atan2(ty, tx), c, z: s.p[2], k: s.k })
  }
  // Curl from curvature over a wide window, then smoothed along the ribbon,
  // so the shading flows instead of flickering quad to quad.
  const raw = edge.map((e, i) => {
    const a = edge[Math.max(0, i - 3)]
    const b = edge[Math.min(edge.length - 1, i + 3)]
    let dAng = b.ang - a.ang
    if (dAng > Math.PI) dAng -= 2 * Math.PI
    if (dAng < -Math.PI) dAng += 2 * Math.PI
    return Math.max(-1, Math.min(1, dAng * 4))
  })
  edge.forEach((e, i) => {
    let acc = 0, n = 0
    for (let j = Math.max(0, i - 4); j <= Math.min(edge.length - 1, i + 4); j++) { acc += raw[j]; n++ }
    e.curl = acc / n
  })
  for (let i = 0; i < edge.length - 1; i++) {
    const e0 = edge[i]
    const e1 = edge[i + 1]
    // Fully drawn-in silk leaves nothing — not even a hairline of edge stroke.
    if (e0.wAbs < 0.7 && e1.wAbs < 0.7) continue
    const c = (e0.c + e1.c) / 2
    const face = Math.abs(c)
    // Light from the upper left: fronts brighten as they turn to face it,
    // backs stay in the deep blue; edge-on silk darkens.
    const lit0 = c >= 0 ? mix(FRONT_DARK, FRONT_LIGHT, face ** 2.2 * 0.85) : mix(BACK_DARK, BACK_LIGHT, face ** 1.5)
    // Atmosphere: silk far behind the figure pales a little toward the page.
    const fill = mix(lit0, [255, 255, 255], Math.max(0, Math.min(0.28, ((e0.z + e1.z) / 2 / 400) * 0.28)))
    // Curl: where the silk bends, one half of its width catches the light
    // and the other falls into shade — what makes a flat strip read as cloth.
    const curl = ((e0.curl + e1.curl) / 2) * Math.sign(c || 1)
    const lit = mix(fill, FRONT_LIGHT, Math.max(0, curl) * 0.35)
    const shade = mix(fill, BACK_DARK, Math.max(0, -curl) * 0.3 + 0.08)
    const f = (v) => v.toFixed(1)
    const d = `M${f(e0.x1)} ${f(e0.y1)}L${f(e1.x1)} ${f(e1.y1)}L${f(e1.x2)} ${f(e1.y2)}L${f(e0.x2)} ${f(e0.y2)}Z`
    const dA = `M${f(e0.x1)} ${f(e0.y1)}L${f(e1.x1)} ${f(e1.y1)}L${f(e1.cx)} ${f(e1.cy)}L${f(e0.cx)} ${f(e0.cy)}Z`
    const dB = `M${f(e0.cx)} ${f(e0.cy)}L${f(e1.cx)} ${f(e1.cy)}L${f(e1.x2)} ${f(e1.y2)}L${f(e0.x2)} ${f(e0.y2)}Z`
    quadsOut.push({ alpha: 1, z: (e0.z + e1.z) / 2, k: (e0.k + e1.k) / 2, d, dA, dB, fill: hex(lit), fillB: hex(shade), sheen: c > 0.55 ? (c - 0.55) / 0.45 : 0, e0, e1 })
  }
  return quadsOut
}

// ── The figure ──────────────────────────────────────────────────────────────
/** Reveal masks for a layer: thick soft strokes along each landed ribbon's track. */
function landedTrack(r, st) {
  if (!st) return null
  const to = Math.min(st.head, sp(r).length)
  if (to <= r.landAt) return null
  const pts = []
  for (let d = r.landAt - 40; d <= to; d += 10) {
    const p = sp(r).at(d)
    // Back to icon pixels for the layer group.
    pts.push([(p[0] - LOGO_RECT.x) / K, (p[1] - LOGO_RECT.y) / K])
  }
  if (pts.length < 2) return null
  return `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}" stroke="#fff" stroke-width="${(r.maskW / K).toFixed(0)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
}

/** Opacity and transform for each still layer at time t. */
function layerStates(t) {
  const garment = smooth(span(t, 1.45, 2.25))
  const scroll = spring(span(t, 1.85, 2.6))
  const hand = smooth(span(t, 1.95, 2.3))
  const beard = span(t, 2.3, 2.78)
  const hair = span(t, 2.33, 2.82)
  const face = smooth(span(t, 2.45, 2.88))
  return {
    garment: { opacity: garment, transform: `translate(512 900) scale(${0.96 + 0.04 * garment}) translate(-512 -900)` },
    scroll: { opacity: smooth(span(t, 1.85, 2.15)), transform: `translate(${(1 - scroll) * -30} ${(1 - scroll) * 70}) rotate(${(1 - scroll) * -14} 600 730)` },
    hand: { opacity: hand, transform: `translate(410 850) scale(${0.85 + 0.15 * easeOutCubic(hand)}) translate(-410 -850)` },
    beard: { sweep: easeOutCubic(beard), transform: `rotate(${(1 - spring(beard)) * -9} 380 400) translate(380 400) scale(1 ${0.9 + 0.1 * easeOutCubic(beard)}) translate(-380 -400)` },
    hair: { opacity: smooth(hair), transform: `translate(700 150) scale(${1.1 - 0.1 * spring(hair)}) translate(-700 -150)` },
    face: { opacity: face, transform: `translate(430 360) scale(${0.965 + 0.035 * face}) translate(-430 -360)` },
  }
}

/** The whole figure's small, friendly lift as it completes. */
function figureLift(t) {
  const v = span(t, 2.7, 3.5)
  if (v <= 0 || v >= 1) return 0
  // Up, then a damped settle back to rest.
  return -9 * Math.sin(Math.PI * v) * Math.exp(-2.2 * v)
}

// ── Handwriting ─────────────────────────────────────────────────────────────
export function wordLayout(hw) {
  const width = 520
  const s = width / hw.width
  const top = LOGO_RECT.y + LOGO_RECT.size + 40
  return { s, tx: (W - width) / 2, ty: top - hw.top * s }
}

const WRITE_FROM = 3.0
const WRITE_TO = 4.02

function writingMask(hw, t) {
  // Time per stroke ∝ length, with a breath between letters; each stroke eases.
  const gaps = 26 // px-equivalent pause between letters
  let total = 0
  const plan = hw.strokes.map((s, i) => {
    const gap = i && s.letter !== hw.strokes[i - 1].letter ? gaps : 4
    const a = total + gap
    total = a + s.length
    return { a, b: total }
  })
  const now = total * easeInOutCubic(span(t, WRITE_FROM, WRITE_TO)) ** 0.92
  let out = ''
  hw.strokes.forEach((s, i) => {
    const { a, b } = plan[i]
    if (now <= a) return
    const f = clamp01((now - a) / (b - a))
    const want = s.length * f
    let acc = 0
    for (let j = 1; j < s.pts.length; j++) {
      const p0 = s.pts[j - 1]
      const p1 = s.pts[j]
      const seg = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
      if (acc >= want) break
      const u = Math.min(1, (want - acc) / seg)
      const x = p0[0] + (p1[0] - p0[0]) * u
      const y = p0[1] + (p1[1] - p0[1]) * u
      const r = Math.max(p0[2], p1[2]) * 1.45 + 2.5
      out += `<path d="M${p0[0]} ${p0[1]}L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#fff" stroke-width="${(r * 2).toFixed(1)}" stroke-linecap="round"/>`
      acc += seg
    }
  })
  return out
}

// ── Frame ───────────────────────────────────────────────────────────────────
/**
 * @param videoT seconds into the video
 * @param assets { layers: {name: dataUri}, logo: dataUri, hw }
 */
export function frameSvg(videoT, assets) {
  const t = sceneTime(videoT)
  const { layers, logo, hw } = assets
  const states = RIBBONS.map((r) => ribbonState(r, t))
  const ls = layerStates(t)
  const lift = figureLift(t)

  // Robe and hair-ribbon reveal masks.
  const robeTracks = RIBBONS.filter((r) => r.layer === 'robe').map((r) => landedTrack(r, states[RIBBONS.indexOf(r)])).filter(Boolean).join('')
  const robeFull = smooth(span(t, 2.05, 2.4))
  const hrIdx = RIBBONS.findIndex((r) => r.id === 'hairRibbon')
  const hairRibbonTrack = landedTrack(RIBBONS[hrIdx], states[hrIdx]) ?? ''
  const hairRibbonFull = smooth(span(t, 2.75, 3.0))
  const beardSweep = ls.beard.sweep

  const done = t >= SCENE_END - 0.5
  const img = (name) => `<image href="${layers[name]}" x="0" y="0" width="1024" height="1024"/>`

  const figure = done
    ? `<image href="${logo}" x="0" y="0" width="1024" height="1024"/>`
    : `
      <g opacity="${ls.garment.opacity.toFixed(3)}" transform="${ls.garment.transform}">${img('garment')}</g>
      <g mask="url(#robeMask)">${img('robe')}</g>
      <g opacity="${ls.hand.opacity.toFixed(3)}" transform="${ls.hand.transform}">${img('hand')}</g>
      <g opacity="${ls.scroll.opacity.toFixed(3)}" transform="${ls.scroll.transform}">${img('scroll')}</g>
      <g transform="${ls.beard.transform}" mask="url(#beardMask)">${img('beard')}</g>
      <g opacity="${ls.face.opacity.toFixed(3)}" transform="${ls.face.transform}">${img('face')}</g>
      <g opacity="${ls.hair.opacity.toFixed(3)}" transform="${ls.hair.transform}">${img('hair')}</g>
      <g mask="url(#ribbonMask)">${img('ribbon')}</g>`

  // Silk, depth sorted across ribbons, far to near; near silk is softened.
  const quads = []
  RIBBONS.forEach((r, i) => {
    const st = states[i]
    if (st && !st.gone && st.head - st.tail > 2) quads.push(...ribbonQuads(r, t, st))
  })
  quads.sort((a, b) => b.z - a.z)
  const bands = [[], [], []]
  // Only the silk right by the lens softens; one boundary keeps any seam where
  // a ribbon crosses it rare and brief.
  for (const q of quads) bands[q.k > 1.6 ? 2 : 0].push(q)
  const silk = bands
    .map((band, bi) => {
      if (!band.length) return ''
      const body = band.map((q) => { const o = q.alpha < 0.999 ? ` opacity="${q.alpha.toFixed(3)}"` : ''; return `<g${o}><path d="${q.dA}" fill="${q.fill}" stroke="${q.fill}" stroke-width="0.8"/><path d="${q.dB}" fill="${q.fillB}" stroke="${q.fillB}" stroke-width="0.8"/></g>` }).join('')
      const sheen = band.filter((q) => q.sheen > 0 && q.alpha > 0.5).map((q) => `<path d="M${q.e0.x1.toFixed(1)} ${q.e0.y1.toFixed(1)}L${q.e1.x1.toFixed(1)} ${q.e1.y1.toFixed(1)}" stroke="#fff" stroke-opacity="${(q.sheen * 0.35).toFixed(2)}" stroke-width="${(2.2 * q.k).toFixed(1)}"/>`).join('')
      return `<g filter="${bi ? `url(#dof${bi})` : 'none'}">${body}${sheen}</g>`
    })
    .join('')
  const shadow = quads.length
    ? `<g filter="url(#shadow)" opacity="0.16" transform="translate(16 34)">${quads.filter((q) => q.alpha > 0.3).map((q) => `<path d="${q.d}" fill="#0a2a5a"/>`).join('')}</g>`
    : ''

  const { s, tx, ty } = wordLayout(hw)
  const writing = t >= WRITE_FROM
  const fullText = smooth(span(t, WRITE_TO - 0.06, WRITE_TO + 0.1))
  const word = hw.letters.map((l) => `<path d="${l.d}"/>`).join('')
  const text = !writing
    ? ''
    : `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})" fill="${INK}">
        <g mask="url(#writeMask)">${word}</g>
        <g opacity="${fullText.toFixed(3)}">${word}</g>
      </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="dof1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="dof2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <linearGradient id="beardSweep" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="${Math.max(0, beardSweep * 1.25 - 0.25).toFixed(3)}" stop-color="#fff"/>
      <stop offset="${Math.min(1, beardSweep * 1.25).toFixed(3)}" stop-color="#000"/>
    </linearGradient>
    <mask id="robeMask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1424" height="1424">
      <g filter="url(#soft)">${robeTracks}</g>
      <rect x="-200" y="-200" width="1424" height="1424" fill="#fff" opacity="${robeFull.toFixed(3)}"/>
    </mask>
    <mask id="ribbonMask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1424" height="1424">
      <g filter="url(#soft)">${hairRibbonTrack}</g>
      <rect x="-200" y="-200" width="1424" height="1424" fill="#fff" opacity="${hairRibbonFull.toFixed(3)}"/>
    </mask>
    <mask id="beardMask" maskUnits="userSpaceOnUse" x="0" y="330" width="1024" height="600">
      <rect x="0" y="330" width="1024" height="600" fill="url(#beardSweep)"/>
    </mask>
    <mask id="writeMask" maskUnits="userSpaceOnUse" x="-100" y="${(hw.top - 100).toFixed(0)}" width="${(hw.width + 200).toFixed(0)}" height="${(hw.bottom - hw.top + 200).toFixed(0)}">${writing ? writingMask(hw, t) : ''}</mask>
  </defs>
  <rect width="${W}" height="${H}" fill="#fff"/>
  <g transform="translate(0 ${lift.toFixed(2)})">
    <g transform="translate(${LOGO_RECT.x} ${LOGO_RECT.y}) scale(${K})">${figure}</g>
  </g>
  ${shadow}
  ${silk}
  ${text}
</svg>`
}
