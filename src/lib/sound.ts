import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'

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
  tap: require('../assets/sounds/tap.wav'),
  fanfare: require('../assets/sounds/fanfare.wav'),
  gong: require('../assets/sounds/gong.wav'),
} as const

/**
 * Puts the audio session into the one mode short UI effects want. Call once, at
 * startup.
 *
 * Without this, iOS routes playback through the default session, where the
 * ring/silent switch mutes everything — so every sound in the app was silent
 * for anyone whose phone was on silent, which for most people is most of the
 * time. These are deliberate feedback sounds a learner has chosen to hear, not
 * media, so they play regardless of the switch.
 *
 * `mixWithOthers` is the other half: a stroke scratch has no business pausing
 * someone's podcast, and requesting audio focus for a 200ms click is what makes
 * an app feel rude.
 */
export function configureAudioSession(): void {
  void setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    // The speaking check owns recording and asks for it when it needs it;
    // leaving it on here would keep the session in record mode for the whole
    // app, which on iOS quietly routes playback to the earpiece.
    allowsRecording: false,
  }).catch(() => {
    // No audio backend (web's static render pass, an emulator without audio) —
    // the effects will simply be silent, which is what they'd be anyway.
  })
}

const players: Partial<Record<keyof typeof sources, AudioPlayer>> = {}

/*
 * Settings → General can switch the effects off. Module-level rather than a
 * hook, like `devClock.ts` and the matching flag in `haptics.ts`: the callers
 * are plain functions on hot paths (a stroke click fires per stroke), not
 * components. `AppContext` pushes the persisted value in on hydrate.
 *
 * The gate is checked before the player is created, so switching sound off also
 * stops the app allocating six `AudioPlayer`s it will never use.
 */
let enabled = true

export function setSoundEnabled(value: boolean): void {
  enabled = value
}

/**
 * Plays one effect from its start, however recently it last played.
 *
 * The seek has to be *awaited*, and that is the whole reason this isn't two
 * lines. `seekTo` returns a promise on both platforms, while a player that has
 * finished sits parked at the end of its clip — where `play()` does nothing at
 * all. Firing the seek without waiting therefore called `play()` against the
 * end of the clip and fell silent, so every effect in the app worked exactly
 * once per launch: one stroke click, one chime, and a gong nobody ever heard a
 * second time.
 *
 * The three stages fail independently on purpose. No audio backend at all
 * (web's static render pass) must not throw; and a rejected seek — a player
 * whose source hasn't finished loading — must still fall through to `play()`,
 * because a player in that state is already at zero and has nothing to rewind.
 */
async function play(key: keyof typeof sources) {
  if (!enabled) return

  let player: AudioPlayer
  try {
    player = players[key] ?? (players[key] = createAudioPlayer(sources[key]))
  } catch {
    return // no audio backend — sound is a nice-to-have, never a hard failure
  }

  try {
    // Skipped while the player is still at the start: a freshly created one has
    // nothing to rewind, and the round trip would only delay the first play.
    if (player.currentTime > 0) await player.seekTo(0)
  } catch {
    // Seek unsupported, or the source is still loading — play from where it is.
  }

  try {
    player.play()
  } catch {
    // playback unavailable — fail silently
  }
}

/** A quick pen/brush "scratch" sound — plays on every stroke recognized as correct. */
export function playStrokeSound(): void {
  void play('stroke')
}

/** Bright ascending three-note chime — grading a card Easy or Good. */
export function playPositiveChime(): void {
  void play('chime')
}

/** Soft, low downward tone — grading a card Again or Hard. Not punishing, just distinct. */
export function playRetryTone(): void {
  void play('retry')
}

/** A short, soft click — general button-press feedback. */
export function playTapSound(): void {
  void play('tap')
}

/** A bigger four-note "ta-da!" — plays once, when a whole lesson is finished. */
export function playFanfare(): void {
  void play('fanfare')
}

/**
 * A struck gong — played when the writer gives up on a stroke and shows the
 * learner where it goes. Weight rather than a buzzer: this marks a moment to
 * stop and look, not a penalty.
 */
export function playGongSound(): void {
  void play('gong')
}
