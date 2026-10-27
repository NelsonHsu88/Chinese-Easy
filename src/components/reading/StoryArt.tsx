import { Image } from 'react-native'
import type { Story } from '../../types'
import { STORY_COVERS } from './storyCovers'

interface Props {
  story: Story
  width: number
  height: number
  radius: number
  /** The image has loaded and is ready to show. */
  onLoad?: () => void
}

/** The general 讀 cover, from `processLibraryArt.mjs`, for a story without its own painting. */
const GENERAL_COVER = require('../../assets/images/library/general-cover.jpg')

let prefetched = false
/**
 * Warms every cover, once per launch, so a book opens on its own cover at once
 * rather than after it downloads. That matters in development, where each
 * image is fetched from the dev server; a release bundles them locally and
 * this is a no-op for those.
 */
export function prefetchStoryCovers() {
  if (prefetched) return
  prefetched = true
  for (const source of [...Object.values(STORY_COVERS), GENERAL_COVER]) {
    try {
      // react-native-web has no resolveAssetSource; there a required asset is already its URL (or an object holding one).
      const uri =
        typeof Image.resolveAssetSource === 'function'
          ? Image.resolveAssetSource(source as number)?.uri
          : typeof source === 'string'
            ? source
            : (source as { uri?: string })?.uri
      if (uri && /^https?:|^\//.test(uri)) Image.prefetch(uri).catch(() => {})
    } catch {
      // Warming is a nicety; a cover that wasn't prefetched simply loads when shown.
    }
  }
}

/** A story's cover image: its own painting (`storyCovers.ts`), else the general cover. */
export function coverFor(story: Story) {
  return STORY_COVERS[story.id] ?? GENERAL_COVER
}

/*
 * A story's cover. Each painting is 3:4; a box of any other shape crops it
 * (`cover`), so the library's wide feature card and square thumbnails show the
 * middle of the scene.
 */
export function StoryArt({ story, width, height, radius, onLoad }: Props) {
  return (
    <Image
      source={coverFor(story)}
      onLoad={onLoad}
      // Android fades images in on its own; whoever shows this decides how it arrives.
      fadeDuration={0}
      style={{ width, height, borderRadius: radius }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  )
}
