import { Platform } from 'react-native'
import { clampCrop } from './photoFraming'

/*
 * The profile picture: picked from the photo library, framed by the learner,
 * then kept somewhere that outlives the picker. A platform bridge, like
 * `storage.ts` and `speech.ts`.
 *
 * It is two calls, because the learner frames the photo in between:
 * `pickAvatarPhoto` returns the raw pick and its size, the app's own framing
 * screen (`PhotoFramer`) turns a drag and a pinch into a square crop, and
 * `keepAvatarPhoto` cuts that square out and stores it. The platform's own crop
 * screen (`allowsEditing`) is deliberately not used: its only ways out are
 * "Crop" and a back arrow, and the app cannot change its labels.
 *
 * Things here that are not optional:
 *
 * - **The kept file is the app's own copy.** The picker and the manipulator
 *   both write to the cache directory, which the OS is free to clear — store
 *   that and the avatar goes blank some weeks later for no visible reason. The
 *   copy lives in the document directory, under a fresh name each time, so an
 *   `Image` holding the old URI never shows a cached copy of the previous photo.
 *
 * - **On web the photo is cut to a small data URL.** There is no file system
 *   and the picker's blob URL dies with the tab; a data URL can ride in the
 *   settings blob, but a phone photo as base64 is megabytes and localStorage
 *   holds about five for the whole app. 320px JPEG is ~20kB.
 *
 * - **`expo-image-picker` and `expo-image-manipulator` are imported lazily,
 *   inside a `try`.** A dev build made before a package was added has no native
 *   module, and a module-scope import would take the whole app down on launch
 *   instead of failing one button — the same reason `speechRecognition.ts`
 *   resolves its module late. Without the manipulator the photo is kept uncut;
 *   every avatar is drawn `resizeMode="cover"`, so it still shows centred.
 *
 * Every failure resolves to a result rather than throwing: the caller's answer
 * to all of them is the same (leave the picture as it was, say why).
 */

export type { PickedPhoto, AvatarCrop } from './photoFraming'
import type { PickedPhoto, AvatarCrop } from './photoFraming'

export type PickResult = ({ kind: 'picked' } & PickedPhoto) | { kind: 'cancelled' } | { kind: 'denied' } | { kind: 'failed' }

export type KeepResult = { kind: 'kept'; uri: string } | { kind: 'failed' }

/** The size a native avatar is cut to. Drawn at most ~110pt, so 512px is sharp at 3x with room. */
const NATIVE_SIZE = 512
/** The size a web avatar is cut to — see the note on web above. */
const WEB_SIZE = 320

/** Opens the photo library. Nothing is written yet — see `keepAvatarPhoto`. */
export async function pickAvatarPhoto(): Promise<PickResult> {
  let picker: typeof import('expo-image-picker')
  try {
    picker = await import('expo-image-picker')
  } catch {
    return { kind: 'failed' }
  }

  try {
    /* Android 13+ and iOS 14+ open a system picker that needs no permission,
       but older systems do, and asking where it is not needed is a no-op. */
    if (Platform.OS !== 'web') {
      const permission = await picker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted && !permission.accessPrivileges) return { kind: 'denied' }
    }

    const result = await picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (result.canceled || !result.assets?.[0]) return { kind: 'cancelled' }
    const asset = result.assets[0]
    return { kind: 'picked', uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 }
  } catch {
    return { kind: 'failed' }
  }
}

/**
 * Cuts the framed square out of a picked photo and stores it. It does **not**
 * delete the photo it replaces: framing happens inside a form that can still be
 * cancelled, so the caller removes the old file on Save (and the unsaved new
 * one on Cancel) with `removeAvatarPhoto`.
 */
export async function keepAvatarPhoto(photo: PickedPhoto, crop: AvatarCrop): Promise<KeepResult> {
  const square = clampCrop(photo, crop)
  try {
    if (Platform.OS === 'web') {
      return { kind: 'kept', uri: await cutForWeb(photo.uri, square) }
    }

    const { File, Paths } = await import('expo-file-system')
    let source = photo.uri
    let extension = /\.(png|jpe?g|heic|webp)$/i.exec(photo.uri)?.[1]?.toLowerCase() ?? 'jpg'
    try {
      const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator')
      const rendered = await ImageManipulator.manipulate(photo.uri)
        .crop({ originX: square.originX, originY: square.originY, width: square.size, height: square.size })
        .resize({ width: Math.min(NATIVE_SIZE, square.size) })
        .renderAsync()
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 })
      source = saved.uri
      extension = 'jpg'
    } catch {
      /* No manipulator in this build: keep the photo whole. It still shows
         centred in the circle, just without the learner's framing. */
    }

    const kept = new File(Paths.document, `avatar-${Date.now()}.${extension}`)
    new File(source).copy(kept)
    return { kind: 'kept', uri: kept.uri }
  } catch {
    return { kind: 'failed' }
  }
}

/**
 * Deletes a stored avatar file. Only ever one the app wrote — never a file
 * outside the document directory, and a data URL has nothing to delete.
 */
export function removeAvatarPhoto(uri?: string): void {
  if (!uri || Platform.OS === 'web' || !/\/avatar-\d+\.\w+$/.test(uri)) return
  import('expo-file-system')
    .then(({ File }) => {
      const file = new File(uri)
      if (file.exists) file.delete()
    })
    .catch(() => {})
}

/** Cuts the square out and scales it to `WEB_SIZE`, as a JPEG data URL. */
function cutForWeb(src: string, crop: AvatarCrop): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new (globalThis as unknown as { Image: new () => HTMLImageElement }).Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = WEB_SIZE
      canvas.height = WEB_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no canvas'))
      ctx.drawImage(img, crop.originX, crop.originY, crop.size, crop.size, 0, 0, WEB_SIZE, WEB_SIZE)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = src
  })
}
