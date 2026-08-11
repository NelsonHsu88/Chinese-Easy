import * as Haptics from 'expo-haptics'

/**
 * Celebratory feedback for a correct answer.
 *
 * Two beats rather than one: a light tap on the instant of the answer, then the
 * system success pattern a moment later. A single buzz reads as a notification;
 * the pause between a tap and a resolution reads as "yes, that's right", and it
 * lines up with the rise of the chime rather than firing under its attack.
 *
 * No-ops on web and on devices without a taptic engine.
 */
export function celebrateHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // haptics unsupported on this device — silently ignore
  })
  setTimeout(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, 90)
}
