import { useEffect, useReducer, useRef } from 'react'
import { View, Text } from 'react-native'
import type { BasicsStep, ChoiceOption, Tone } from '../../../data/basics/types'
import {
  CHOICE_START,
  choiceCheck,
  choiceRetry,
  choiceSelect,
  isSettled,
  rightFirstTime,
  toneFeedback,
  toneLabel,
  toneRetryHint,
  type ChoiceState,
} from '../../../lib/basicsEngine'
import { TONE_SHAPES } from '../../../lib/basics'
import { pinyinToZhuyin } from '../../../lib/zhuyin'
import { hanziFont } from '../../../lib/hanzi'
import { carefulHaptic, correctHaptic, tickHaptic } from '../../../lib/haptics'
import { playCorrectSound, playRetryTone } from '../../../lib/sound'
import { AudioButton, playZh } from '../audio'
import { BasicsPill } from '../parts'
import { ToneContour } from '../ToneContour'
import {
  Card,
  FeedbackPanel,
  OptionFrame,
  Reading,
  hanziCount,
  StepTitle,
  type BasicsCtx,
  type OptionState,
  type StepProps,
} from '../lessonParts'
import { basicsColors as c } from '../tokens'

/*
 * A multiple-choice check. Select, then Check — so a slip of the finger isn't
 * an answer. A wrong first answer gets specific feedback (the option's own
 * `why`, or for tones what was picked versus heard) and a second try with the
 * wrong option ruled out; a second miss shows the answer. Listening checks
 * play once on arrival and can be replayed, normal or slow, at any point.
 */

type Choice = Extract<BasicsStep, { kind: 'choice' }>

type Action = { type: 'select'; index: number } | { type: 'check'; answer: number } | { type: 'retry' }

function reduce(state: ChoiceState, action: Action): ChoiceState {
  switch (action.type) {
    case 'select':
      return choiceSelect(state, action.index)
    case 'check':
      return choiceCheck(state, action.answer)
    case 'retry':
      return choiceRetry(state)
  }
}

export function ChoiceStep({ step, ctx, stepId, setGate, onGraded }: StepProps<Choice>) {
  const [state, dispatch] = useReducer(reduce, CHOICE_START)
  const audio = step.audio ? ctx.zh(step.audio) : null
  const audioId = `${stepId}-q`
  const graded = useRef(false)

  /* Play the question once on arrival. */
  useEffect(() => {
    if (!audio) return
    const t = setTimeout(() => playZh(audio, audioId), 350)
    return () => clearTimeout(t)
  }, [audio, audioId])

  useEffect(() => {
    if (state.status === 'answering') {
      setGate({
        label: 'Check',
        enabled: state.picked !== null,
        onPress: () => dispatch({ type: 'check', answer: step.answer }),
      })
    } else if (state.status === 'wrong') {
      setGate({ label: 'Try again', enabled: true, onPress: () => dispatch({ type: 'retry' }) })
    } else if (state.status === 'right') {
      setGate({ label: 'Continue', enabled: true, correct: ctx.text(step.explain) })
    } else {
      setGate({ label: 'Continue', enabled: true })
    }
  }, [state.status, state.picked, step.answer, step.explain, ctx, setGate])

  /* Sound and haptics on each check; the grade once, when the step settles. */
  const lastTries = useRef(0)
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

  const isToneQuestion = step.options.every((o) => o.tone)
  /* Two to a row only for short faces. A sentence gets the full width, so it
     reads on one line instead of wrapping every two characters (SS1025). */
  const compact = step.options.every((o) => o.tone || o.symbol || (o.zh && !o.label && hanziCount(ctx.zh(o.zh)) <= 3))
  const pickedOption = state.picked !== null ? step.options[state.picked] : null

  const message =
    state.status === 'wrong' && pickedOption
      ? pickedOption.why
        ? ctx.text(pickedOption.why)
        : isToneQuestion
          ? toneRetryHint(pickedOption.tone as Tone)
          : 'Have another look, then try again.'
      : state.status === 'revealed' && isToneQuestion && pickedOption
        ? `${toneFeedback(pickedOption.tone as Tone, step.options[step.answer].tone as Tone)} ${ctx.text(step.explain)}`
        : ctx.text(step.explain)

  return (
    <View>
      <BasicsPill label={audio ? 'Listening check' : 'Quick check'} />
      <StepTitle>{ctx.text(step.prompt)}</StepTitle>

      {audio && (
        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <AudioButton text={audio} id={audioId} size={76} label="Play the sound again" />
          <AudioButton text={audio} id={audioId} size={48} slow label="Play it slowly" />
        </View>
      )}

      {step.zh && (
        <Card style={{ marginTop: 16, alignItems: 'center', paddingVertical: 14 }}>
          <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 52, lineHeight: 68, color: c.navy }}>
            {ctx.zh(step.zh.zh)}
          </Text>
          <Reading pinyin={step.zh.pinyin} ctx={ctx} size={16} center />
        </Card>
      )}

      <View
        style={{
          marginTop: 18,
          gap: 10,
          flexDirection: compact ? 'row' : 'column',
          flexWrap: compact ? 'wrap' : 'nowrap',
        }}
      >
        {step.options.map((option, i) => {
          const optionState = stateOf(i, state, step.answer)
          return (
            <View key={i} style={compact ? { flexBasis: '47%', flexGrow: 1 } : undefined}>
              <OptionFrame
                state={optionState}
                onPress={
                  state.status === 'answering'
                    ? () => {
                        tickHaptic()
                        dispatch({ type: 'select', index: i })
                      }
                    : undefined
                }
                label={optionLabel(option, ctx)}
                minHeight={compact ? 72 : 56}
                center={compact}
              >
                <OptionFace option={option} ctx={ctx} />
              </OptionFrame>
            </View>
          )
        })}
      </View>

      {/* A right answer is told by the lesson's answer sheet instead. */}
      {state.status !== 'right' && <FeedbackPanel
        status={state.status}
        message={message}
        replay={audio ? { text: audio, id: `${audioId}-fb` } : undefined}
      />}
    </View>
  )
}

