import { useEffect, useState } from 'react'
import { View, Text, TextInput, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Check, X } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { keepAvatarPhoto, pickAvatarPhoto, removeAvatarPhoto, type AvatarCrop, type PickedPhoto } from '../../lib/avatarPhoto'
import { tickHaptic } from '../../lib/haptics'
import { Avatar, ProfileButton, useProfileCosmetics } from './parts'
import { PhotoFramer } from './PhotoFramer'
import { profColors as c, profSpacing as s, profType as t, profRadius, profShadow } from './tokens'

/*
 * Edit Profile, as a popup over the Profile screen: tapping the profile card
 * opens it, so the learner edits the card while looking at it rather than on a
 * separate page in another design.
 *
 * Everything here is a draft until Save — including the photo. That matters
 * for the photo in a way it does not for text: picking one writes a file, so
 * Cancel deletes the file it would otherwise orphan, and Save deletes the one
 * it replaces. Settings never points at a file that has been removed.
 */

const NAME_MAX = 24

export function EditProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp()
  const { sakura } = useProfileCosmetics()
  const [name, setName] = useState(settings.username)
  const [email, setEmail] = useState(settings.email)
  const [photo, setPhoto] = useState(settings.avatarUri)
  const [photoNote, setPhotoNote] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  /** A photo just picked, being framed — nothing is written until its Save. */
  const [framing, setFraming] = useState<PickedPhoto | null>(null)

  /* Each opening starts from what is stored, not from an abandoned draft. */
  useEffect(() => {
    if (!visible) return
    setName(settings.username)
    setEmail(settings.email)
    setPhoto(settings.avatarUri)
    setPhotoNote(null)
    setFraming(null)
    // Only on opening — a settings change while open must not wipe the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  /* Blank is allowed; a wrong-looking address is not. Deliberately loose —
     anything stricter only ever rejects somebody's real address. */
  const emailOk = trimmedEmail.length === 0 || /^\S+@\S+\.\S+$/.test(trimmedEmail)
  const canSave = trimmedName.length > 0 && trimmedName.length <= NAME_MAX && emailOk

  /** Drops a draft photo that was picked here and never saved. */
  const discardDraftPhoto = (uri?: string) => {
    if (uri && uri !== settings.avatarUri) removeAvatarPhoto(uri)
  }

  const choosePhoto = async () => {
    if (picking) return
    setPicking(true)
    setPhotoNote(null)
    const result = await pickAvatarPhoto()
    setPicking(false)
    if (result.kind === 'picked') {
      setFraming({ uri: result.uri, width: result.width, height: result.height })
    } else if (result.kind === 'denied') {
      setPhotoNote('Allow photo access in your phone’s settings to choose a picture.')
    } else if (result.kind === 'failed') {
      setPhotoNote('Couldn’t open your photos. Please try again.')
    }
  }

  /** The framer's Save: cut the chosen square out and make it the draft photo. */
  const keepFramed = async (picked: PickedPhoto, crop: AvatarCrop) => {
    const kept = await keepAvatarPhoto(picked, crop)
    setFraming(null)
    if (kept.kind === 'kept') {
      tickHaptic()
      discardDraftPhoto(photo)
      setPhoto(kept.uri)
    } else {
      setPhotoNote('Couldn’t save that photo. Please try again.')
    }
  }

  const clearPhoto = () => {
    tickHaptic()
    discardDraftPhoto(photo)
    setPhoto(undefined)
  }

  const cancel = () => {
    /* Android's back button closes the framer first, not the whole form. */
    if (framing) {
      setFraming(null)
      return
    }
    discardDraftPhoto(photo)
    onClose()
  }

  const save = () => {
    if (!canSave) return
    if (settings.avatarUri && settings.avatarUri !== photo) removeAvatarPhoto(settings.avatarUri)
    updateSettings({ username: trimmedName, email: trimmedEmail, avatarUri: photo })
    onClose()
  }

  const input = {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.tile,
    borderRadius: profRadius.medium,
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    fontSize: 16,
    color: c.navy,
  } as const

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: s.screen }}>
          {/* The scrim is a sibling behind the card, not its parent: nested
              Pressables double-fire on web, so a tap on the card would also
              count as a tap outside it and close the popup mid-edit. */}
          <Pressable
            onPress={cancel}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim }}
          />
          <View
            style={{ alignSelf: 'center', width: '100%', maxWidth: 400, maxHeight: '100%', backgroundColor: c.background, borderRadius: 24, borderWidth: 1, borderColor: c.border, ...profShadow }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: s.xl }} bounces={false}>
              <View className="flex-row items-center justify-between">
                <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ ...t.section, color: c.navy }}>
                  Edit Profile
                </Text>
                <Pressable onPress={cancel} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancel" className="active:opacity-60">
                  <X size={22} color={c.slate} />
                </Pressable>
              </View>

              <View className="items-center" style={{ marginTop: s.md }}>
                <Avatar
                  name={trimmedName}
                  photo={photo}
                  sakura={sakura}
                  size={96}
                  badge={{ onPress: choosePhoto, accessibilityLabel: photo ? 'Change profile photo' : 'Choose a profile photo' }}
                />
                <View className="flex-row items-center" style={{ gap: s.lg, marginTop: s.xs }}>
                  <Pressable onPress={choosePhoto} hitSlop={8} accessibilityRole="button" className="active:opacity-60">
                    <Text className="font-nunito-semibold" style={{ ...t.link, color: c.jadeDark }}>
                      {picking ? 'Opening photos…' : photo ? 'Change photo' : 'Choose photo'}
                    </Text>
                  </Pressable>
                  {photo && !picking && (
                    <Pressable onPress={clearPhoto} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove profile photo" className="active:opacity-60">
                      <Text className="font-nunito-semibold" style={{ ...t.link, color: c.slate }}>
                        Remove
                      </Text>
                    </Pressable>
                  )}
                </View>
                {photoNote && (
                  <Text className="font-nunito-semibold" style={{ ...t.tag, color: c.coralDark, marginTop: s.sm, textAlign: 'center' }}>
                    {photoNote}
                  </Text>
                )}
              </View>

              <Text className="font-nunito-extrabold" style={{ ...t.link, color: c.navy, marginTop: s.xl, marginBottom: 6 }}>
                Display name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={NAME_MAX}
                placeholder="Your name"
                placeholderTextColor={c.textMuted}
                accessibilityLabel="Display name"
                className="font-nunito-semibold"
                style={input}
              />
              <Text className="font-nunito-semibold" style={{ ...t.tag, color: c.slate, marginTop: 6 }}>
                Shown on your profile and Dashboard. Up to {NAME_MAX} characters.
              </Text>

              <Text className="font-nunito-extrabold" style={{ ...t.link, color: c.navy, marginTop: s.lg, marginBottom: 6 }}>
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={c.textMuted}
                accessibilityLabel="Email address"
                className="font-nunito-semibold"
                style={[input, !emailOk && { borderColor: c.coral }]}
              />
              <Text className="font-nunito-semibold" style={{ ...t.tag, color: emailOk ? c.slate : c.coralDark, marginTop: 6 }}>
                {emailOk ? 'From the account you signed in with. Never shared.' : 'That doesn’t look like an email address.'}
              </Text>

              {/* The profile's own 3D buttons — the same lifted face as View Rewards. */}
              <View className="flex-row" style={{ gap: s.sm, marginTop: s.xl }}>
                <ProfileButton label="Cancel" tone="quiet" onPress={cancel} />
                <View style={{ flex: 1, opacity: canSave ? 1 : 0.45 }} pointerEvents={canSave ? 'auto' : 'none'}>
                  <View className="flex-row">
                    <ProfileButton label="Save" icon={Check} tone="primary" onPress={save} />
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
          {framing && <PhotoFramer photo={framing} onCancel={() => setFraming(null)} onSave={keepFramed} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
