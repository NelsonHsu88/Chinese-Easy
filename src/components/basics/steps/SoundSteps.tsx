import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { Check } from 'lucide-react-native'
import type { BasicsStep, SoundSymbol, Tone, ZhItem } from '../../../data/basics/types'
import { FINALS, INITIALS } from '../../../data/basics/sounds'
import { TONE_SHAPES } from '../../../lib/basics'
import { buildSyllable, combines, toneLabel } from '../../../lib/basicsEngine'
import { pinyinSyllableToZhuyin } from '../../../lib/zhuyin'
import { hanziFont } from '../../../lib/hanzi'
import { tickHaptic, correctHaptic } from '../../../lib/haptics'
import { AudioButton, AudioIndicator, playZh, useAudioPhase } from '../audio'
import { BasicsPill } from '../parts'
import { ToneContour } from '../ToneContour'
import { Card, Chip, Gloss, Hanzi, ItemRow, RaisedTap, Reading, StepBody, StepTitle, type BasicsCtx, type StepProps } from '../lessonParts'
import { PressableScale } from '../../dashboard/parts'
import { basicsColors as c, basicsType as bt } from '../tokens'

/*
 * The pronunciation steps: one sound in focus, a syllable taken apart, the
 * tones with their contours, and the syllable builder.
 *
 * A sound is never played alone (see `components/basics/audio.tsx`): the
 * symbol is shown big, and what plays is a real syllable that carries it.
 * Where a step asks the learner to explore — tap every part, hear every
 * tone — Continue waits until they have, so the step can't be skimmed past.
 */

type Of<K extends BasicsStep['kind']> = Extract<BasicsStep, { kind: K }>

/** The symbol in the learner's notation, with the other one under it for "Show both". */
function Symbol({ symbol, ctx, size }: { symbol: SoundSymbol; ctx: BasicsCtx; size: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text className="font-nunito-bold" style={{ fontSize: size, lineHeight: size * 1.2, color: c.navy }}>
        {symbol[ctx.phonetic]}
      </Text>
      {ctx.both && (
        <Text className="font-nunito-semibold" style={{ fontSize: size * 0.4, color: c.slate }}>
          {symbol[ctx.phonetic === 'pinyin' ? 'zhuyin' : 'pinyin']}
        </Text>
      )}
    </View>
  )
}

/* ── One sound ──────────────────────────────────────────────────────────── */

export function SoundStep({ step, ctx, stepId }: StepProps<Of<'sound'>>) {
  const main = step.examples[0]
  const mainText = ctx.zh(main.zh)
  return (
    <View>
      <BasicsPill label="Sound focus" />
      <Card style={{ marginTop: 12, alignItems: 'center', paddingVertical: 20 }}>
        <Symbol symbol={step.symbol} ctx={ctx} size={72} />
        <Text
          className="font-nunito-semibold"
          style={{ marginTop: 10, fontSize: 16, lineHeight: 23, color: c.navy, textAlign: 'center' }}
        >
          {ctx.text(step.how)}
        </Text>
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <AudioButton text={mainText} id={`${stepId}-main`} size={64} label={`Play ${mainText}`} />
          <AudioButton text={mainText} id={`${stepId}-main`} size={44} slow label={`Play ${mainText} slowly`} />
        </View>
        <Text className="font-nunito-semibold" style={{ marginTop: 8, fontSize: 12.5, color: c.textMuted, textAlign: 'center' }}>
          Heard in {mainText}. A single sound is easiest to hear inside a syllable.
        </Text>
      </Card>

      <Text className="font-nunito-bold" style={{ marginTop: 18, marginBottom: 8, fontSize: 13, letterSpacing: 1.2, color: c.slate }}>
        IN REAL WORDS
      </Text>
      <View style={{ gap: 10 }}>
        {step.examples.map((item, i) => (
          <ItemRow key={i} item={item} ctx={ctx} audioId={`${stepId}-ex-${i}`} />
        ))}
      </View>

      {step.contrast && (
        <>
          <Text className="font-nunito-bold" style={{ marginTop: 18, marginBottom: 8, fontSize: 13, letterSpacing: 1.2, color: c.slate }}>
            COMPARE
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ContrastCard symbol={step.symbol} item={main} ctx={ctx} id={`${stepId}-cmp-a`} />
            <ContrastCard symbol={step.contrast.symbol} item={step.contrast.example} ctx={ctx} id={`${stepId}-cmp-b`} />
          </View>
          <Text className="font-nunito-semibold" style={{ marginTop: 10, fontSize: 15, lineHeight: 21, color: c.slate }}>
            {ctx.text(step.contrast.note)}
          </Text>
        </>
      )}
    </View>
  )
}

