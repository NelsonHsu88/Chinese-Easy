import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { Eye, Lightbulb, PenLine, RotateCcw } from 'lucide-react-native'
import type { BasicsStep } from '../../../data/basics/types'
import { HanziStage } from '../../HanziStage'
import { hanziFont } from '../../../lib/hanzi'
import { successHaptic, tickHaptic } from '../../../lib/haptics'
import { BasicsPill, BasicsRaised } from '../parts'
import { PressableScale } from '../../dashboard/parts'
import { Card, Reading, StepBody, StepTitle, type StepProps } from '../lessonParts'
import { basicsColors as c, BASICS_GUTTER } from '../tokens'

/*
 * Writing on the app's own stroke writer (`HanziStage`, hanzi-writer in a
 * WebView). `watch` plays the animation; the quiz levels take help away one
 * at a time — `guided` flashes the next stroke as you start, `outline` shows
 * only the faint character, `free` just the grid (hanzi-writer still offers a
 * hint after repeated misses, so nobody is stranded).
 *
 * Writing is practice, not a check: it's never scored into the lesson, and
 * a quiz can always be skipped.
 */

type Of<K extends BasicsStep['kind']> = Extract<BasicsStep, { kind: K }>

const GUIDANCE_PILL: Record<Of<'stroke'>['guidance'], string> = {
  watch: 'Watch',
  guided: 'Trace with help',
  outline: 'Trace the outline',
  free: 'On your own',
}

export function StrokeStep({ step, ctx, column, setGate }: StepProps<Of<'stroke'>>) {
  const character = ctx.zh(step.character)
  const size = Math.min(column - BASICS_GUTTER * 2 - 40, 260)
  const quiz = step.guidance !== 'watch'
  const [run, setRun] = useState(0)
  const [hint, setHint] = useState(0)
  const [result, setResult] = useState<number | null>(null)

  useEffect(() => {
    if (!quiz) setGate({ label: 'Continue', enabled: true })
    else setGate(result === null ? { label: 'Skip for now', enabled: true } : { label: 'Continue', enabled: true })
  }, [quiz, result, setGate])

  /* Guided: flash the first stroke once the writer has had a moment to load. */
  useEffect(() => {
    if (step.guidance !== 'guided') return
    const t = setTimeout(() => setHint((n) => n + 1), 900)
    return () => clearTimeout(t)
  }, [step.guidance, run])

  const restart = () => {
    tickHaptic()
    setResult(null)
    setRun((n) => n + 1)
  }

  return (
    <View>
      <BasicsPill label={GUIDANCE_PILL[step.guidance]} />
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>
      <Card style={{ marginTop: 16, alignItems: 'center', paddingVertical: 18 }}>
        <HanziStage
          character={character}
          mode={quiz ? 'quiz' : 'demo'}
          showOutline={step.guidance !== 'free'}
          showGuides
          holdCharacterOnComplete
          resetKey={run}
          hintKey={hint}
          maxSize={size}
          onQuizComplete={(mistakes) => {
            successHaptic()
            setResult(mistakes)
          }}
        />
        {result !== null && (
          <Text
            accessibilityLiveRegion="polite"
            className="font-lora"
            style={{ marginTop: 12, fontSize: 15, lineHeight: 21, color: c.navy, textAlign: 'center' }}
          >
            {result === 0
              ? 'Clean. Every stroke in order and in the right direction.'
              : `Done, with ${result} ${result === 1 ? 'correction' : 'corrections'}. Write it again for a cleaner run, or carry on.`}
          </Text>
        )}
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SmallAction icon={RotateCcw} label={quiz ? 'Start again' : 'Replay'} onPress={restart} />
          {quiz && result === null && (
            <SmallAction icon={Lightbulb} label="Hint" onPress={() => setHint((n) => n + 1)} />
          )}
        </View>
      </Card>
    </View>
  )
}

export function StrokePickerStep({ step, ctx, column }: StepProps<Of<'stroke-picker'>>) {
  const [picked, setPicked] = useState(0)
  const [mode, setMode] = useState<'demo' | 'quiz'>('demo')
  const [run, setRun] = useState(0)
  const [written, setWritten] = useState(0)
  const item = step.characters[picked]
  const character = ctx.zh(item.zh)
  const size = Math.min(column - BASICS_GUTTER * 2 - 40, 230)

  return (
    <View>
      <BasicsPill label="Free practice" />
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>

      <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {step.characters.map((ch, i) => (
          <PressableScale
            key={i}
            onPress={() => {
              tickHaptic()
              setPicked(i)
              setMode('demo')
              setRun((n) => n + 1)
            }}
            scaleTo={1}
            haptic={false}
            accessibilityLabel={`${ctx.zh(ch.zh)}, ${ch.gloss ?? ''}${picked === i ? ', selected' : ''}`}
          >
            <BasicsRaised
              fill={picked === i ? c.sageSoft : c.card}
              shoulder={picked === i ? c.shoulder.jade : c.shoulder.quiet}
              border={picked === i ? c.jade : c.border}
              borderWidth={picked === i ? 2 : 1}
              radius={14}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 26, lineHeight: 34, color: c.navy }}>
                {ctx.zh(ch.zh)}
              </Text>
            </BasicsRaised>
          </PressableScale>
        ))}
      </View>

      <Card style={{ marginTop: 16, alignItems: 'center', paddingVertical: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Reading pinyin={item.pinyin} ctx={ctx} size={16} />
          <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.slate }}>
            {item.gloss}
          </Text>
        </View>
        <HanziStage
          key={`${character}-${mode}`}
          character={character}
          mode={mode}
          showOutline={mode === 'demo'}
          showGuides
          holdCharacterOnComplete
          resetKey={run}
          maxSize={size}
          onQuizComplete={() => {
            successHaptic()
            setWritten((n) => n + 1)
          }}
        />
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
          <SmallAction icon={Eye} label="Watch" active={mode === 'demo'} onPress={() => (setMode('demo'), setRun((n) => n + 1))} />
          <SmallAction icon={PenLine} label="Write" active={mode === 'quiz'} onPress={() => (setMode('quiz'), setRun((n) => n + 1))} />
          <SmallAction icon={RotateCcw} label="Again" onPress={() => setRun((n) => n + 1)} />
        </View>
        {written > 0 && (
          <Text className="font-nunito-bold" style={{ marginTop: 10, fontSize: 13, color: c.sageDark }}>
            {written} written this session
          </Text>
        )}
      </Card>
    </View>
  )
}

function SmallAction({
  icon: Icon,
  label,
  onPress,
  active = false,
}: {
  icon: typeof RotateCcw
  label: string
  onPress: () => void
  active?: boolean
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={1} haptic={false} accessibilityLabel={label + (active ? ', selected' : '')}>
      <BasicsRaised
        fill={active ? c.jade : c.sageSoft}
        shoulder={active ? c.shoulder.jade : c.shoulder.sage}
        radius={22}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14 }}
      >
        <Icon size={15} color={active ? c.onSolid : c.sageDark} strokeWidth={2.2} />
        <Text className="font-nunito-bold" style={{ fontSize: 13.5, color: active ? c.onSolid : c.sageDark }}>
          {label}
        </Text>
      </BasicsRaised>
    </PressableScale>
  )
}
