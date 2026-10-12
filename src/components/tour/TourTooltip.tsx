import { forwardRef } from 'react'
import { View, Text, Image, Pressable, type StyleProp, type ViewStyle } from 'react-native'
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
export const TourTooltip = forwardRef<Text, TooltipProps>(function TourTooltip(
  { title, body, shifu, large, primaryLabel, onPrimary, secondaryLabel, secondaryHint, onSecondary, progress, width, style },
  titleRef,
) {
  const shifuWidth = large ? k.shifuWelcome : k.shifu
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
          ...tourShadow,
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

          {/* Wraps rather than overflowing: at a large accessibility text size
              the action drops onto its own line instead of off the card. */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              columnGap: 10,
              rowGap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={onSecondary}
                accessibilityRole="button"
                accessibilityLabel={secondaryLabel}
                accessibilityHint={secondaryHint}
                hitSlop={12}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                {({ pressed }) => (
                  <Text style={{ ...t.quiet, color: c.textMuted, opacity: pressed ? 0.6 : 1 }}>{secondaryLabel}</Text>
                )}
              </Pressable>

              {progress && <Dots index={progress.index} count={progress.count} />}
            </View>

            {primaryLabel && onPrimary && (
              <PressableScale onPress={onPrimary} scaleTo={1} haptic={false} accessibilityLabel={primaryLabel}>
                <LiftedFace height={k.buttonHeight} fill={c.cta} shoulder={c.ctaShoulder}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 }}>
                    <Text style={{ ...t.button, color: c.onCta }}>{primaryLabel}</Text>
                    <ArrowRight size={16} color={c.onCta} strokeWidth={2.6} />
                  </View>
                </LiftedFace>
              </PressableScale>
            )}
          </View>
        </View>
      </View>
    </View>
  )
})

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
