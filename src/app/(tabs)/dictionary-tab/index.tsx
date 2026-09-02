// Renders the real Dictionary inside the tab navigator so the bottom nav bar
// stays visible — the standalone /dictionary route has no tab bar and no back
// control, which left the screen a dead end you could only escape with the OS
// back gesture.
//
// This directory must NOT be named "dictionary": that would resolve to the same
// URL path ("/dictionary") as src/app/dictionary.tsx and expo-router would loop.
export { Dictionary as default } from '../../../screens/Dictionary'
