import { Redirect, useLocalSearchParams, type Href } from 'expo-router'

/*
 * Profile is a tab now (`/profile-tab`). Old links to `/profile` — and
 * `/profile?edit=1`, which opens the editor on arrival — land there.
 */
export default function ProfileRedirect() {
  const { edit } = useLocalSearchParams<{ edit?: string }>()
  return <Redirect href={(edit ? '/profile-tab?edit=1' : '/profile-tab') as Href} />
}
