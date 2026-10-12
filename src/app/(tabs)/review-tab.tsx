// The Review hub, as real tab content — so the tab bar stays under it like
// every other tab. (It used to be a redirect-only fallback, with the tab press
// intercepted to push a standalone /review over the tabs.)
//
// This file must NOT be named review.tsx: that would resolve to the same URL
// path ("/review") as src/app/review.tsx, and the two colliding routes cause
// expo-router's navigator to loop indefinitely instead of reaching either.
export { Review as default } from '../../screens/Review'