function ContrastCard({ symbol, item, ctx, id }: { symbol: SoundSymbol; item: ZhItem; ctx: BasicsCtx; id: string }) {
  const text = ctx.zh(item.zh)
  return (
    <RaisedTap
      onPress={() => playZh(text, id)}
      accessibilityLabel={`${symbol[ctx.phonetic]}: ${text}. Play`}
      radius={18}
      wrapperStyle={{ flex: 1 }}
      style={{ alignItems: 'center', paddingVertical: 12, gap: 4 }}
    >
      <Symbol symbol={symbol} ctx={ctx} size={28} />
      <Hanzi zh={item.zh} ctx={ctx} size={28} />
      <Reading pinyin={item.pinyin} ctx={ctx} size={14} center />
      <AudioIndicator id={id} size={36} />
    </RaisedTap>
  )
}

/* ── A syllable taken apart ─────────────────────────────────────────────── */

type Part = 'initial' | 'final' | 'tone' | 'whole'

export function SyllablePartsStep({ step, ctx, stepId, setGate }: StepProps<Of<'syllable-parts'>>) {
  const [focus, setFocus] = useState<Part | null>(null)
  const [seen, setSeen] = useState<Set<Part>>(new Set())
  const [sweep, setSweep] = useState(0)
  const wholeText = ctx.zh(step.whole.zh)
  const wholeId = `${stepId}-whole`
  const needed: Part[] = step.initial ? ['initial', 'final', 'tone'] : ['final', 'tone']
  const allSeen = needed.every((p) => seen.has(p))

  useEffect(() => {
    setGate(allSeen ? { label: 'Continue', enabled: true } : { label: 'Tap each part', enabled: false })
  }, [allSeen, setGate])

  const open = (part: Part) => {
    tickHaptic()
    setFocus(part)
    setSeen((s) => new Set(s).add(part))
    if (part === 'final' && step.final.audio) playZh(ctx.zh(step.final.audio.zh), `${stepId}-final`)
    else if (part !== 'initial') playZh(wholeText, wholeId)
    if (part === 'tone') setSweep((n) => n + 1)
  }

  const note =
    focus === 'initial' && step.initial
      ? `${ctx.text(step.initial.note)} A consonant is hard to hear on its own, so tap the whole syllable to hear it in use.`
      : focus === 'final'
        ? ctx.text(step.final.note) + (step.final.audio ? ` Playing: ${ctx.zh(step.final.audio.zh)} (${step.final.audio.gloss}).` : '')
        : focus === 'tone'
          ? `${toneLabel(step.tone)}: ${TONE_SHAPES[step.tone]}.`
          : focus === 'whole'
            ? `All together: ${wholeText}${step.whole.gloss ? `, ${step.whole.gloss}` : ''}.`
            : 'Tap a part to learn what it does.'

  return (
    <View>
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>
      <Card style={{ marginTop: 16, alignItems: 'center', paddingVertical: 18 }}>
        <PressableScale onPress={() => open('whole')} scaleTo={1} haptic={false} accessibilityLabel={`${wholeText}. Play the whole syllable`}>
          <View style={{ alignItems: 'center' }}>
            <Hanzi zh={step.whole.zh} ctx={ctx} size={64} />
            <Reading pinyin={step.whole.pinyin} ctx={ctx} size={22} center />
            <View style={{ marginTop: 6 }}>
              <AudioIndicator id={wholeId} size={44} />
            </View>
          </View>
        </PressableScale>
        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
          {step.initial && (
            <PartTile label="Initial" focused={focus === 'initial'} seen={seen.has('initial')} onPress={() => open('initial')}>
              <Symbol symbol={step.initial.symbol} ctx={ctx} size={30} />
            </PartTile>
          )}
          <PartTile label="Final" focused={focus === 'final'} seen={seen.has('final')} onPress={() => open('final')}>
            <Symbol symbol={step.final.symbol} ctx={ctx} size={30} />
          </PartTile>
          <PartTile label="Tone" focused={focus === 'tone'} seen={seen.has('tone')} onPress={() => open('tone')}>
            <ToneContour tone={step.tone} width={56} sweepKey={sweep} />
          </PartTile>
        </View>
        <Text
          className="font-nunito-semibold"
          accessibilityLiveRegion="polite"
          style={{ marginTop: 14, minHeight: 44, fontSize: 15, lineHeight: 21, color: c.navy, textAlign: 'center' }}
        >
          {note}
        </Text>
      </Card>
    </View>
  )
}

function PartTile({
  label,
  focused,
  seen,
  onPress,
  children,
}: {
  label: string
  focused: boolean
  seen: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <RaisedTap
      onPress={onPress}
      accessibilityLabel={`${label}${seen ? ', seen' : ''}`}
      accessibilityState={{ selected: focused }}
      tone={focused ? 'selected' : 'card'}
      radius={16}
      style={{ width: 88, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 4 }}
    >
      {children}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {seen && <Check size={11} color={c.sageDark} strokeWidth={3} />}
        <Text className="font-nunito-bold" style={{ ...bt.pill, color: c.sageDark }}>
          {label.toUpperCase()}
        </Text>
      </View>
    </RaisedTap>
  )
}

