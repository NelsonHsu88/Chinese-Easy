import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Whether the learner has asked the system for reduced motion.
 *
 * Starts false and corrects itself once the platform answers. Every failure
 * path leaves it false, because the tour's motion is already restrained — the
 * cost of guessing wrong that way is a 230ms morph, not a vestibular trigger.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduce(value)
      })
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => {
      alive = false
      sub?.remove()
    }
  }, [])

  return reduce
}
