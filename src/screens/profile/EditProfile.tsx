import { Redirect, type Href } from 'expo-router'

/*
 * Edit Profile is a popup over the Profile screen now (`EditProfileSheet`),
 * opened by tapping the profile card. This route stays so a link to
 * `/profile/edit` still arrives somewhere useful: the Profile screen, with the
 * popup already open.
 */
export function EditProfile() {
  return <Redirect href={'/profile?edit=1' as Href} />
}