/* ── The tones ──────────────────────────────────────────────────────────── */

export function TonesStep({ step, ctx, stepId, setGate }: StepProps<Of<'tones'>>) {
  const [played, setPlayed] = useState<Set<number>>(new Set())
  const allPlayed = played.size >= step.items.length

  useEffect(() => {
    setGate(allPlayed ? { label: 'Continue', enabled: true } : { label: step.items.length > 1 ? 'Listen to each one' : 'Listen first', enabled: false })
  }, [allPlayed, step.items.length, setGate])

  return (
    <View>
      <BasicsPill label="Listen" />
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>
      <View style={{ marginTop: 16, gap: 10 }}>
        {step.items.map((row, i) => (
          <ToneRow
            key={i}
            tone={row.tone}
            item={row.item}
            note={row.note}
            ctx={ctx}
            id={`${stepId}-tone-${i}`}
            played={played.has(i)}
            onPlay={() => setPlayed((s) => new Set(s).add(i))}
          />
        ))}
      </View>
    </View>
  )
}

function ToneRow({
  tone,
  item,
  note,
  ctx,
  id,
  played,
  onPlay,
}: {
  tone: Tone
  item: ZhItem
  note: string
  ctx: BasicsCtx
  id: string
  played: boolean
  onPlay: () => void
}) {
  const text = ctx.zh(item.zh)
  const phase = useAudioPhase(id)
  const slowPhase = useAudioPhase(`${id}:slow`)
  const [sweep, setSweep] = useState(0)

  /* Draw the contour as the voice starts, normal or slow. */
  useEffect(() => {
    if (phase === 'playing' || slowPhase === 'playing') setSweep((n) => n + 1)
  }, [phase, slowPhase])

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <RaisedTap
        onPress={() => {
          onPlay()
          playZh(text, id)
        }}
        accessibilityLabel={`${toneLabel(tone)}, ${TONE_SHAPES[tone]}. ${text}${item.gloss ? `, ${item.gloss}` : ''}. Play`}
        radius={18}
        borderColor={played ? c.sage : undefined}
        wrapperStyle={{ flex: 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <ToneContour tone={tone} width={76} sweepKey={sweep} />
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.tone[tone] }}>
              {toneLabel(tone)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 24, lineHeight: 32, color: c.navy }}>
                {text}
              </Text>
              <Reading pinyin={item.pinyin} ctx={ctx} size={15} />
            </View>
            <Gloss>{`${item.gloss ? `${item.gloss} · ` : ''}${note}`}</Gloss>
          </View>
          <AudioIndicator id={id} size={40} />
        </View>
      </RaisedTap>
      <AudioButton text={text} id={id} size={36} slow label={`Play ${text} slowly`} />
    </View>
  )
}

/* ── The builder ────────────────────────────────────────────────────────── */

const SYMBOLS = new Map([...INITIALS, ...FINALS].map((s) => [s.pinyin, s]))

