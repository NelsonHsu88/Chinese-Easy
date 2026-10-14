import { useCallback, useRef, useState } from 'react'
import { Image, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { onbSpacing as s } from './tokens'
import { ONB_CONTENT_MAX } from './parts'

/*
 * The redesigned onboarding's watercolour, cropped straight out of the Beta 2.1
 * references by `scripts/processOnboardingRedesignArt.mjs` and keyed into real
 * alpha, so each piece sits on `onbColors.paper` as paint rather than as a
 * picture of a page.
 *
 * Every piece is drawn at the reference's own scale — its pixel width over the
 * mockup's 941 times the column — so a branch covers the same share of the
 * page it did in the design, on any phone. The `ratio`s are the trimmed
 * assets' own width / height; React Native does not size an `Image` from its
 * intrinsic dimensions, so a width with no height lays out at zero and the
 * artwork silently vanishes. Re-running the script means re-checking these.
 */

/** The references' width, which every piece's own width is a share of. */
const REF_WIDTH = 941

const ART = {
  'welcome-hero': { source: require('../../assets/images/onboarding/redesign/welcome-hero.png'), w: 941, h: 538 },
  'welcome-branch': { source: require('../../assets/images/onboarding/redesign/welcome-branch.png'), w: 335, h: 280 },
  'script-hero': { source: require('../../assets/images/onboarding/redesign/script-hero.png'), w: 941, h: 522 },
  'script-branch': { source: require('../../assets/images/onboarding/redesign/script-branch.png'), w: 470, h: 250 },
  'goal-branch': { source: require('../../assets/images/onboarding/redesign/goal-branch.png'), w: 341, h: 252 },
  'goal-foot': { source: require('../../assets/images/onboarding/redesign/goal-foot.png'), w: 941, h: 457 },
  'account-branch': { source: require('../../assets/images/onboarding/redesign/account-branch.png'), w: 471, h: 250 },
  'account-foot': { source: require('../../assets/images/onboarding/redesign/account-foot.png'), w: 941, h: 477 },
  'profile-branch': { source: require('../../assets/images/onboarding/redesign/profile-branch.png'), w: 411, h: 270 },
  'profile-foot': { source: require('../../assets/images/onboarding/redesign/profile-foot.png'), w: 941, h: 567 },
  'reminders-branch': { source: require('../../assets/images/onboarding/redesign/reminders-branch.png'), w: 301, h: 310 },
  'reminders-hero': { source: require('../../assets/images/onboarding/redesign/reminders-hero.png'), w: 941, h: 606 },
  'reminders-foot': {
    source: require('../../assets/images/onboarding/redesign/reminders-foot.png'),
    w: 941,
    h: 300,
    /* Centre of the soft hole the mockup's button left, in the asset's pixels. */
    buttonY: 98,
  },
  'test-branch': { source: require('../../assets/images/onboarding/redesign/test-branch.png'), w: 381, h: 300 },
  'test-foot': { source: require('../../assets/images/onboarding/redesign/test-foot.png'), w: 941, h: 652 },
  'ready-hero': { source: require('../../assets/images/onboarding/redesign/ready-hero.png'), w: 941, h: 705 },
  'ready-foot': { source: require('../../assets/images/onboarding/redesign/ready-foot.png'), w: 941, h: 292 },
} as const

export type ArtPiece = keyof typeof ART

function useColumn() {
  const { width } = useWindowDimensions()
  return Math.min(width, ONB_CONTENT_MAX)
}

/**
 * A sakura branch in a top corner, at the reference's scale.
 *
 * For an `ArtLayer` child. That layer starts under the status bar so other
 * art can be placed against the content; a branch is meant to run off the
 * physical top of the screen, as every reference draws it, so it lifts itself
 * back by the inset.
 */
export function CornerBranch({ piece, side }: { piece: ArtPiece; side: 'left' | 'right' }) {
  const column = useColumn()
  const insets = useSafeAreaInsets()
  const art = ART[piece]
  const width = (art.w / REF_WIDTH) * column
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -insets.top, [side]: 0 }}>
      <Image source={art.source} style={{ width, height: (width * art.h) / art.w }} resizeMode="contain" />
    </View>
  )
}

/**
 * The landscape along the foot of a page, full column width, behind the
 * footer. Each foot carries soft holes where its reference's buttons were, so
 * the app's own button sits over clear paper rather than over a painting of one.
 *
 * `clearBelow` is the window y the painting must start under — the bottom of a
 * page's form, from `useClearance`. On a phone too short for both, the
 * painting is lowered (its foot running off the screen) rather than drawn
 * behind the fields, where its colour made labels and errors hard to read.
 */
