import { Stack } from 'expo-router'

/**
 * A stack nested inside the Dictionary tab.
 *
 * The word and character screens have to push *within* the tab rather than
 * alongside it. As sibling tab screens they were switched to rather than pushed,
 * which cost two things: `router.back()` fell through to the first tab instead
 * of the dictionary, and the Dictionary screen unmounted on the way out, so the
 * category filter and search query were gone when you came back.
 *
 * Inside a stack, the browse screen stays mounted underneath — its state is
 * still there when the detail screen pops — and the tab bar stays on screen
 * because the whole stack lives inside the tab.
 */
export default function DictionaryStackLayout() {
  /*
   * Word and character detail were briefly given `presentation: 'modal'`, for
   * the native page-sheet look on iOS. Reverted: it reproduced the exact bug
   * this stack exists to prevent (see the comment above) — `router.back()`
   * fell through to the first tab instead of popping to the browse screen,
   * because a modal-presented screen inside a nested stack is hoisted out of
   * it rather than staying a normal member of it. `DetailShell`'s rounded top
   * corners still give these screens a card-like feel; they just arrive with
   * a plain push transition rather than a native sheet.
   */
  return <Stack screenOptions={{ headerShown: false }} />
}
