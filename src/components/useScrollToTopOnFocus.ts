import { useCallback, useRef } from 'react'
import type { ScrollView } from 'react-native'
import { useFocusEffect } from 'expo-router'

/**
 * A `ScrollView` ref that puts the screen back at the top whenever it is left.
 *
 * A screen behind a tab bar, or under a pushed screen, stays mounted — and a
 * mounted `ScrollView` keeps its offset. So a learner who scrolls the Dashboard
 * to the bottom, opens Review and comes back arrives at the bottom of the
 * Dashboard, halfway through a screen they meant to arrive at the start of.
 * These are index screens: the top is where they begin.
 *
 * It resets on **blur**, not only on focus, and that is the whole point. Focus
 * effects run after React has already painted the frame, so scrolling there
 * would show the old position for a beat and then jump. Done on the way out,
 * the screen is already at the top before it is ever painted again — the focus
 * pass is only a safety net for a screen that was never scrolled away from
 * (a first mount, a deep link), where it costs nothing because the offset is
 * already zero.
 *
 * `animated: false` throughout: this is not a movement the learner made, so
 * they should never see it happen.
 */
export function useScrollToTopOnFocus() {
  const ref = useRef<ScrollView>(null)

  useFocusEffect(
    useCallback(() => {
      ref.current?.scrollTo({ y: 0, animated: false })
      return () => ref.current?.scrollTo({ y: 0, animated: false })
    }, []),
  )

  return ref
}