export function PageFoot({
  piece,
  buttonCenter,
  clearBelow,
}: {
  piece: ArtPiece
  buttonCenter?: number
  clearBelow?: number | null
}) {
  const column = useColumn()
  const insets = useSafeAreaInsets()
  const art: { source: number; w: number; h: number; buttonY?: number } = ART[piece]
  const height = (column * art.h) / art.w
  /*
   * Where a page's footer sits lower than its mockup's, the foot is dropped so
   * its button hole lands under the app's button rather than above it, with the
   * landscape showing through the label. Only ever dropped, never lifted: a
   * lifted foot would leave a band of bare paper under the painting.
   */
  let bottom = 0
  if (art.buttonY !== undefined && buttonCenter !== undefined) {
    const holeFromBottom = ((art.h - art.buttonY) / art.w) * column
    bottom = Math.min(0, insets.bottom + buttonCenter - holeFromBottom)
  }

  /*
   * Where the painting's top would be, read from layout rather than
   * `measureInWindow`: this sits inside a `SlideIn` that is still travelling
   * when it mounts, and a measurement would include that offset. `ArtLayer`
   * begins at the top inset, so layout y plus the inset is window y.
   */
  const [naturalTop, setNaturalTop] = useState<number | null>(null)
  const onProbeLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(insets.top + event.nativeEvent.layout.y)
    setNaturalTop((prev) => (prev === next ? prev : next))
  }
  const drop =
    clearBelow != null && naturalTop !== null ? Math.max(0, clearBelow + FOOT_CLEARANCE - naturalTop) : 0

  return (
    <>
      <View
        pointerEvents="none"
        onLayout={onProbeLayout}
        style={{ position: 'absolute', bottom, left: 0, width: column, height }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: bottom - drop, left: 0 }}>
        <Image source={art.source} style={{ width: column, height }} resizeMode="contain" />
      </View>
    </>
  )
}

/** Paper left between a form's last line and the painting's soft top edge. */
const FOOT_CLEARANCE = 8

/**
 * The window y of a view's bottom edge, for `PageFoot`'s `clearBelow`.
 *
 * Put the returned `ref` and `onLayout` on a view that is not itself animated
 * (a measurement includes transforms). It re-measures whenever that view
 * changes size — an error line appearing under a field moves the painting down
 * with it. `null` until measured, and if `onLayout` never fires (it doesn't
 * always on web) the painting simply stays where the design put it.
 */
export function useClearance() {
  const ref = useRef<View>(null)
  const [bottom, setBottom] = useState<number | null>(null)
  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => {
      const next = Math.round(y + height)
      setBottom((prev) => (prev === next ? prev : next))
    })
  }, [])
  return { ref, onLayout, bottom }
}

/** The least a hero gives up to: still recognisably Shifu in a garden. */
const HERO_MIN = 120

/**
 * A page's hero scene — Shifu in his setting — as a flex child of the page.
 *
 * It is the one element on its page with give: it takes whatever height the
 * text and cards leave, up to its natural height, and on a short phone it
 * shrinks — keeping its proportions, sitting on the line below it — before
 * anything else is pushed off the screen.
 *
 * **The slot is measured, not left to percentages.** The image is laid out
 * absolutely, so it contributes nothing to the slot's size, and is drawn at
 * `min(natural, slot)` once the slot reports its height. A `maxHeight: '100%'`
 * did the same job on a fixed page but not inside the onboarding's scrolling
 * pages: a scroll container's content has no definite height, so on web the
 * percentage resolved to nothing and the scene kept its full height, cropping
 * Shifu through the face and pushing the cards under the footer.
 *
 * It bleeds past the page's content margin to the column's edges, as the
 * references draw it.
 */
export function HeroArt({ piece, align = 'end' }: { piece: ArtPiece; align?: 'start' | 'end' | 'center' }) {
  const column = useColumn()
  const art = ART[piece]
  const natural = (column * art.h) / art.w
  const [slot, setSlot] = useState(0)
  const height = Math.max(0, Math.min(natural, slot))
  const width = (height * art.w) / art.h
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => {
        const next = Math.round(e.nativeEvent.layout.height)
        setSlot((prev) => (Math.abs(prev - next) < 1 ? prev : next))
      }}
      style={{
        flex: 1,
        minHeight: Math.min(HERO_MIN, natural),
        marginHorizontal: -s.screen,
      }}
    >
      {height > 0 && (
        <Image
          source={art.source}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width,
            height,
            left: (column - width) / 2,
            ...(align === 'start' ? { top: 0 } : align === 'center' ? { top: (slot - height) / 2 } : { bottom: 0 }),
          }}
        />
      )}
    </View>
  )
}
