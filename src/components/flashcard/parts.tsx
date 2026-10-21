import type { ReactNode } from 'react'
import { View, Text, Pressable, Image, useWindowDimensions } from 'react-native'
import { ChevronLeft, Timer } from 'lucide-react-native'
import { onbVerdict } from '../onboarding/tokens'
import type { PlayTint } from '../dashboard/tokens'
import { RaisedProgressBar } from '../progress/RaisedProgressBar'
import { useSessionProgressStart } from '../progress/sessionProgress'
import { fcArt } from './art'
import {
  fcColors as c,
  fcShadow,
  fcType as t,
  fcSize,
  FC_CONTENT_MAX,
  FC_HILLS_RATIO,
  FC_SAKURA_RATIO,
} from './tokens'

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
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <View style={[disc, fcShadow, tint ? { backgroundColor: tint.soft, borderColor: tint.border } : null]}>{children}</View>
    </Pressable>
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
  const from = unit === 'card' ? sessionFrom : step - 1
  const urgent = secondsLeft != null && secondsLeft <= 30
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <DiscButton onPress={onClose} label="Close review">
          <ChevronLeft size={24} color={c.greenDark} strokeWidth={2.4} />
        </DiscButton>
        {/* The header mounts per card, so the bar opens on the previous card's progress and steps forward. */}
        <RaisedProgressBar
          progress={step / safeTotal}
          initialProgress={from / safeTotal}
          accessibilityLabel={`${unit === 'rep' ? 'Rep' : 'Card'} ${step} of ${total}`}
        />
        <Text
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={{ fontFamily: 'NunitoBold', ...t.counter, color: c.slate }}
        >
          {step} / {total}
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
  children,
}: {
  minHeight: number
  /** Disc buttons, bottom right. */
  corner?: ReactNode
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
        <View style={{ position: 'absolute', top: 14, bottom: 14, left: 14, right: 14 }}>{children}</View>
        {corner ? (
          <View style={{ position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', gap: 10 }}>{corner}</View>
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
