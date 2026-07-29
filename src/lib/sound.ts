let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

/**
 * A quick filtered burst of noise — meant to read as a pen/brush "scratch"
 * rather than a musical tone, closer to the writing-feedback sound Skritter
 * uses. Plays on every stroke hanzi-writer recognizes as correct.
 */
export function playStrokeSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const duration = 0.09
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(2600, now)
  bandpass.Q.value = 0.8

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.45, now + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  source.connect(bandpass)
  bandpass.connect(gain)
  gain.connect(ctx.destination)
  source.start(now)
}

/** Bright ascending three-note chime — grading a card Easy or Good. */
export function playPositiveChime(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const notes = [880, 1108.73, 1318.51] // A5, C#6, E6

  notes.forEach((freq, i) => {
    const start = now + i * 0.075
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.36)
  })
}

/** Soft, low downward tone — grading a card Again or Hard. Not punishing, just distinct. */
export function playRetryTone(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(420, now)
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.18)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.24)
}
