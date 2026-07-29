import { createAudioPlayer, type AudioPlayer } from 'expo-audio'

// These three effects were originally synthesized at runtime with the Web Audio
// API (oscillators/noise + filter graphs) — React Native has no equivalent, so
// they're pre-rendered to short WAV files (see scripts/generateSounds.mjs) and
// just played back here. Players are created lazily on first use rather than at
// module scope, since audio isn't available in every environment this module
// gets evaluated in (e.g. Expo Router's static web render pass).
const sources = {
  stroke: require('../assets/sounds/stroke.wav'),
  chime: require('../assets/sounds/chime.wav'),
  retry: require('../assets/sounds/retry.wav'),
} as const

const players: Partial<Record<keyof typeof sources, AudioPlayer>> = {}

function play(key: keyof typeof sources) {
  try {
    const player = players[key] ?? (players[key] = createAudioPlayer(sources[key]))
    player.seekTo(0)
    player.play()
  } catch {
    // playback unavailable — fail silently, sound is a nice-to-have
  }
}

/** A quick pen/brush "scratch" sound — plays on every stroke recognized as correct. */
export function playStrokeSound(): void {
  play('stroke')
}

/** Bright ascending three-note chime — grading a card Easy or Good. */
export function playPositiveChime(): void {
  play('chime')
}

/** Soft, low downward tone — grading a card Again or Hard. Not punishing, just distinct. */
export function playRetryTone(): void {
  play('retry')
}
