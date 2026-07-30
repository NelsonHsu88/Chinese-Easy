import { Redirect } from 'expo-router'

// The "Lessons" tab button never actually navigates here — its tabPress
// listener (see ./_layout.tsx) always intercepts and shows the
// Lessons / New Words / Books picker sheet instead. This only exists so
// Tabs.Screen has a route to point at, and redirects as a fallback if it's
// ever reached directly.
//
// This file must NOT be named lessons.tsx: that would resolve to the same
// URL path ("/lessons") as the real standalone screen at src/app/lessons.tsx,
// and the two colliding routes cause expo-router's navigator to loop
// indefinitely (redirecting into itself) instead of reaching the real screen.
export default function LessonsTabFallback() {
  return <Redirect href="/lessons" />
}
