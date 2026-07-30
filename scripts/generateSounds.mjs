// Pre-renders the three procedural Web Audio effects from the old src/lib/sound.ts
// (stroke scratch, positive chime, retry tone) into static WAV files, since React
// Native has no oscillator/filter-graph audio API to synthesize them at runtime.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SAMPLE_RATE = 44100
const OUT_DIR = join(import.meta.dirname, '..', 'src', 'assets', 'sounds')
mkdirSync(OUT_DIR, { recursive: true })

function writeWav(filename, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28) // byte rate
  buffer.writeUInt16LE(2, 32) // block align
  buffer.writeUInt16LE(16, 34) // bits per sample
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }
  writeFileSync(join(OUT_DIR, filename), buffer)
  console.log(`Wrote ${filename} (${(samples.length / SAMPLE_RATE).toFixed(3)}s)`)
}

function samplesFor(durationSec) {
  return new Float32Array(Math.ceil(SAMPLE_RATE * durationSec))
}

// Mirrors AudioParam.exponentialRampToValueAtTime: exponential interpolation
// between v0 at t0 and v1 at t1 (values must be non-zero).
function expEnvelope(t, t0, v0, t1, v1) {
  if (t <= t0) return v0
  if (t >= t1) return v1
  const frac = (t - t0) / (t1 - t0)
  return v0 * Math.pow(v1 / v0, frac)
}

// --- 1. Stroke scratch: bandpass-filtered noise burst -----------------------
function renderStrokeSound() {
  const duration = 0.09
  const out = samplesFor(duration)
  const n = out.length

  // Raw noise burst, linearly decaying envelope (matches the original buffer fill).
  const noise = new Float32Array(n)
  for (let i = 0; i < n; i++) noise[i] = (Math.random() * 2 - 1) * (1 - i / n)

  // Biquad bandpass (constant 0dB peak gain), f0=2600Hz, Q=0.8 — same formula as
  // Web Audio's BiquadFilterNode('bandpass'), applied as a direct-form-I filter.
  const f0 = 2600
  const Q = 0.8
  const w0 = (2 * Math.PI * f0) / SAMPLE_RATE
  const alpha = Math.sin(w0) / (2 * Q)
  const b0 = alpha
  const b1 = 0
  const b2 = -alpha
  const a0 = 1 + alpha
  const a1 = -2 * Math.cos(w0)
  const a2 = 1 - alpha

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  const filtered = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x0 = noise[i]
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    filtered[i] = y0
    x2 = x1; x1 = x0
    y2 = y1; y1 = y0
  }

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const gain = t < 0.006 ? expEnvelope(t, 0, 0.0001, 0.006, 0.45) : expEnvelope(t, 0.006, 0.45, duration, 0.0001)
    out[i] = filtered[i] * gain
  }
  return out
}

// --- 2. Positive chime: three ascending sine notes ---------------------------
function renderPositiveChime() {
  const notes = [880, 1108.73, 1318.51] // A5, C#6, E6
  const noteGap = 0.075
  const noteLen = 0.36
  const totalDuration = (notes.length - 1) * noteGap + noteLen
  const out = samplesFor(totalDuration)

  notes.forEach((freq, i) => {
    const start = i * noteGap
    const startSample = Math.floor(start * SAMPLE_RATE)
    const noteSamples = Math.floor(noteLen * SAMPLE_RATE)
    for (let s = 0; s < noteSamples; s++) {
      const t = s / SAMPLE_RATE
      const gain = t < 0.015 ? expEnvelope(t, 0, 0.0001, 0.015, 0.22) : expEnvelope(t, 0.015, 0.22, 0.35, 0.0001)
      const sample = Math.sin(2 * Math.PI * freq * t) * gain
      const idx = startSample + s
      if (idx < out.length) out[idx] += sample
    }
  })
  return out
}

// --- 3. Retry tone: descending sine chirp ------------------------------------
function renderRetryTone() {
  const duration = 0.24
  const out = samplesFor(duration)
  const f0 = 420
  const f1 = 280
  const sweepDuration = 0.18

  let phase = 0
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    const freq = t < sweepDuration ? f0 * Math.pow(f1 / f0, t / sweepDuration) : f1
    phase += (2 * Math.PI * freq) / SAMPLE_RATE
    const gain = t < 0.02 ? expEnvelope(t, 0, 0.0001, 0.02, 0.16) : expEnvelope(t, 0.02, 0.16, 0.22, 0.0001)
    out[i] = Math.sin(phase) * gain
  }
  return out
}

// --- 4. Tap: short, soft click for general button presses --------------------
function renderTapSound() {
  const duration = 0.045
  const out = samplesFor(duration)
  const f0 = 1600
  const f1 = 900

  let phase = 0
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    const freq = f0 * Math.pow(f1 / f0, t / duration)
    phase += (2 * Math.PI * freq) / SAMPLE_RATE
    const gain = t < 0.004 ? expEnvelope(t, 0, 0.0001, 0.004, 0.14) : expEnvelope(t, 0.004, 0.14, duration, 0.0001)
    out[i] = Math.sin(phase) * gain
  }
  return out
}

// --- 5. Fanfare: a bigger "ta-da!" for finishing a whole lesson --------------
// A four-note major arpeggio (root/third/fifth/octave) where the last note
// is held and layered with the fifth underneath, giving it a small "chord"
// richness that the plain three-note chime doesn't have.
function renderFanfareSound() {
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
  const noteGap = 0.1
  const lastNoteLen = 0.5
  const noteLen = 0.22
  const totalDuration = (notes.length - 1) * noteGap + lastNoteLen
  const out = samplesFor(totalDuration)

  notes.forEach((freq, i) => {
    const isLast = i === notes.length - 1
    const len = isLast ? lastNoteLen : noteLen
    const start = i * noteGap
    const startSample = Math.floor(start * SAMPLE_RATE)
    const noteSamples = Math.floor(len * SAMPLE_RATE)
    for (let s = 0; s < noteSamples; s++) {
      const t = s / SAMPLE_RATE
      const gain = t < 0.015 ? expEnvelope(t, 0, 0.0001, 0.015, 0.24) : expEnvelope(t, 0.015, 0.24, len, 0.0001)
      let sample = Math.sin(2 * Math.PI * freq * t) * gain
      if (isLast) sample += Math.sin(2 * Math.PI * 783.99 * t) * gain * 0.6 // layer the fifth under the held final note
      const idx = startSample + s
      if (idx < out.length) out[idx] += sample
    }
  })
  return out
}

writeWav('stroke.wav', renderStrokeSound())
writeWav('chime.wav', renderPositiveChime())
writeWav('retry.wav', renderRetryTone())
writeWav('tap.wav', renderTapSound())
writeWav('fanfare.wav', renderFanfareSound())
