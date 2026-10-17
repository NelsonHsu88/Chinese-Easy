import { useEffect, useMemo, useReducer, useRef } from 'react'
import { View, Text } from 'react-native'
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
import { basicsColors as c } from '../tokens'

/*
 * Word order: tap tiles into the answer line, tap a placed tile to lift it
 * back. Check tells you how much of the start is right; Try again keeps that
 * much in place. A second miss lays the words out in order.
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

  useEffect(() => {
    if (state.status === 'answering') {
      setGate({
        label: 'Check',
        enabled: state.placed.length === total,
        onPress: () => dispatch({ type: 'check', words: keys }),
      })
    } else if (state.status === 'wrong') {
      setGate({ label: 'Try again', enabled: true, onPress: () => dispatch({ type: 'retry' }) })
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
  const shownLine = isSettled(state.status) ? step.words.map((_, i) => i) : state.placed
  const bank = step.shuffled.filter((i) => !state.placed.includes(i))

  return (
    <View>
      <BasicsPill label="Build the sentence" />
      <StepTitle>{ctx.text(step.prompt)}</StepTitle>
      <Text className="font-lora-italic" style={{ marginTop: 8, fontSize: 18, lineHeight: 25, color: c.slate }}>
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
        }}
      >
        {shownLine.length === 0 && (
          <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.textMuted }}>
            Tap the words below in order.
          </Text>
        )}
        {shownLine.map((word, position) => (
          <Tile
            key={`${word}-${position}`}
            item={step.words[word]}
            ctx={ctx}
            placed
            marked={state.status === 'wrong' && position >= state.rightPrefix}
            onPress={
              state.status === 'answering'
                ? () => {
                    tickHaptic()
                    dispatch({ type: 'remove', position })
                  }
                : undefined
            }
          />
        ))}
        {isSettled(state.status) && (
          <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 26, color: c.navy }}>
            {step.end}
          </Text>
        )}
      </View>

      {/* The word bank. */}
      {!isSettled(state.status) && (
        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {bank.map((word) => (
            <Tile
              key={word}
              item={step.words[word]}
              ctx={ctx}
              onPress={
                state.status === 'answering'
                  ? () => {
                      tickHaptic()
                      dispatch({ type: 'place', word, total })
                    }
                  : undefined
              }
            />
          ))}
        </View>
      )}

      {isSettled(state.status) && (
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

function Tile({
  item,
  ctx,
  onPress,
  placed = false,
  marked = false,
}: {
  item: ZhItem
  ctx: BasicsCtx
  onPress?: () => void
  placed?: boolean
  marked?: boolean
}) {
  const text = ctx.zh(item.zh)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      haptic={false}
      accessibilityLabel={`${text}${item.gloss ? `, ${item.gloss}` : ''}${placed ? '. Tap to remove' : '. Tap to add'}`}
    >
      <BasicsRaised
        fill={placed ? c.sageSoft : c.card}
        shoulder={marked ? c.shoulder.wrong : placed ? c.shoulder.sage : c.shoulder.quiet}
        border={marked ? c.wrong : c.border}
        borderWidth={marked ? 2 : 1}
        radius={14}
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
