let overrideDateTime: string | null = null

/** Sets (or clears, with null) a frozen simulated "now" — see Settings → Developer. */
export function setDevClockOverride(value: string | null): void {
  overrideDateTime = value
}

export function getDevClockOverride(): string | null {
  return overrideDateTime
}

/** The app's notion of "now" everywhere — real time, unless a developer override is active. */
export function devNow(): Date {
  return overrideDateTime ? new Date(overrideDateTime) : new Date()
}
