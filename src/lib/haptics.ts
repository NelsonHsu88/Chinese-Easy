import * as Haptics from 'expo-haptics'

/** Short celebratory haptic feedback, mirroring the app's old [20, 40, 60]ms vibration pattern. */
export function celebrateHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
    // haptics unsupported on this device — silently ignore
  })
}
