import { useEffect, useState } from 'react'

/*
 * Where the review session's bar last stood.
 *
 * Each question mounts its own header, so its bar has to be told where to start.
 * Usually that's one step back, and it steps forward on arrival. But a missed
 * question doesn't move the count, so the next one arrives on the same step and
 * must not replay the step forward.
 */
let last: { step: number; total: number } | null = null

/** The count a freshly mounted session bar starts from: this one if the last question left the bar here, else the one before. */
export function useSessionProgressStart(step: number, total: number): number {
  const [from] = useState(() => (last && last.step === step && last.total === total ? step : step - 1))
  useEffect(() => {
    if (step >= 0) last = { step, total }
  }, [step, total])
  return from
}
