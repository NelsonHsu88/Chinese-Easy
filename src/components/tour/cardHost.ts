import { useEffect, useSyncExternalStore } from 'react'

/*
 * Which surface is currently drawing Shifu's tour card.
 *
 * There is one card in the script but there can be more than one place able to
 * draw it. A React Native `Modal` draws above every other layer, including the
 * global overlay in the root layout, so a sheet the tour talks about has to host
 * its own copy or Shifu vanishes mid-sentence — and the global overlay, which
 * knows nothing about sheets, went on drawing its copy underneath. The modal is
 * transparent above its panel, so both were on screen at once: the card rising
 * with the sheet, and the original still sitting at the bottom of the page.
 *
 * So hosting is claimed rather than assumed. A surface that draws the card
 * claims it for as long as it is up; the global overlay stands down while
 * anything holds a claim and comes straight back when the claim is released.
 * That last part is why this is a claim and not a flag on the step: the two
 * sheet steps carry a Next button, so a learner who dismisses the sheet while
 * one is up must still have a card to press. Keying on "is a sheet showing it"
 * rather than "is this a sheet step" is what keeps that from stranding them.
 *
 * A counter, not a boolean: releases arrive as effect cleanups and can interleave
 * with the next claim, and a boolean would have one host's teardown switch the
 * card off underneath another that had already taken over.
 */

let claims = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return claims > 0
}

/**
 * Claim the tour card for a surface that draws above the global overlay.
 *
 * Pass the condition under which this surface is actually showing the card —
 * both that it is on screen and that the current step belongs to it. Releasing
 * happens automatically when that stops being true or the host unmounts.
 */
export function useHostsTourCard(active: boolean): void {
  useEffect(() => {
    if (!active) return
    claims += 1
    listeners.forEach((l) => l())
    return () => {
      claims -= 1
      listeners.forEach((l) => l())
    }
  }, [active])
}

/** True while some other surface is drawing the tour card. */
export function useTourCardHosted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
