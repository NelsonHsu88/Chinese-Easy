import { Redirect } from 'expo-router'

// The "Review" tab button never actually navigates here (see the tabPress
// listener in ./_layout.tsx, which always intercepts it and pushes the real
// standalone /review route instead) — this only exists so Tabs.Screen has a
// route to point at, and redirects as a fallback if it's ever reached directly.
//
// This file must NOT be named review.tsx: that would resolve to the same URL
// path ("/review") as the real standalone screen at src/app/review.tsx, and
// the two colliding routes cause expo-router's navigator to loop indefinitely
// instead of reaching the real screen.
export default function ReviewTabFallback() {
  return <Redirect href="/review" />
}
