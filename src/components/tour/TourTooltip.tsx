import { forwardRef, useEffect, useRef, useState } from 'react'
import { View, Text, Image, Platform, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import type { TextInstance } from 'react-native'
import { ArrowRight } from 'lucide-react-native'
import { PressableScale, LiftedFace } from '../dashboard/parts'
import { tourColors as c, tourShadow, tourCard as k, tourType as t } from './tokens'
import { tourShifu, tourSakura } from './art'
import type { TourShifu } from '../../lib/tour'

/*
 * The tour's one card, built to the reference's `tooltip_primary` /
 * `tooltip_compact` / `tooltip_small`: warm ivory paper with a warm hairline, a
 * sakura sprig in the top-right corner, a restrained serif title, one sentence,
 * one jade action. The welcome prompt is the same card with a larger Shifu and
 * a second, quieter action.
 *
 * Deliberately compact. Onboarding's big type and painted scenery are the
 * welcome; inside the app the card has to sit beside real UI without
 * competing with it.
 */

export interface TooltipProps {
  title: string
  body: string
  shifu?: TourShifu
  /** The larger Shifu of the welcome prompt. */
  large?: boolean
  primaryLabel?: string
  onPrimary?: () => void
  /** "Skip tour" / "Maybe later". */
  secondaryLabel: string
  secondaryHint: string
  onSecondary: () => void
  /** "n of 4" dots. Omitted on the welcome prompt. */
  progress?: { index: number; count: number }
  width: number
  style?: StyleProp<ViewStyle>
}

/** The ref is the title, which is where screen-reader focus is sent on arrival. */
export const TourTooltip = forwardRef<TextInstance, TooltipProps>(function TourTooltip(
  { title, body, shifu, large, primaryLabel, onPrimary, secondaryLabel, secondaryHint, onSecondary, progress, width, style },
  titleRef,
) {
  const shifuWidth = large ? k.shifuWelcome : k.shifu
  const line = useOneLine(!!progress, !!(primaryLabel && onPrimary), primaryLabel, width)
  const art = shifu ? tourShifu[shifu] : null

  return (
    <View
      style={[
        {
          width,
          borderRadius: k.radius,
          backgroundColor: c.paper,
          borderWidth: 1,
          borderColor: c.edge,
          /* Not on Android: the tooltip fades in and out on the native driver,
             and there a fading parent doesn't fade its children's elevation
             shadow — it showed before the card and lingered after it. Over the
             tour's navy scrim the shadow is barely visible anyway. */
          ...(Platform.OS === 'android' ? null : tourShadow),
        },
        style,
      ]}
    >
      {/* Decoration is clipped inside its own rounded box, so the card itself
          can keep `overflow: visible` and with it the iOS shadow. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: k.radius, overflow: 'hidden' }}
      >
        <Image
          source={tourSakura.source}
          resizeMode="contain"
          style={{ position: 'absolute', top: -4, right: -6, width: k.sakura, height: k.sakura / tourSakura.ratio, opacity: 0.9 }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {art && (
          /* Shifu stands on the card's bottom edge, beside the copy rather
             than over it. He is decoration and takes no touches. */
          <View pointerEvents="none" style={{ marginLeft: 10, marginRight: -4 }}>
            <Image
              source={art.source}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              style={{ width: shifuWidth, height: shifuWidth / art.ratio }}
            />
          </View>
        )}

        <View
          style={{
            flex: 1,
            paddingLeft: art ? 12 : k.paddingX,
            paddingRight: k.paddingX,
            paddingTop: k.paddingTop,
            paddingBottom: k.paddingBottom,
          }}
        >
          <Text
            ref={titleRef}
            accessibilityRole="header"
            style={{ ...t.title, color: c.navy, paddingRight: 34 }}
          >
            {title}
          </Text>
          <Text style={{ ...t.body, color: c.slate, marginTop: 4 }}>{body}</Text>

          {/* Skip, the dots and the action always share one line, so the card
              never grows a second row of buttons. Where they don't fit beside
              Shifu (a long label, a narrow phone, large text), the action's
              arrow goes, then the two buttons' type and padding shrink together
              until they do (`useOneLine`). */}
          <View
            onLayout={line.onRow}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: ROW_GAP }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ROW_GAP, flexShrink: 0 }}>
              {/* Raised like the CTA, quietly: white on a grey shoulder. */}
              <View onLayout={line.onSkip} style={{ flexShrink: 0 }}>
                <PressableScale
                  onPress={onSecondary}
                  scaleTo={1}
                  haptic={false}
                  accessibilityLabel={secondaryLabel}
                  accessibilityHint={secondaryHint}
                >
                  <LiftedFace height={k.buttonHeight} fill={c.quietFace} border={c.quietBorder} shoulder={c.quietShoulder} shadow={false}>
                    <Text
                      numberOfLines={1}
                      style={{ ...t.quiet, fontSize: t.quiet.fontSize * line.fit, color: c.textMuted, paddingHorizontal: 12 * line.fit }}
                    >
                      {secondaryLabel}
                    </Text>
                  </LiftedFace>
                </PressableScale>
              </View>

              {progress && (
                <View onLayout={line.onDots} style={{ flexShrink: 0 }}>
                  <Dots index={progress.index} count={progress.count} />
                </View>
              )}
            </View>

            {primaryLabel && onPrimary && (
              <View onLayout={line.onCta} style={{ flexShrink: 0 }}>
                <PressableScale onPress={onPrimary} scaleTo={1} haptic={false} accessibilityLabel={primaryLabel}>
                  <LiftedFace height={k.buttonHeight} fill={c.cta} shoulder={c.ctaShoulder}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * line.fit, paddingHorizontal: 14 * line.fit }}>
                      <Text numberOfLines={1} style={{ ...t.button, fontSize: t.button.fontSize * line.fit, color: c.onCta }}>
                        {primaryLabel}
                      </Text>
                      {line.arrow && <ArrowRight size={16} color={c.onCta} strokeWidth={2.6} />}
                    </View>
                  </LiftedFace>
                </PressableScale>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  )
})

