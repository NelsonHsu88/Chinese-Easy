import * as Haptics from 'expo-haptics'

/*
 * The app's haptic vocabulary.
 *
 * Six single feels and a couple of sequences, so that a given kind of moment
 * always feels the same wherever it happens. The guiding idea, taken from the
 * original celebrate pattern: a single buzz reads as a *notification*, while a
 * tap followed by a resolution reads as an *event*. Anything worth celebrating
 * gets two beats.
 *
 * Every call is failure-swallowed — haptics are absent on web and on plenty of
 * Android hardware, and a missing taptic engine must never break a flow.
 *
 * Restraint is part of the design: a feel that fires on every tap stops being
 * feedback and becomes latency. Use `tick` for browsing, and save the sequences
 * for genuine milestones.
 */

/*
 * Settings → General can switch the whole vocabulary off. It is a module-level
 * flag rather than a hook because almost every caller here is a plain function
 * called from an event handler, a timer or a WebView message — the same shape
 * as `devClock.ts`, and for the same reason. `AppContext` pushes the persisted
 * value in on hydrate and on every change.
 *
 * The gate sits in `safely` so it covers the sequences as well: without that,
 * `celebrateHaptic` would still schedule its timers and simply fire nothing.
 */
let enabled = true

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

/** Swallows the rejection every expo-haptics call can produce on unsupported hardware. */
function safely(run: () => Promise<void>): void {
  if (!enabled) return
  try {
    run().catch(() => {})
  } catch {
    // synchronous throw on platforms without the native module at all
  }
}

// --- Single feels -------------------------------------------------------------

/** Tick — a browsing detent. Filter chips, segmented controls, tab bar. */
export function tickHaptic(): void {
  safely(() => Haptics.selectionAsync())
}

/** Tap — something small was picked up. Word tapped in the reader, card press. */
export function tapHaptic(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

/** Thunk — something landed with weight. Stroke accepted, page turned. */
export function thunkHaptic(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
}

/** Thud — the heavy one. Reserved for the gong moment, so it stays rare. */
export function thudHaptic(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
}

/** Yes — a success resolution on its own, for use inside sequences. */
export function successHaptic(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}

/** Careful — a gentle warning. A streak at risk, not an error. */
export function carefulHaptic(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
}

// --- Sequences ----------------------------------------------------------------

export interface HapticStep {
  /** Milliseconds after the sequence starts. */
  at: number
  fire: () => void
}

/**
 * Plays steps on a shared timeline. Declarative so a sequence reads as its
 * rhythm rather than as nested timeouts, and so the shapes below can be
 * compared at a glance.
 *
 * Returns a cancel function — worth holding onto for anything that can be
 * unmounted mid-flight, so a buzz doesn't outlive the screen that asked for it.
 */
export function sequence(steps: HapticStep[]): () => void {
  const timers = steps.map((step) =>
    step.at <= 0 ? (step.fire(), null) : setTimeout(step.fire, step.at),
  )
  return () => {
    for (const t of timers) if (t) clearTimeout(t)
  }
}

/**
 * Celebratory two-beat: a tap, then the resolution. The pause is what makes it
 * read as "yes, that's right" rather than as a notification, and it lets the
 * resolution land with the rise of the chime instead of under its attack.
 *
 * The app's default for a correct answer or a claimed reward.
 */
export function celebrateHaptic(): () => void {
  return sequence([
    { at: 0, fire: tapHaptic },
    { at: 90, fire: successHaptic },
  ])
}

/**
 * Ladder — ascending, so it feels like climbing. For a streak ticking over: two
 * light steps and a heavier one, resolving into success.
 */
export function ladderHaptic(): () => void {
  return sequence([
    { at: 0, fire: tapHaptic },
    { at: 70, fire: tapHaptic },
    { at: 140, fire: thunkHaptic },
    { at: 240, fire: successHaptic },
  ])
}

/**
 * Ripple — one beat per character, then the resolution. The rhythm counts back
 * what was just written, so a two-character word feels different from a four.
 *
 * Capped: past a handful of beats the rhythm stops being legible and turns into
 * a rattle.
 */
export function rippleHaptic(characterCount: number): () => void {
  const beats = Math.max(1, Math.min(characterCount, 5))
  const steps: HapticStep[] = []
  for (let i = 0; i < beats; i++) steps.push({ at: i * 60, fire: tapHaptic })
  steps.push({ at: beats * 60 + 60, fire: successHaptic })
  return sequence(steps)
}
