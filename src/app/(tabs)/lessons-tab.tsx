// This file must NOT be named lessons.tsx: that would resolve to the same
// URL path ("/lessons") as the real standalone screen at src/app/lessons.tsx,
// and the two colliding routes cause expo-router's navigator to loop
// indefinitely (redirecting into itself) instead of reaching the real screen.
export { Learn as default } from '../../screens/Learn'