export function SyllableBuilderStep({ step, ctx, stepId, setGate }: StepProps<Of<'syllable-builder'>>) {
  const [initial, setInitial] = useState<string | null>(null)
  const [final, setFinal] = useState<string | null>(null)
  const [tone, setTone] = useState<Tone | null>(null)
  const [built, setBuilt] = useState<Set<string>>(new Set())
  const result = buildSyllable(initial, final, tone)
  const done = step.targets.every((t) => built.has(t))

  useEffect(() => {
    setGate(done ? { label: 'Continue', enabled: true } : { label: `Build ${step.targets.length - built.size} more`, enabled: false })
  }, [done, built.size, step.targets.length, setGate])

  /* Hear each real syllable as soon as it's complete. */
  const resultKey = result.kind === 'ok' ? result.pinyin : null
  useEffect(() => {
    if (result.kind !== 'ok') return
    playZh(ctx.zh(result.example.zh), `${stepId}-result`)
    if (step.targets.includes(result.pinyin) && !built.has(result.pinyin)) {
      correctHaptic()
      setBuilt((s) => new Set(s).add(result.pinyin))
    }
    // Only when a new syllable is completed.
  }, [resultKey])

  const show = (pinyin: string) => (ctx.phonetic === 'zhuyin' ? pinyinSyllableToZhuyin(pinyin) : pinyin)
  const label = (p: string) => SYMBOLS.get(p)?.[ctx.phonetic] ?? p

  const pickInitial = (p: string) => {
    tickHaptic()
    setInitial(p)
    if (final && !combines(p, final)) setFinal(null)
  }
  const pickFinal = (p: string) => {
    tickHaptic()
    setFinal(p)
  }

  const base = initial && final ? initial + final : null
  const toneAvailable = (t: Tone) => (base ? buildSyllable(initial, final, t).kind === 'ok' : true)

  return (
    <View>
      <BasicsPill label="Syllable builder" />
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>

      <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {step.targets.map((t) => {
          const isDone = built.has(t)
          return (
            <View
              key={t}
              accessible
              accessibilityLabel={`Target ${show(t)}${isDone ? ', built' : ''}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: isDone ? c.rightSoft : c.track,
              }}
            >
              {isDone && <Check size={14} color={c.rightInk} strokeWidth={2.8} />}
              <Text className="font-nunito-bold" style={{ fontSize: 16, color: isDone ? c.rightInk : c.navy }}>
                {show(t)}
              </Text>
            </View>
          )
        })}
      </View>

      <BuilderRow title="Initial">
        {step.initials.map((p) => (
          <Chip key={p} label={label(p)} selected={initial === p} onPress={() => pickInitial(p)} accessibilityLabel={`Initial ${label(p)}`} />
        ))}
      </BuilderRow>
      <BuilderRow title="Final" hint={initial ? 'Faded finals never follow this initial.' : undefined}>
        {step.finals.map((p) => (
          <Chip
            key={p}
            label={label(p)}
            selected={final === p}
            disabled={!!initial && !combines(initial, p)}
            onPress={() => pickFinal(p)}
            accessibilityLabel={`Final ${label(p)}${initial && !combines(initial, p) ? ', does not combine' : ''}`}
          />
        ))}
      </BuilderRow>
      <BuilderRow title="Tone">
        {([1, 2, 3, 4] as Tone[]).map((t) => (
          <View key={t} style={{ opacity: toneAvailable(t) ? 1 : 0.35 }}>
            <RaisedTap
              onPress={() => (tickHaptic(), setTone(t))}
              disabled={!toneAvailable(t)}
              accessibilityLabel={`${toneLabel(t)}${toneAvailable(t) ? '' : ', no common word'}`}
              accessibilityState={{ selected: tone === t, disabled: !toneAvailable(t) }}
              tone={tone === t ? 'selected' : 'card'}
              radius={14}
              style={{ width: 70, height: 56, alignItems: 'center', justifyContent: 'center' }}
            >
              <ToneContour tone={t} width={44} />
              <Text className="font-nunito-bold" style={{ ...bt.pill, color: c.slate }}>
                {t}
              </Text>
            </RaisedTap>
          </View>
        ))}
      </BuilderRow>

      <Card style={{ marginTop: 16, alignItems: 'center', minHeight: 132, justifyContent: 'center' }}>
        <BuildResultView result={result} ctx={ctx} stepId={stepId} show={show} partial={initial ? label(initial) + (final ? label(final) : '') : ''} />
      </Card>
    </View>
  )
}

function BuilderRow({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text className="font-nunito-bold" style={{ fontSize: 12.5, letterSpacing: 1.2, color: c.slate }}>
        {title.toUpperCase()}
      </Text>
      <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
      {hint && (
        <Text className="font-nunito-semibold" style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>
          {hint}
        </Text>
      )}
    </View>
  )
}

function BuildResultView({
  result,
  ctx,
  stepId,
  show,
  partial,
}: {
  result: ReturnType<typeof buildSyllable>
  ctx: BasicsCtx
  stepId: string
  show: (p: string) => string
  partial: string
}) {
  const muted = (s: string) => (
    <Text className="font-nunito-semibold" style={{ fontSize: 15, lineHeight: 21, color: c.slate, textAlign: 'center' }}>
      {s}
    </Text>
  )
  switch (result.kind) {
    case 'incomplete':
      return (
        <View style={{ alignItems: 'center', gap: 6 }}>
          {partial ? (
            <Text className="font-nunito-bold" style={{ fontSize: 34, color: c.navy }}>
              {partial}
            </Text>
          ) : null}
          {muted(partial ? 'Now choose a tone.' : 'Choose an initial to start.')}
        </View>
      )
    case 'invalid':
      return muted('That pair isn’t a Mandarin syllable.')
    case 'neutral-only':
      return muted(`${show(result.base)} exists, but only as a light neutral-tone word. Try another final.`)
    case 'no-tone':
      return muted(`${show(result.pinyin)} isn’t a common word in that tone. Try another tone.`)
    case 'ok': {
      const text = ctx.zh(result.example.zh)
      return (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text className="font-nunito-bold" style={{ fontSize: 34, color: c.navy }}>
            {show(result.pinyin)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Hanzi zh={result.example.zh} ctx={ctx} size={32} />
            <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.slate }}>
              {result.example.gloss}
            </Text>
            <AudioButton text={text} id={`${stepId}-result`} size={40} />
          </View>
        </View>
      )
    }
  }
}

