import { Image } from 'react-native'
import type { Story } from '../../types'

interface Props {
  /** Kept so callers stay story-shaped; every story wears the same cover. */
  story: Story
  width: number
  height: number
  radius: number
  /** The image has loaded and is ready to show. */
  onLoad?: () => void
}

/** The one cover every book wears, from `processLibraryArt.mjs`. */
const GENERAL_COVER = require('../../assets/images/library/general-cover.jpg')

/*
 * A story's cover: the general 讀 cover, whatever the story. Every book in the
 * library deliberately looks alike on the shelf — what tells them apart is the
 * title, reading and English beside it.
 *
 * The per-story covers are still committed under images/covers/, but stories.ts
 * no longer `require`s them: an unread `require` still bundles its file, and
 * those 31 JPEGs were 3.4MB in every install. Going back to individual covers
 * means restoring the `art:` lines (git history, or re-running
 * buildStoryCovers.mjs) and reading `art` here.
 */
export function StoryArt({ width, height, radius, onLoad }: Props) {
  return (
    <Image
      source={GENERAL_COVER}
      onLoad={onLoad}
      // Android fades images in on its own; whoever shows this decides how it arrives.
      fadeDuration={0}
      style={{ width, height, borderRadius: radius }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  )
}
