/*
 * A minimal TrueType reader: cmap 4, hmtx, loca, glyf (composites flattened by
 * offset). Enough to lay out a line of Latin text as outlines, which is all
 * the launch intro's build needs — the project has no font library.
 */
import { readFileSync } from 'node:fs'

export function loadFont(file) {
  const buf = readFileSync(file)
  // ── TrueType ────────────────────────────────────────────────────────────────
  const u16 = (o) => buf.readUInt16BE(o)
  const i16 = (o) => buf.readInt16BE(o)
  const u32 = (o) => buf.readUInt32BE(o)

  const tables = {}
  for (let i = 0, n = u16(4); i < n; i++) {
    const r = 12 + i * 16
    tables[buf.toString('latin1', r, r + 4)] = u32(r + 8)
  }
  for (const t of ['cmap', 'head', 'hhea', 'hmtx', 'loca', 'glyf', 'maxp']) {
    if (tables[t] === undefined) throw new Error(`${file} has no ${t} table (CFF font?)`)
  }
  const unitsPerEm = u16(tables.head + 18)
  const longLoca = i16(tables.head + 50) === 1
  const numHMetrics = u16(tables.hhea + 34)

  function glyphIndex(code) {
    const cmap = tables.cmap
    for (let i = 0, n = u16(cmap + 2); i < n; i++) {
      const rec = cmap + 4 + i * 8
      const sub = cmap + u32(rec + 4)
      if (u16(sub) !== 4) continue
      const segX2 = u16(sub + 6)
      const ends = sub + 14
      const starts = ends + segX2 + 2
      const deltas = starts + segX2
      const offsets = deltas + segX2
      for (let s = 0; s < segX2 / 2; s++) {
        if (code > u16(ends + s * 2)) continue
        if (code < u16(starts + s * 2)) return 0
        const ro = u16(offsets + s * 2)
        if (ro === 0) return (code + i16(deltas + s * 2)) & 0xffff
        const g = u16(offsets + s * 2 + ro + (code - u16(starts + s * 2)) * 2)
        return g === 0 ? 0 : (g + i16(deltas + s * 2)) & 0xffff
      }
    }
    return 0
  }

  const advance = (g) => u16(tables.hmtx + Math.min(g, numHMetrics - 1) * 4)
  const glyphOffset = (g) =>
    longLoca ? u32(tables.loca + g * 4) : u16(tables.loca + g * 2) * 2

  /** Contours as arrays of {x, y, on}. Composites are flattened by offset. */
  function glyphContours(g) {
    const start = glyphOffset(g)
    if (start === glyphOffset(g + 1)) return []
    const o = tables.glyf + start
    const nContours = i16(o)
    if (nContours < 0) {
      const out = []
      let p = o + 10
      for (;;) {
        const flags = u16(p)
        const sub = u16(p + 2)
        let dx, dy
        if (flags & 1) { dx = i16(p + 4); dy = i16(p + 6); p += 8 } else { dx = buf.readInt8(p + 4); dy = buf.readInt8(p + 5); p += 6 }
        if (flags & 8) p += 2
        else if (flags & 0x40) p += 4
        else if (flags & 0x80) p += 8
        for (const c of glyphContours(sub)) out.push(c.map((pt) => ({ ...pt, x: pt.x + dx, y: pt.y + dy })))
        if (!(flags & 0x20)) break
      }
      return out
    }
    const endPts = []
    for (let i = 0; i < nContours; i++) endPts.push(u16(o + 10 + i * 2))
    const nPts = endPts[nContours - 1] + 1
    let p = o + 10 + nContours * 2
    p += 2 + u16(p)
    const flags = []
    while (flags.length < nPts) {
      const f = buf[p++]
      flags.push(f)
      if (f & 8) for (let r = buf[p++]; r > 0; r--) flags.push(f)
    }
    const read = (short, same) => {
      const vals = []
      let v = 0
      for (const f of flags) {
        if (f & short) { const d = buf[p++]; v += f & same ? d : -d }
        else if (!(f & same)) { v += i16(p); p += 2 }
        vals.push(v)
      }
      return vals
    }
    const xs = read(2, 16)
    const ys = read(4, 32)
    const contours = []
    let s = 0
    for (const e of endPts) {
      const c = []
      for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 })
      contours.push(c)
      s = e + 1
    }
    return contours
  }

  /** On/off points → explicit quadratic segments [from, ctrl|null, to]. */
  function segments(contour) {
    const pts = contour.slice()
    // Start on an on-curve point (or an implied midpoint if there is none).
    let k = pts.findIndex((q) => q.on)
    if (k === -1) {
      const a = pts[0], b = pts[1]
      pts.unshift({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true })
      k = 0
    }
    const ring = [...pts.slice(k), ...pts.slice(0, k)]
    const segs = []
    let cur = ring[0]
    let ctrl = null
    for (let i = 1; i <= ring.length; i++) {
      const q = ring[i % ring.length]
      if (q.on) {
        segs.push([cur, ctrl, q])
        cur = q
        ctrl = null
      } else if (ctrl) {
        const mid = { x: (ctrl.x + q.x) / 2, y: (ctrl.y + q.y) / 2, on: true }
        segs.push([cur, ctrl, mid])
        cur = mid
        ctrl = q
      } else {
        ctrl = q
      }
    }
    return segs
  }


  return { unitsPerEm, glyphIndex, advance, glyphContours, segments }
}

/**
 * Lays `text` out at `px`, baseline at y = 0 (y down), x from 0.
 * Returns per-letter outlines as SVG path data (quadratic curves) plus the
 * flattened polygons, and the line's advance width.
 */
export function layoutText(font, text, px, letterSpacing = 0) {
  const scale = px / font.unitsPerEm
  const r1 = (v) => Math.round(v * 100) / 100
  let penX = 0
  const letters = []
  for (const ch of text) {
    const g = font.glyphIndex(ch.codePointAt(0))
    const ox = penX
    let d = ''
    const polys = []
    for (const c of font.glyphContours(g)) {
      const segs = font.segments(c)
      const P = (q) => `${r1(ox + q.x * scale)} ${r1(-q.y * scale)}`
      d += `M${P(segs[0][0])}`
      const poly = [[ox + segs[0][0].x * scale, -segs[0][0].y * scale]]
      for (const [a, ctrl, b] of segs) {
        d += ctrl ? `Q${P(ctrl)} ${P(b)}` : `L${P(b)}`
        const steps = ctrl ? 8 : 1
        for (let s = 1; s <= steps; s++) {
          const t = s / steps
          const x = ctrl ? (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctrl.x + t * t * b.x : b.x
          const y = ctrl ? (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctrl.y + t * t * b.y : b.y
          poly.push([ox + x * scale, -y * scale])
        }
      }
      d += 'Z'
      polys.push(poly)
    }
    letters.push({ ch, x: ox, width: font.advance(g) * scale, d, polys })
    penX += font.advance(g) * scale + letterSpacing
  }
  return { letters, width: penX - letterSpacing }
}
