/*
 * The Dictionary's entrance, as a score.
 *
 * Three beats, in the order the screen reads: the page arrives as one piece,
 * then Shifu rises out of it, then he speaks. Every `at` is milliseconds from
 * the start of the run, so the whole choreography can be read — and retimed —
 * in one place rather than scattered across the screen as magic delays.
 *
 * It borrows from both of its neighbours deliberately. The page arrives on a
 * single beat like the **Review** hub, because a dictionary is one object
 * rather than six unrelated cards; Shifu and his line then follow the
 * **Dashboard**'s staging, down to the typing pace, because that is where the
 * learner already knows him from and a second speaking rhythm for the same
 * character would read as a different character.
 *
 * Two overlaps are deliberate and will look wrong if changed independently:
 *
 * - **Shifu starts before the page has settled**, so he reads as rising out of
 *   it rather than as a seventh thing appearing afterwards. `shifu.at` must
 *   stay below `page.at + page.for`.
 * - **The bubble arrives as Shifu settles**, not after he has stopped, because
 *   somebody speaking begins before they are quite still.
 *
 * The machinery is `dashboard/entrance.tsx` — same `useReveal`, same
 * hidden-tab backstop, same Animated-not-Reanimated constraint. Only the
 * timings live here.
 */
export const dictEntrance = {
  /** The whole page, up on one beat: search, links, categories, the two columns. */
  page: { at: 0, for: 620, rise: 22 },
  /** Shifu, up out of the page. Longer, because he comes from further down. */
  shifu: { at: 360, for: 560, rise: 34 },
  /** The bubble, arriving as he settles. */
  bubble: { at: 820, for: 320, rise: 14 },

  /**
   * His line, typed on — starting as the bubble lands and running roughly twice
   * the Dashboard's pace.
   *
   * It has to be quicker here, and the reason is the sentence. The Dashboard
   * speaks about forty characters; this is nearly a hundred, and at the
   * Dashboard's 16ms a character the learner has read the whole line and moved
   * on well before Shifu has finished writing it — which reads as the screen
   * lagging rather than as somebody speaking.
   */
  typing: { at: 1060, perChar: 8 },
} as const
