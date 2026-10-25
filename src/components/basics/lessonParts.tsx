import { PlayWash } from '../dashboard/playWash'
import { createContext, useContext, useRef, useState } from 'react'
import { View, Text, Animated, type AccessibilityState, type StyleProp, type ViewStyle } from 'react-native'
import { Check, ChevronDown, ChevronUp, Info, RotateCcw } from 'lucide-react-native'
import { ShadowSurface } from '../shadowReveal'
import { dashShadow, type PlayTint } from '../dashboard/tokens'
import { hanziFont } from '../../lib/hanzi'
import { pinyinToZhuyin } from '../../lib/zhuyin'
import { basicsReading, basicsText, zhText } from '../../lib/basics'
import type { Phon, Phonetic, Zh, ZhItem } from '../../data/basics/types'
import type { ScriptMode } from '../../types'
import type { CheckStatus } from '../../lib/basicsEngine'
import { AudioButton, AudioIndicator, playZh } from './audio'
import { PressableScale } from '../dashboard/parts'
import { BasicsRaised, shade } from './parts'
import { useAnswerReaction } from '../motion/questionMotion'
import { AnswerShimmer, AnswerSparks } from '../motion/answerFeedback'
import { basicsColors as c, basicsRadius as radius, basicsSpacing as sp, basicsType as t } from './tokens'

/*
 * The pieces every lesson step is drawn from. All colour comes from
 * `basics/tokens.ts`.
 */

/** How the learner reads: their script, their notation, and "Show both". */
export interface BasicsCtx {
  script: ScriptMode
  phonetic: Phonetic
  both: boolean
  text: (s: Phon) => string
  zh: (z: Zh) => string
}

/**
 * Anything tappable in a lesson, raised: a `BasicsRaised` face on a shoulder
 * that sinks while pressed. Defaults to the card face on the quiet shoulder;
 * `tone` picks the soft-green or selected look, `tint` a group's hue.
 */
export function RaisedTap({
  onPress,
  accessibilityLabel,
  accessibilityState,
  tone = 'card',
  tint,
  radius: r = 16,
  corners,
  borderColor,
  disabled,
  wrapperStyle,
  style,
  underlay,
  children,
}: {
  onPress?: () => void
  accessibilityLabel: string
  accessibilityState?: AccessibilityState
  tone?: 'card' | 'soft' | 'selected'
  tint?: PlayTint | null
  radius?: number
  corners?: { borderTopLeftRadius?: number; borderTopRightRadius?: number }
  /** Overrides the rim colour, e.g. a row the learner has already played. */
  borderColor?: string
  disabled?: boolean
  wrapperStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  underlay?: React.ReactNode
  children: React.ReactNode
}) {
  const look =
    tone === 'selected'
      ? { fill: c.sageSoft, border: c.jade, borderWidth: 2, shoulder: c.shoulder.jade }
      : tone === 'soft'
        ? { fill: c.sageSoft, border: undefined, borderWidth: 0, shoulder: c.shoulder.sage }
        : tint
          ? { fill: tint.fill, border: tint.border, borderWidth: 1, shoulder: shade(tint.soft, 0.12) }
          : { fill: c.card, border: c.border, borderWidth: 1, shoulder: c.shoulder.quiet }
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      scaleTo={1}
      haptic={false}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      wrapperStyle={wrapperStyle}
    >
      <BasicsRaised
        fill={look.fill}
        shoulder={look.shoulder}
        border={borderColor ?? look.border}
        borderWidth={borderColor ? Math.max(1, look.borderWidth) : look.borderWidth}
        radius={r}
        corners={corners}
        underlay={underlay}
        style={style}
      >
        {children}
      </BasicsRaised>
    </PressableScale>
  )
}

export function makeCtx(script: ScriptMode, phonetic: Phonetic, both: boolean): BasicsCtx {
  return {
    script,
    phonetic,
    both,
    text: (s) => basicsText(s, script, phonetic),
    zh: (z) => zhText(z, script),
  }
}

