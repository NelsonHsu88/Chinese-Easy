/** Short celebratory vibration pattern, where the device/browser supports it. */
export function celebrateHaptic(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate([20, 40, 60])
  } catch {
    // vibration not permitted/supported — silently ignore
  }
}
