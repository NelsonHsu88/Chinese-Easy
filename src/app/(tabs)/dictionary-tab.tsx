// Renders the real Dictionary inside the tab navigator so the bottom nav bar
// stays visible — the standalone /dictionary route has no tab bar and no back
// control, which left the screen a dead end you could only escape with the OS
// back gesture. The screen's own Words/Radicals/My Words segmented control
// already covers what the tab-press picker sheet used to offer, so that sheet
// is no longer wired up for this tab.
//
// This file must NOT be named dictionary.tsx: that would resolve to the same URL
// path ("/dictionary") as src/app/dictionary.tsx and expo-router would loop.
export { Dictionary as default } from '../../screens/Dictionary'