/**
 * What the lesson's bottom button says and does for the current step. A step
 * with no `onPress` advances the lesson.
 */
export interface Gate {
  label: string
  enabled: boolean
  onPress?: () => void
  /**
   * Set when a question was just answered right: the lesson raises the app's
   * correct-answer sheet (`AnswerSheet`, as in New Words and the drills) with
   * this said under the judgement, and its Continue takes over from the button.
   */
  correct?: string
}

export interface StepProps<S> {
  step: S
  ctx: BasicsCtx
  column: number
  /** Unique within the lesson — prefixes audio ids. */
  stepId: string
  setGate: (gate: Gate) => void
  /** Called once when a checked step settles, with whether the first try was right. */
  onGraded: (rightFirstTry: boolean) => void
}

export function StepTitle({ children }: { children: string }) {
  return (
    <Text
      className="font-nunito-extrabold"
      accessibilityRole="header"
      style={{ ...t.stepTitle, marginTop: 6, color: c.navy }}
    >
      {children}
    </Text>
  )
}

export function StepBody({ children }: { children: string }) {
  return (
    <Text className="font-nunito-semibold" style={{ ...t.body, marginTop: sp.sm, color: c.slate }}>
      {children}
    </Text>
  )
}

export function Eyebrow({ children }: { children: string }) {
  return (
    <Text className="font-nunito-bold" style={{ ...t.eyebrow, color: c.sageDark }}>
      {children.toUpperCase()}
    </Text>
  )
}

export function Gloss({ children }: { children: string }) {
  return (
    <Text className="font-nunito-semibold" style={{ marginTop: 2, fontSize: 13.5, lineHeight: 18, color: c.slate }}>
      {children}
    </Text>
  )
}

/**
 * The lesson's group hue (`BASICS_GROUP_HUE`), provided by the lesson screen.
 * Every lesson card takes its wash; answer options and verdicts do not — they
 * keep the app's verdict palette, which must never be confused with decoration.
 */
export const LessonTintContext = createContext<PlayTint | null>(null)

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const tint = useContext(LessonTintContext)
  return (
    <ShadowSurface
      shadow={dashShadow}
      style={[
        {
          borderRadius: radius.row,
          backgroundColor: tint?.fill ?? c.card,
          borderWidth: 1,
          borderColor: tint?.border ?? c.border,
          padding: sp.lg,
        },
        style,
      ]}
    >
      {children}
    </ShadowSurface>
  )
}

/** A reading in the learner's system, plus the other one when asked for both. */
export function Reading({
  pinyin,
  ctx,
  size,
  both,
  center,
}: {
  pinyin?: string
  ctx: BasicsCtx
  size: number
  both?: boolean
  center?: boolean
}) {
  if (!pinyin) return null
  const lines = both || ctx.both ? [pinyin, pinyinToZhuyin(pinyin)] : [basicsReading(pinyin, ctx.phonetic)]
  return (
    <View>
      {lines.map((line, i) => (
        <Text
          key={i}
          className="font-nunito-semibold"
          style={{
            fontSize: size,
            lineHeight: size * 1.35,
            color: i === 0 ? c.sageDark : c.slate,
            textAlign: center ? 'center' : 'left',
          }}
        >
          {line}
        </Text>
      ))}
    </View>
  )
}

export function Hanzi({ zh, ctx, size, color = c.navy }: { zh: Zh; ctx: BasicsCtx; size: number; color?: string }) {
  return (
    <Text
      className={hanziFont(ctx.script, 'medium')}
      style={{ fontSize: size, lineHeight: size * 1.3, color, includeFontPadding: false }}
    >
      {ctx.zh(zh)}
    </Text>
  )
}

/**
 * A word: its hanzi (or traditional → simplified), reading, gloss and a
 * speaker. The whole row plays it.
 */