/** Space between the skip button, the dots and the action. */
const ROW_GAP = 8
/** The smallest the buttons' type and padding may shrink to, as a share of full size. */
const MIN_FIT = 0.72

/**
 * Keeps the action row on one line. Each piece reports its width; when they
 * add up to more than the row has, the buttons (not the dots, which are
 * already small) are scaled by the share that makes them fit. Widths are
 * divided back to full size first, so the answer doesn't drift between
 * passes. A platform that never reports a layout keeps full size.
 */
function useOneLine(hasDots: boolean, hasCta: boolean, ctaLabel: string | undefined, cardWidth: number) {
  const [fit, setFit] = useState(1)
  /* First the arrow goes (it says nothing the button doesn't), then the type shrinks. */
  const [arrow, setArrow] = useState(true)
  const fitRef = useRef(1)
  const arrowRef = useRef(true)
  const sizes = useRef({ row: 0, skip: 0, dots: 0, cta: 0 })

  /* A new label or card starts again from full size, arrow and all. */
  useEffect(() => {
    fitRef.current = 1
    arrowRef.current = true
    setFit(1)
    setArrow(true)
  }, [ctaLabel, cardWidth])

  const settle = () => {
    const z = sizes.current
    if (!z.row || !z.skip || (hasDots && !z.dots) || (hasCta && !z.cta)) return
    const pieces = 1 + (hasDots ? 1 : 0) + (hasCta ? 1 : 0)
    const fixed = (hasDots ? z.dots : 0) + ROW_GAP * (pieces - 1)
    /* The buttons' width at full size; their few points of border don't scale, which the margin covers. */
    const full = (z.skip + (hasCta ? z.cta : 0)) / fitRef.current
    const next = Math.max(MIN_FIT, Math.min(1, (z.row - fixed - 2) / full))
    if (next < 1 && hasCta && arrowRef.current) {
      /* Re-measured without it; the CTA's next report settles the rest. */
      arrowRef.current = false
      setArrow(false)
      return
    }
    if (Math.abs(next - fitRef.current) > 0.01) {
      fitRef.current = next
      setFit(next)
    }
  }
  const report = (key: 'row' | 'skip' | 'dots' | 'cta') => (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (Math.abs(sizes.current[key] - w) < 0.5) return
    sizes.current[key] = w
    settle()
  }
  return { fit, arrow, onRow: report('row'), onSkip: report('skip'), onDots: report('dots'), onCta: report('cta') }
}

/** Where the learner is in the four steps. Read out as text, not just colour. */
function Dots({ index, count }: { index: number; count: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 14 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === index ? c.cta : c.edge,
          }}
        />
      ))}
    </View>
  )
}
