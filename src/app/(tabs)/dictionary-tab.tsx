import { Redirect } from 'expo-router'

// The "Dictionary" tab button never actually navigates here — its tabPress
// listener (see ./_layout.tsx) always intercepts and shows the My Words /
// Dictionary picker sheet instead. This only exists so Tabs.Screen has a
// route to point at, and redirects as a fallback if it's ever reached directly.
//
// This file must NOT be named dictionary.tsx: that would resolve to the same
// URL path ("/dictionary") as the real standalone screen at
// src/app/dictionary.tsx, and the two colliding routes cause expo-router's
// navigator to loop indefinitely instead of reaching the real screen.
export default function DictionaryTabFallback() {
  return <Redirect href="/dictionary" />
}