export function ItemRow({
  item,
  ctx,
  audioId,
  bothReadings,
  bothScripts,
}: {
  item: ZhItem
  ctx: BasicsCtx
  audioId: string
  bothReadings?: boolean
  bothScripts?: boolean
}) {
  const spoken = ctx.zh(item.zh)
  const shown = bothScripts && typeof item.zh !== 'string' ? `${item.zh.t} → ${item.zh.s}` : spoken
  /* Rows take the lesson's group hue, like its cards, so a list of words reads
     as part of the lesson rather than as white form fields. */
  const tint = useContext(LessonTintContext)
  return (
    <RaisedTap
      onPress={() => playZh(spoken, audioId)}
      accessibilityLabel={`${spoken}${item.gloss ? `, ${ctx.text(item.gloss)}` : ''}. Play`}
      tint={tint}
      radius={radius.inner}
      underlay={
        tint ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.inner, overflow: 'hidden' }}>
            <PlayWash tint={tint} />
          </View>
        ) : null
      }
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 14, minHeight: 64 }}
    >
      <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 30, lineHeight: 40, color: c.navy }}>
        {shown}
      </Text>
      <View style={{ flex: 1 }}>
        <Reading pinyin={item.pinyin} ctx={ctx} size={15.5} both={bothReadings} />
        {item.gloss && <Gloss>{ctx.text(item.gloss)}</Gloss>}
      </View>
      <AudioIndicator id={audioId} size={40} />
    </RaisedTap>
  )
}

/** "Learn more" — a short extra, closed until asked for. */
export function LearnMore({ children }: { children: string }) {
  const [open, setOpen] = useState(false)
  const Icon = open ? ChevronUp : ChevronDown
  return (
    <View style={{ marginTop: sp.lg }}>
      {/* A small raised pill, so it reads as something to press. */}
      <View style={{ alignSelf: 'flex-start' }}>
        <RaisedTap
          onPress={() => setOpen((o) => !o)}
          accessibilityLabel="Learn more"
          accessibilityState={{ expanded: open }}
          tone="soft"
          radius={20}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14 }}
        >
          <Info size={16} color={c.sageDark} strokeWidth={2.2} />
          <Text className="font-nunito-bold" style={{ fontSize: 14, color: c.sageDark }}>
            Learn more
          </Text>
          <Icon size={16} color={c.sageDark} strokeWidth={2.2} />
        </RaisedTap>
      </View>
      {open && (
        <Text className="font-nunito-semibold" style={{ ...t.bodySmall, color: c.slate, marginTop: 10 }}>
          {children}
        </Text>
      )}
    </View>
  )
}

/**
 * What a check says after it's made. Never only colour: each state has its
 * own heading and icon, and it is announced to screen readers.
 */
