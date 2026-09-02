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
  return <Stack screenOptions={{ headerShown: false }} />
}
