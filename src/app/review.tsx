import { Redirect } from 'expo-router'

// The Review hub lives in the tab bar now (`(tabs)/review-tab.tsx`). This path
// is kept so a deep link or an old `chineseeasy://review` still lands there;
// nothing in the app navigates to it.
export default function ReviewRedirect() {
  return <Redirect href="/review-tab" />
}