function stateOf(i: number, state: ChoiceState, answer: number): OptionState {
  if (state.status === 'answering') {
    if (state.ruledOut.includes(i)) return 'ruledOut'
    return state.picked === i ? 'selected' : 'idle'
  }
  if (state.status === 'wrong') {
    if (i === state.picked) return 'wrong'
    return state.ruledOut.includes(i) ? 'ruledOut' : 'idle'
  }
  /* Settled: show the answer, and the last wrong pick if there was one. */
  if (i === answer) return 'right'
  if (state.status === 'revealed' && i === state.picked) return 'wrong'
  return 'faded'
}

function OptionFace({ option, ctx }: { option: ChoiceOption; ctx: BasicsCtx }) {
  if (option.tone) {
    return (
      <View style={{ alignItems: 'center' }}>
        <ToneContour tone={option.tone} width={64} />
        <Text className="font-nunito-bold" style={{ fontSize: 14, color: c.navy }}>
          {toneLabel(option.tone)}
        </Text>
      </View>
    )
  }
  if (option.symbol) {
    return (
      <View style={{ alignItems: 'center' }}>
        <Text className="font-nunito-bold" style={{ fontSize: 30, lineHeight: 38, color: c.navy }}>
          {option.symbol[ctx.phonetic]}
        </Text>
        {ctx.both && (
          <Text className="font-nunito-semibold" style={{ fontSize: 13, color: c.slate }}>
            {option.symbol[ctx.phonetic === 'pinyin' ? 'zhuyin' : 'pinyin']}
          </Text>
        )}
      </View>
    )
  }
  if (option.zh) {
    return (
      <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 26, lineHeight: 36, color: c.navy, textAlign: 'center' }}>
        {ctx.zh(option.zh)}
      </Text>
    )
  }
  if (option.pinyin) {
    return (
      <View>
        <Reading pinyin={option.pinyin} ctx={ctx} size={20} />
        {option.label && (
          <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.slate }}>
            {ctx.text(option.label)}
          </Text>
        )}
      </View>
    )
  }
  return (
    <Text className="font-nunito-bold" style={{ fontSize: 17, lineHeight: 23, color: c.navy }}>
      {ctx.text(option.label ?? '')}
    </Text>
  )
}

function optionLabel(option: ChoiceOption, ctx: BasicsCtx): string {
  if (option.tone) return `${toneLabel(option.tone)}, ${TONE_SHAPES[option.tone]}`
  if (option.symbol) return option.symbol[ctx.phonetic]
  if (option.zh) return ctx.zh(option.zh)
  if (option.pinyin) {
    const reading = ctx.phonetic === 'zhuyin' ? pinyinToZhuyin(option.pinyin) : option.pinyin
    return option.label ? `${reading}, ${ctx.text(option.label)}` : reading
  }
  return ctx.text(option.label ?? '')
}
