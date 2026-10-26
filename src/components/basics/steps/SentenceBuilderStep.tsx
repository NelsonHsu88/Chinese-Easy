import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { View, Text, Animated } from 'react-native'
import type { BasicsStep, ZhItem } from '../../../data/basics/types'
import {
  ORDER_START,
  isSettled,
  orderCheck,
  orderFeedback,
  orderPlace,
  orderRemove,
  orderRetry,
  rightFirstTime,
  type OrderState,
} from '../../../lib/basicsEngine'
import { hanziFont } from '../../../lib/hanzi'
import { carefulHaptic, correctHaptic, tickHaptic } from '../../../lib/haptics'
import { playCorrectSound, playRetryTone } from '../../../lib/sound'
import { AudioButton } from '../audio'
import { BasicsPill, BasicsRaised } from '../parts'
import { PressableScale } from '../../dashboard/parts'
import { FeedbackPanel, Reading, StepTitle, type BasicsCtx, type StepProps } from '../lessonParts'
import { useFlipTiles, type TileMotion } from '../../motion/flipTiles'
import { basicsColors as c } from '../tokens'

/*
 * Word order: tap tiles into the answer line, tap a placed tile to lift it
 * back. Check tells you how much of the start is right; Try again keeps that
 * much in place. A second miss lays the words out in order.
 *
 * Motion (SS1025, Duolingo-style): a tapped tile glides from the bank to its
 * place in the line and back, its neighbours sliding to make or close the
 * room, via `useFlipTiles`. Each word keeps its own slot in the bank — an
 * empty hole while it is placed — so a word always returns to where it came
 * from and the bank never reflows under the learner's finger.
 */

type Builder = Extract<BasicsStep, { kind: 'sentence-builder' }>

type Action =
  | { type: 'place'; word: number; total: number }
  | { type: 'remove'; position: number }
  | { type: 'check'; words: { key: string }[] }
  | { type: 'retry' }

function reduce(state: OrderState, action: Action): OrderState {
  switch (action.type) {
    case 'place':
      return orderPlace(state, action.word, action.total)
    case 'remove':
      return orderRemove(state, action.position)
    case 'check':
      return orderCheck(state, action.words)
    case 'retry':
      return orderRetry(state)
  }
}

