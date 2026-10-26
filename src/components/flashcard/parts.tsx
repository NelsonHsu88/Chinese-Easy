import type { ReactNode } from 'react'
import { View, Text, Image, Animated, useWindowDimensions } from 'react-native'
import { Timer } from 'lucide-react-native'
import { onbVerdict } from '../onboarding/tokens'
import type { PlayTint } from '../dashboard/tokens'
import { RaisedProgressBar } from '../progress/RaisedProgressBar'
import { useSessionProgressStart } from '../progress/sessionProgress'
import { fcArt } from './art'
import { RaisedButton } from '../dashboard/parts'
import { dashShoulders } from '../dashboard/tokens'
import {
  fcColors as c,
  fcShadow,
  fcType as t,
  fcSize,
  FC_CONTENT_MAX,
  FC_HILLS_RATIO,
  FC_SAKURA_RATIO,
} from './tokens'
import { BackArrow } from '../BackArrow'

/*
 * The pieces the flashcard and the remedial "rewrite it" reps share, so the two
 * screens a learner moves between mid-session are one design rather than two.
 */

export function useFlashcardColumn() {
  const { width } = useWindowDimensions()
  const column = Math.min(width, FC_CONTENT_MAX)
  return { column, cardWidth: column - fcSize.pad * 2 }
}

export const disc = {
  width: fcSize.disc,
  height: fcSize.disc,
  borderRadius: fcSize.disc / 2,
  backgroundColor: c.disc,
  borderWidth: 1,
  borderColor: c.border,
  alignItems: 'center',
  justifyContent: 'center',
} as const

export const card = {
  borderRadius: fcSize.radius.card,
  backgroundColor: c.card,
  borderWidth: 1,
  borderColor: c.border,
} as const

/** The inner layer of a card, which clips its paintings to the rounded corners. */
const clip = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  borderRadius: fcSize.radius.card - 1,
  overflow: 'hidden',
} as const

/** A round button on a card or in the header: reset, hint, back. */
export function DiscButton({
  onPress,
  label,
  children,
  tint,
}: {
  onPress: () => void
  label: string
  children: ReactNode
  /** SS1017: a disc may wear one of the shared hues (the hint is honey, replay jade). */
  tint?: PlayTint
}) {
  return (
    <RaisedButton
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      height={disc.height}
      width={disc.width}
      radius={disc.borderRadius}
      fill={tint ? tint.soft : disc.backgroundColor}
      border={tint ? tint.border : disc.borderColor}
      shoulder={tint ? tint.border : dashShoulders.quiet}
      scaleTo={0.9}
    >
      {children}
    </RaisedButton>
  )
}

/** Back, progress and counter; then the label, the quick review's clock and what's left. */
export function FlashcardHeader({
  onClose,
  step,
  total,
  label,
  unit = 'card',
  secondsLeft,
}: {
  onClose: () => void
  step: number
  total: number
  label: string
  unit?: 'card' | 'rep'
  secondsLeft?: number | null
}) {
  const safeTotal = Math.max(1, total)
  const left = Math.max(0, total - step)
  /* Reps count within one word, not the session, so only cards share the session's memory. */
  const sessionFrom = useSessionProgressStart(unit === 'card' ? step : -1, unit === 'card' ? total : -1)
  /*
   * Cards show what's been finished, not the card on screen: 0 / 10 on the
   * first card, and the bar only moves once a card is done (it steps forward
   * as the next one arrives). Reps keep counting the rep being written.
   */
  const shownCount = unit === 'card' ? step - 1 : step
  const from = unit === 'card' ? Math.max(0, sessionFrom - 1) : step - 1
  const urgent = secondsLeft != null && secondsLeft <= 30
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <BackArrow onPress={onClose} accessibilityLabel="Close review" style={{ marginLeft: -8 }} />
        {/* The header mounts per card, so the bar opens on the previous card's progress and steps forward. */}
        <RaisedProgressBar
          progress={shownCount / safeTotal}
          initialProgress={from / safeTotal}
          accessibilityLabel={`${unit === 'rep' ? 'Rep' : 'Card'} ${step} of ${total}`}
        />
        <Text
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={{ fontFamily: 'NunitoBold', ...t.counter, color: c.slate }}
        >
          {shownCount} / {total}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 10 }}>
        <Text style={{ fontFamily: 'NunitoExtraBold', ...t.label, color: c.slate, textTransform: 'uppercase' }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {secondsLeft != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Timer size={13} color={urgent ? onbVerdict.incorrect.text : c.slate} />
              <Text style={{ fontFamily: 'NunitoBold', ...t.counter, color: urgent ? onbVerdict.incorrect.text : c.slate }}>
                {formatClock(secondsLeft)}
              </Text>
            </View>
          )}
          <Text style={{ fontFamily: 'NunitoSemiBold', ...t.counter, color: c.slate }}>
            {left === 0 ? `last ${unit}` : `${left} left`}
          </Text>
        </View>
      </View>
    </>
  )
}

/**
 * The writing card: sakura and range painted behind, the (transparent) writer
 * over them, and a row of disc buttons in the bottom-right corner.
 */
export function WritingCard({
  minHeight,
  corner,
  cornerLift,
  stageTop = false,
  children,
}: {
  minHeight: number
  /** Disc buttons, bottom right. */
  corner?: ReactNode
  /** Moves the corner discs up (negative px), e.g. ahead of a sheet rising over the card's foot. */
  cornerLift?: Animated.AnimatedInterpolation<number> | Animated.Value
  /**
   * The writer is always a square, so in a card taller than it is wide the
   * square sits at the top and the spare height gathers at the foot (where
   * the discs and the answer sheet go) instead of splitting above and below.
   */
  stageTop?: boolean
  /** The HanziStage. It is laid out inside a 14pt inset. */
  children: ReactNode
}) {
  const { cardWidth } = useFlashcardColumn()
  const sakura = cardWidth * fcSize.sakuraShare
  const hills = cardWidth * fcSize.hillsShare
  return (
    // Shadow outside, clip inside: iOS clips a view's own shadow with its overflow.
    <View style={[card, fcShadow, { flex: 1, minHeight }]}>
      <View style={clip}>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0 }}>
          <Image source={fcArt.sakura} style={{ width: sakura, height: sakura / FC_SAKURA_RATIO }} resizeMode="contain" />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <Image source={fcArt.hills} style={{ width: hills, height: hills / FC_HILLS_RATIO }} resizeMode="contain" />
        </View>
        <View style={{ position: 'absolute', top: 14, bottom: 14, left: 14, right: 14 }}>
          {stageTop ? <View style={{ width: '100%', aspectRatio: 1, maxHeight: '100%' }}>{children}</View> : children}
        </View>
        {corner ? (
          <Animated.View
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              flexDirection: 'row',
              gap: 10,
              transform: cornerLift ? [{ translateY: cornerLift }] : [],
            }}
          >
            {corner}
          </Animated.View>
        ) : null}
      </View>
    </View>
  )
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
