import { createAudioPlayer, type AudioPlayer } from 'expo-audio'

// These three effects were originally synthesized at runtime with the Web Audio
// API (oscillators/noise + filter graphs) — React Native has no equivalent, so
// they're pre-rendered to short WAV files (see scripts/generateSounds.mjs) and
// just played back here.
const players: Record<'stroke' | 'chime' | 'retry', AudioPlayer> = {
  stroke: createAudioPlayer(require('../assets/sounds/stroke.wav')),
  chime: createAudioPlayer(require('../assets/sounds/chime.wav')),
  retry: createAudioPlayer(require('../assets/sounds/retry.wav')),
}

function play(player: AudioPlayer) {
  try {
    player.seekTo(0)
    player.play()
  } catch {
    // playback unavailable — fail silently, sound is a nice-to-have
  }
}

/** A quick pen/brush "scratch" sound — plays on every stroke recognized as correct. */
export function playStrokeSound(): void {
  play(players.stroke)
}

/** Bright ascending three-note chime — grading a card Easy or Good. */
export function playPositiveChime(): void {
  play(players.chime)
}

/** Soft, low downward tone — grading a card Again or Hard. Not punishing, just distinct. */
export function playRetryTone(): void {
  play(players.retry)
}