export function FeedbackPanel({
  status,
  message,
  replay,
}: {
  status: CheckStatus
  message: string
  replay?: { text: string; id: string }
}) {
  if (status === 'answering') return null
  const right = status === 'right'
  const heading = right ? 'That’s right' : status === 'wrong' ? 'Not quite. Try again' : 'Here’s the answer'
  const fill = right ? c.rightSoft : status === 'wrong' ? c.wrongSoft : c.unsureSoft
  const ink = right ? c.rightInk : status === 'wrong' ? c.wrongInk : c.unsureInk
  const Icon = right ? Check : status === 'wrong' ? RotateCcw : Info
  return (
    <View
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={`${heading}. ${message}`}
      style={{ marginTop: sp.lg, borderRadius: radius.inner, padding: sp.lg, backgroundColor: fill, flexDirection: 'row', gap: sp.md }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon size={17} color={ink} strokeWidth={2.6} />
          <Text className="font-nunito-bold" style={{ fontSize: 15, color: ink }}>
            {heading}
          </Text>
        </View>
        <Text className="font-nunito-semibold" style={{ ...t.bodySmall, marginTop: sp.xs, color: c.navy }}>
          {message}
        </Text>
      </View>
      {replay && <AudioButton text={replay.text} id={replay.id} size={40} label="Play it again" />}
    </View>
  )
}

export type OptionState = 'idle' | 'selected' | 'right' | 'wrong' | 'ruledOut' | 'faded'

/** The frame of an answer option. */
export function OptionFrame({
  state,
  onPress,
  label,
  children,
  minHeight = 56,
  center = false,
}: {
  state: OptionState
  onPress?: () => void
  label: string
  children: React.ReactNode
  minHeight?: number
  center?: boolean
}) {
  const border =
    state === 'right' ? c.right : state === 'wrong' ? c.wrong : state === 'selected' ? c.selectedBorder : c.border
  const fill =
    state === 'right' ? c.rightSoft : state === 'wrong' ? c.wrongSoft : state === 'selected' ? c.selected : c.card
  const shoulder =
    state === 'right'
      ? c.shoulder.right
      : state === 'wrong'
        ? c.shoulder.wrong
        : state === 'selected'
          ? c.shoulder.selected
          : c.shoulder.quiet
  const disabled = state === 'ruledOut' || !onPress
  /*
   * Only an option the learner picked reacts to being checked: a spring when it
   * was right, a shake when it wasn't. The answer revealed after a second miss
   * goes from idle to right and just changes colour.
   */
  const wasPicked = useRef(false)
  if (state === 'selected') wasPicked.current = true
  else if (state === 'idle' || state === 'ruledOut') wasPicked.current = false
  const picked = wasPicked.current ? (state === 'right' ? 'pop' : state === 'wrong' ? 'shake' : null) : null
  const reaction = useAnswerReaction(picked)
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      scaleTo={1}
      haptic={false}
      accessibilityLabel={
        label +
        (state === 'selected' ? ', selected' : '') +
        (state === 'right' ? ', correct' : state === 'wrong' || state === 'ruledOut' ? ', not correct' : '')
      }
    >
      <Animated.View style={{ opacity: state === 'ruledOut' ? 0.45 : state === 'faded' ? 0.6 : 1, transform: reaction.transform }}>
        <BasicsRaised
          fill={fill}
          shoulder={shoulder}
          border={border}
          borderWidth={state === 'idle' || state === 'faded' || state === 'ruledOut' ? 1.5 : 2}
          radius={18}
          underlay={<AnswerShimmer play={picked === 'pop'} radius={18} />}
          style={{
            minHeight,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: center ? 'center' : 'flex-start',
            gap: 10,
          }}
        >
          <View style={{ flex: center ? 0 : 1, alignItems: center ? 'center' : 'flex-start' }}>{children}</View>
          {state === 'right' && <Check size={20} color={c.rightInk} strokeWidth={2.6} />}
          {(state === 'wrong' || state === 'ruledOut') && (
            <Text className="font-nunito-bold" style={{ fontSize: 18, color: c.wrongInk }}>
              ×
            </Text>
          )}
        </BasicsRaised>
        <AnswerSparks play={picked === 'pop'} />
      </Animated.View>
    </PressableScale>
  )
}

/** A small rounded chip — initials, finals, tones in the builder. */
export function Chip({
  label,
  selected,
  disabled,
  onPress,
  accessibilityLabel,
  big,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onPress: () => void
  accessibilityLabel?: string
  big?: boolean
}) {
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      scaleTo={1}
      haptic={false}
      accessibilityLabel={(accessibilityLabel ?? label) + (selected ? ', selected' : '')}
    >
      <View style={{ opacity: disabled ? 0.35 : 1 }}>
        <BasicsRaised
          fill={selected ? c.sageSoft : c.card}
          shoulder={selected ? c.shoulder.jade : c.shoulder.quiet}
          border={selected ? c.jade : c.border}
          borderWidth={selected ? 2 : 1}
          radius={14}
          style={{
            minWidth: 48,
            height: big ? 56 : 48,
            paddingHorizontal: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="font-nunito-bold" style={{ fontSize: big ? 20 : 18, color: selected ? c.jadeDark : c.navy }}>
            {label}
          </Text>
        </BasicsRaised>
      </View>
    </PressableScale>
  )
}
