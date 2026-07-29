import { Redirect } from 'expo-router'

// The "Review" tab button never actually navigates here (see the tabPress
// listener in ./_layout.tsx, which always intercepts it and pushes the real
// standalone /review route instead) — this only exists so Tabs.Screen has a
// route to point at, and redirects as a fallback if it's ever reached directly.
export default function ReviewTabFallback() {
  return <Redirect href="/review" />
}
