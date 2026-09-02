import { View, Image, type ImageStyle, type StyleProp } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { onbArt } from './tokens'

/*
 * The onboarding scenery.
 *
 * Every piece in here is decoration, and decoration follows two rules the rest
 * of the UI does not:
 *
 *  1. **It is absolutely positioned, never in the flex column.** A mountain
 *     panorama placed as a normal child consumes layout height, which pushes
 *     the call to action up off its line and makes the same button sit at a
 *     different height on every screen. Out of flow, it costs nothing and the
 *     three-region layout stays honest.
 *  2. **It ignores the 22pt content margin and is allowed to run off the
 *     edge.** A sakura branch that stops politely inside the margin reads as a
 *     sticker; one clipped by the screen edge reads as a branch that carries on
 *     past it. `overflow: hidden` on the page container does the clipping.
 *
 * `ArtLayer` sets `pointerEvents="none"` for the whole layer — none of this is
 * touchable, and a branch overlapping the top-right corner would otherwise
 * swallow taps on Skip. It goes on the wrapping View rather than on each
 * `Image`, which does not accept the prop.
 */

const sakura = require('../../assets/images/onboarding/sakura-branch.png')
const pagoda = require('../../assets/images/onboarding/pagoda-mountains.png')
const panorama = require('../../assets/images/onboarding/mountains-panorama.png')
const cloudA = require('../../assets/images/onboarding/cloud-a.png')
const cloudB = require('../../assets/images/onboarding/cloud-b.png')
const cloudC = require('../../assets/images/onboarding/cloud-c.png')

/** Source aspect ratios, so a width is all any caller has to choose. */
const RATIO = {
  sakura: 560 / 318,
  pagoda: 460 / 277,
  panorama: 880 / 326,
  cloudA: 200 / 88,
  cloudB: 200 / 99,
  cloudC: 180 / 58,
} as const

function Art({
  source,
  width,
  ratio,
  style,
  opacity = 1,
  flip = false,
}: {
  source: number
  width: number
  ratio: number
  style: StyleProp<ImageStyle>
  opacity?: number
  flip?: boolean
}) {
  return (
    <Image
      source={source}
      style={[
        { position: 'absolute', width, height: width / ratio, opacity },
        flip ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
      resizeMode="contain"
    />
  )
}

/**
 * The sakura branch in a top corner.
 *
 * The render grows left-to-right from a trunk at its bottom-left, which is the
 * welcome screen's left-hand placement as drawn. Every other screen wants it in
 * the top-right with the trunk at the corner, so it is mirrored rather than
 * shipped twice — `scaleX: -1` on a 200kB PNG is free, a second copy is not.
 */
export function SakuraCorner({
  side,
  width,
  top = -18,
  inset = -30,
}: {
  side: 'left' | 'right'
  width: number
  top?: number
  inset?: number
}) {
  return (
    <Art
      source={sakura}
      width={width}
      ratio={RATIO.sakura}
      flip={side === 'right'}
      style={side === 'left' ? { left: inset, top } : { right: inset, top }}
    />
  )
}

/**
 * The pagoda on its ridge, on the right.
 *
 * Anchored by `top` or by `bottom`, never both. The welcome screen places it
 * from the top because it sits in open sky partway down the page; the script
 * screen places it from the bottom so it stays on the range it is standing on
 * however tall the viewport turns out to be.
 */
export function PagodaScene({
  width,
  top,
  bottom,
  right = -34,
}: {
  width: number
  top?: number
  bottom?: number
  right?: number
}) {
  return (
    <Art
      source={pagoda}
      width={width}
      ratio={RATIO.pagoda}
      style={bottom !== undefined ? { right, bottom } : { right, top }}
      opacity={0.92}
    />
  )
}

/**
 * The mountain panorama, pinned across the bottom of the page.
 *
 * Deliberately wider than the screen and centred by a negative inset on both
 * sides: the render's ridges run out to its own edges, and fitting it exactly
 * to the viewport puts a hard vertical stop where the watercolour simply ends.
 */
export function MountainBase({
  width,
  bottom = 0,
  opacity = onbArt.panorama,
}: {
  width: number
  bottom?: number
  opacity?: number
}) {
  const drawn = width * 1.18
  return (
    <Art
      source={panorama}
      width={drawn}
      ratio={RATIO.panorama}
      opacity={opacity}
      style={{ left: (width - drawn) / 2, bottom }}
    />
  )
}

/** A drifting cloud. Static — the spec rules out looping animation. */
export function Cloud({
  variant,
  width,
  top,
  left,
  right,
  opacity = onbArt.cloud,
}: {
  variant: 'a' | 'b' | 'c'
  width: number
  top: number
  left?: number
  right?: number
  opacity?: number
}) {
  const source = variant === 'a' ? cloudA : variant === 'b' ? cloudB : cloudC
  const ratio = variant === 'a' ? RATIO.cloudA : variant === 'b' ? RATIO.cloudB : RATIO.cloudC
  return (
    <Art
      source={source}
      width={width}
      ratio={ratio}
      opacity={opacity}
      style={left !== undefined ? { left, top } : { right, top }}
    />
  )
}

/**
 * Holds a page's scenery behind its content.
 *
 * A single absolutely-filled layer, so the artwork stacks in the order the
 * spec asks for — clouds and mist behind, mountains and pagoda in the middle,
 * mascot in front (the mascot is a normal flex child of the page, so it lands
 * above this layer automatically).
 */
export function ArtLayer({ children }: { children: React.ReactNode }) {
  /*
   * The layer starts at the *bottom of the status bar*, not at the physical top
   * of the screen, and that offset is a fix rather than a detail.
   *
   * `OnbShell` renders this layer outside its `SafeAreaView` — it has to, or the
   * scenery could not bleed past the edges. But that also meant a `top` given to
   * a piece of art was measured from the physical top while every piece of
   * content it was placed against started an inset lower. So the same
   * `top={-24}` that sat correctly on a device with no top inset rode up into
   * the status bar on a notched phone, and the branch on the script and goal
   * pages looked jammed against the top edge. It went unnoticed because it is
   * invisible on exactly the devices without a notch.
   *
   * Insetting the layer's top makes `top` mean "from where the page's content
   * begins" on every device, which is what each call site's number was chosen
   * against. `bottom` is deliberately left at 0: the panorama is *meant* to run
   * off the bottom edge, under the home indicator.
   */
  const insets = useSafeAreaInsets()
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top, left: 0, right: 0, bottom: 0 }}
    >
      {children}
    </View>
  )
}