export function SentenceBuilderStep({ step, ctx, stepId, setGate, onGraded }: StepProps<Builder>) {
  const [state, dispatch] = useReducer(reduce, ORDER_START)
  const keys = useMemo(() => step.words.map((w) => ({ key: ctx.zh(w.zh) })), [step.words, ctx])
  const total = step.words.length
  const sentence = keys.map((k) => k.key).join('') + step.end
  const graded = useRef(false)
  const lastTries = useRef(0)
  /* Whichever area a tile is flying into is drawn above the other, so the
     tile passes over it rather than under it. */
  const [front, setFront] = useState<'line' | 'bank'>('line')

  useEffect(() => {
    if (state.status === 'answering') {
      setGate({
        label: 'Check',
        enabled: state.placed.length === total,
        onPress: () => dispatch({ type: 'check', words: keys }),
      })
    } else if (state.status === 'wrong') {
      setGate({
        label: 'Try again',
        enabled: true,
        onPress: () => {
          /* The words after the right start fly home, so the bank draws on top. */
          setFront('bank')
          dispatch({ type: 'retry' })
        },
      })
    } else if (state.status === 'right') {
      setGate({ label: 'Continue', enabled: true, correct: `${sentence} ${ctx.text(step.explain)}` })
    } else {
      setGate({ label: 'Continue', enabled: true })
    }
  }, [state.status, state.placed.length, total, keys, sentence, step.explain, ctx, setGate])

  useEffect(() => {
    if (state.tries === lastTries.current) return
    lastTries.current = state.tries
    if (state.status === 'right') {
      playCorrectSound()
      correctHaptic()
    } else {
      playRetryTone()
      carefulHaptic()
    }
    if (isSettled(state.status) && !graded.current) {
      graded.current = true
      onGraded(rightFirstTime(state))
    }
  }, [state, onGraded])

  /* Settled: the line shows the sentence in order, whatever was placed. */
  const settled = isSettled(state.status)
  const shownLine = settled ? step.words.map((_, i) => i) : state.placed
  const inLine = useMemo(() => new Set(shownLine), [shownLine])

  const placedOf = useCallback((id: string) => inLine.has(Number(id)), [inLine])
  const { containerRef, slotRef, motionFor, lift, rebaseline } = useFlipTiles(`${state.status}|${shownLine.join(',')}`, placedOf)
  const place = (word: number) => {
    tickHaptic()
    lift(String(word))
    setFront('line')
    dispatch({ type: 'place', word, total })
  }
  const remove = (word: number, position: number) => {
    tickHaptic()
    lift(String(word))
    setFront('bank')
    dispatch({ type: 'remove', position })
  }

  return (
    <View ref={containerRef as never} onLayout={rebaseline}>
      <BasicsPill label="Build the sentence" />
      <StepTitle>{ctx.text(step.prompt)}</StepTitle>
      <Text className="font-nunito-semibold-italic" style={{ marginTop: 8, fontSize: 18, lineHeight: 25, color: c.slate }}>
        “{step.meaning}”
      </Text>

      {/* The answer line. */}
      <View
        accessible
        accessibilityLabel={
          shownLine.length ? `Your sentence: ${shownLine.map((i) => keys[i].key).join(' ')}` : 'Your sentence is empty'
        }
        style={{
          marginTop: 18,
          minHeight: 88,
          borderRadius: 18,
          borderWidth: 1.5,
          borderStyle: shownLine.length ? 'solid' : 'dashed',
          borderColor: state.status === 'right' ? c.right : state.status === 'wrong' ? c.wrong : c.border,
          backgroundColor: state.status === 'right' ? c.rightSoft : c.card,
          padding: 10,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          zIndex: front === 'line' ? 2 : 1,
        }}
      >
        {shownLine.length === 0 && (
          <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.textMuted }}>
            Tap the words below in order.
          </Text>
        )}
        {shownLine.map((word, position) => (
          <FlyingTile
            key={word}
            slot={slotRef(String(word))}
            motion={motionFor(String(word))}
            item={step.words[word]}
            ctx={ctx}
            placed
            marked={state.status === 'wrong' && position >= state.rightPrefix}
            onPress={state.status === 'answering' ? () => remove(word, position) : undefined}
          />
        ))}
        {settled && (
          <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 26, color: c.navy }}>
            {step.end}
          </Text>
        )}
      </View>

      {/* The word bank: one fixed slot per word, a hole while it is placed. */}
      {!settled && (
        <View
          style={{
            marginTop: 16,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            zIndex: front === 'bank' ? 2 : 1,
          }}
        >
          {step.shuffled.map((word) =>
            inLine.has(word) ? (
              <Hole key={word} item={step.words[word]} ctx={ctx} />
            ) : (
              <FlyingTile
                key={word}
                slot={slotRef(String(word))}
                motion={motionFor(String(word))}
                item={step.words[word]}
                ctx={ctx}
                onPress={state.status === 'answering' ? () => place(word) : undefined}
              />
            ),
          )}
        </View>
      )}

      {settled && (
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <AudioButton text={sentence} id={`${stepId}-sentence`} size={52} label="Play the sentence" />
          <AudioButton text={sentence} id={`${stepId}-sentence`} size={40} slow label="Play the sentence slowly" />
        </View>
      )}

      {/* A right answer is told by the lesson's answer sheet instead. */}
      {state.status !== 'right' && (
        <FeedbackPanel
          status={state.status}
          message={state.status === 'wrong' ? orderFeedback(state, total) : `${orderFeedback(state, total)} ${ctx.text(step.explain)}`}
        />
      )}
    </View>
  )
}

/**
 * A tile in its slot. The slot (outer view) is laid out normally and never
 * transformed, so it can be measured; the tile inside it carries the flight.
 */
function FlyingTile({
  slot,
  motion,
  ...tile
}: {
  slot: (v: unknown) => void
  motion: TileMotion
} & TileProps) {
  return (
    <View ref={slot as never}>
      <Animated.View
        style={{ transform: [{ translateX: motion.pos.x }, { translateY: motion.pos.y }, { scale: motion.scale }] }}
      >
        <Tile {...tile} tone={motion.tone} />
      </Animated.View>
    </View>
  )
}

/** Where a placed word waits to come back to: its own size, empty. */
function Hole({ item, ctx }: { item: ZhItem; ctx: BasicsCtx }) {
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, backgroundColor: c.track }} />
      <View style={{ opacity: 0 }}>
        <Tile item={item} ctx={ctx} />
      </View>
    </View>
  )
}

type TileProps = {
  item: ZhItem
  ctx: BasicsCtx
  onPress?: () => void
  placed?: boolean
  marked?: boolean
}

function Tile({ item, ctx, onPress, placed = false, marked = false, tone }: TileProps & { tone?: Animated.Value }) {
  const text = ctx.zh(item.zh)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      haptic={false}
      accessibilityLabel={`${text}${item.gloss ? `, ${item.gloss}` : ''}${placed ? '. Tap to remove' : '. Tap to add'}`}
    >
      <BasicsRaised
        fill={c.card}
        shoulder={marked ? c.shoulder.wrong : placed ? c.shoulder.sage : c.shoulder.quiet}
        border={marked ? c.wrong : c.border}
        borderWidth={marked ? 2 : 1}
        radius={14}
        /* The placed look fades in over the plain face as the tile lands. */
        underlay={
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 13,
              backgroundColor: c.sageSoft,
              opacity: tone ?? (placed ? 1 : 0),
            }}
          />
        }
        style={{
          minWidth: 56,
          minHeight: 60,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 24, lineHeight: 32, color: c.navy }}>
          {text}
        </Text>
        <Reading pinyin={item.pinyin} ctx={ctx} size={12.5} center />
      </BasicsRaised>
    </PressableScale>
  )
}
