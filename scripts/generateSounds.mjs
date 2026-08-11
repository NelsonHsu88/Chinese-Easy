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

// --- 2. Positive chime: struck bell tones in a small room --------------------
/*
 * This is heard more than any other sound in the app — every correct answer — so
 * it's worth more than three bare sine waves, which read as a beep from a
 * microwave rather than as a reward.
 *
 * Three things make it feel like an instrument rather than a tone generator:
 *
 *  - Partials. A struck bar or bell sounds above its fundamental, and those
 *    upper partials sit slightly sharp of whole-number ratios. That inharmonicity
 *    is most of what the ear hears as "metal" instead of "sine".
 *  - Independent decay per partial. High partials die first, so the timbre
 *    softens as the note rings — bright on the strike, mellow as it fades.
 *  - A little room. A short reverb tail is what stops a sound feeling pasted on
 *    top of the interface rather than happening somewhere.
 */
function renderPositiveChime() {
  // A major triad rising into the octave — resolved, and unambiguously "yes".
  const notes = [659.25, 830.61, 987.77, 1318.51] // E5, G#5, B5, E6
  const noteGap = 0.058
  const noteLen = 0.85
  const tail = 0.5
  const out = samplesFor((notes.length - 1) * noteGap + noteLen + tail)

  // Ratio, starting gain and decay time per partial. The stretched ratios
  // (2.01, 3.02, …) rather than exact 2/3/4 are what read as struck metal.
  const partials = [
    { ratio: 1, gain: 0.5, decay: 0.75 },
    { ratio: 2.01, gain: 0.22, decay: 0.45 },
    { ratio: 3.02, gain: 0.1, decay: 0.28 },
    { ratio: 4.16, gain: 0.05, decay: 0.16 },
    { ratio: 5.43, gain: 0.025, decay: 0.1 },
  ]

  notes.forEach((freq, i) => {
    const startSample = Math.floor(i * noteGap * SAMPLE_RATE)
    const noteSamples = Math.floor(noteLen * SAMPLE_RATE)
    // Later notes sit back slightly so the phrase doesn't pile up in volume.
    const voiceGain = 0.62 - i * 0.04

    for (let s = 0; s < noteSamples; s++) {
      const t = s / SAMPLE_RATE
      // 4ms strike: long enough to avoid a click, short enough to have an attack.
      const strike = t < 0.004 ? t / 0.004 : 1
      let sample = 0
      for (const p of partials) {
        sample += Math.sin(2 * Math.PI * freq * p.ratio * t) * p.gain * Math.exp(-t / p.decay)
      }
      const idx = startSample + s
      if (idx < out.length) out[idx] += sample * strike * voiceGain
    }
  })

  return addRoom(out, 0.055, 0.28)
}

/*
 * A very small Schroeder-style room: feedback comb filters in parallel, then an
 * allpass to smear the echo pattern so it reads as space rather than as a
 * distinct repeat. Deliberately short and quiet — a room, not a cathedral.
 */
function addRoom(dry, mix, decay) {
  const combDelaysMs = [23.1, 28.7, 34.3, 41.9]
  const wet = new Float32Array(dry.length)

  for (const ms of combDelaysMs) {
    const delay = Math.floor((ms / 1000) * SAMPLE_RATE)
    const buf = new Float32Array(delay)
    let idx = 0
    for (let i = 0; i < dry.length; i++) {
      const delayed = buf[idx]
      wet[i] += delayed / combDelaysMs.length
      buf[idx] = dry[i] + delayed * decay
      idx = (idx + 1) % delay
    }
  }

  // Allpass diffuser: same magnitude response, scrambled phase.
  const apDelay = Math.floor(0.0053 * SAMPLE_RATE)
  const apBuf = new Float32Array(apDelay)
  const g = 0.7
  let apIdx = 0
  for (let i = 0; i < wet.length; i++) {
    const delayed = apBuf[apIdx]
    const input = wet[i]
    const output = -g * input + delayed
    apBuf[apIdx] = input + g * output
    wet[i] = output
    apIdx = (apIdx + 1) % apDelay
  }

  const out = samplesFor(dry.length / SAMPLE_RATE)
  for (let i = 0; i < dry.length; i++) out[i] = dry[i] * (1 - mix) + wet[i] * mix
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

// --- 6. Gong: struck when the writer gives up and shows the stroke ------------
/*
 * Played when a learner has missed the same stroke enough times that the app
 * shows them where it goes. That's a "stop and look" moment, so it wants weight
 * rather than a buzzer — a struck gong says "here, let me show you" without
 * sounding like a penalty.
 *
 * A gong is mostly inharmonic: a dense cluster of partials at ratios that share
 * no common fundamental, so the ear hears a wash of metal instead of a pitch.
 * Two other details do a lot of the work — the shimmer (partials beating against
 * slightly detuned twins, giving the sound its live, moving quality) and the
 * strike noise burst in the first few milliseconds, which is the mallet itself.
 */
function renderGongSound() {
  const duration = 2.2
  const out = samplesFor(duration)
  const n = out.length
  const base = 138 // low enough to read as a large bowl, not a hand bell

  // Deliberately non-integer ratios — a gong has no harmonic series.
  const partials = [
    { ratio: 1, gain: 0.34, decay: 1.5 },
    { ratio: 1.52, gain: 0.24, decay: 1.2 },
    { ratio: 2.37, gain: 0.19, decay: 0.95 },
    { ratio: 3.41, gain: 0.13, decay: 0.7 },
    { ratio: 4.63, gain: 0.09, decay: 0.5 },
    { ratio: 6.11, gain: 0.06, decay: 0.34 },
    { ratio: 8.29, gain: 0.035, decay: 0.22 },
  ]

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    let sample = 0
    for (const p of partials) {
      const env = Math.exp(-t / p.decay)
      // Each partial paired with a twin a fraction of a hertz away; the two drift
      // in and out of phase, which is the shimmer.
      sample += Math.sin(2 * Math.PI * base * p.ratio * t) * p.gain * env
      sample += Math.sin(2 * Math.PI * base * p.ratio * 1.006 * t) * p.gain * 0.7 * env
    }
    // Mallet contact: a short noise burst, gone within 40ms.
    if (t < 0.04) sample += (Math.random() * 2 - 1) * 0.28 * (1 - t / 0.04)
    // 3ms fade-in so the waveform doesn't start on a discontinuity and click.
    out[i] = sample * (t < 0.003 ? t / 0.003 : 1) * 0.5
  }

  return addRoom(out, 0.12, 0.4)
}

writeWav('stroke.wav', renderStrokeSound())
writeWav('chime.wav', renderPositiveChime())
writeWav('retry.wav', renderRetryTone())
writeWav('tap.wav', renderTapSound())
writeWav('fanfare.wav', renderFanfareSound())
writeWav('gong.wav', renderGongSound())
