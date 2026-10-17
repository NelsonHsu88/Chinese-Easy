import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Check } from 'lucide-react-native'
import type { BasicsStep, CharacterLayout, CharacterPart } from '../../../data/basics/types'
import { hanziFont } from '../../../lib/hanzi'
import { tickHaptic } from '../../../lib/haptics'
import { AudioIndicator, playZh } from '../audio'
import { BasicsPill } from '../parts'
import { Card, Gloss, Hanzi, Reading, StepBody, StepTitle, type BasicsCtx, type StepProps } from '../lessonParts'
import { basicsColors as c } from '../tokens'

/*
 * A character beside a diagram of its square: each part drawn in the region
 * it occupies (left/right, top/bottom, outside/inside). Tap a part — in the
 * diagram or its chip — to highlight it and read what it contributes, with
 * other characters that share it. Continue waits until every part has been
 * looked at.
 *
 * The diagram is schematic on purpose: it shows *where* a part sits, not its
 * exact strokes, which the bundled stroke data doesn't split by component.
 */

type Explorer = Extract<BasicsStep, { kind: 'character-explorer' }>

const ROLE_LABEL: Record<CharacterPart['role'], string> = {
  meaning: 'Meaning clue',
  sound: 'Sound clue',
  shape: 'Picture',
}

export function CharacterExplorerStep({ step, ctx, stepId, setGate }: StepProps<Explorer>) {
  const [focus, setFocus] = useState<number | null>(null)
  const [seen, setSeen] = useState<Set<number>>(new Set())
  const all = seen.size >= step.parts.length
  const whole = ctx.zh(step.character.zh)

  useEffect(() => {
    setGate(all ? { label: 'Continue', enabled: true } : { label: step.parts.length > 1 ? 'Tap each part' : 'Tap to explore', enabled: false })
  }, [all, step.parts.length, setGate])

  const open = (i: number) => {
    tickHaptic()
    setFocus(i)
    setSeen((s) => new Set(s).add(i))
  }

  const part = focus !== null ? step.parts[focus] : null

  return (
    <View>
      <BasicsPill label="Explore" />
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>

      <Card style={{ marginTop: 16, paddingVertical: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 12 }}>
          <Pressable
            onPress={() => playZh(whole, `${stepId}-whole`)}
            accessibilityRole="button"
            accessibilityLabel={`${whole}, ${step.character.gloss ?? ''}. Play`}
          >
            <View style={{ alignItems: 'center' }}>
              <Hanzi zh={step.character.zh} ctx={ctx} size={76} />
              <Reading pinyin={step.character.pinyin} ctx={ctx} size={17} center />
              {step.character.gloss && <Gloss>{step.character.gloss}</Gloss>}
              <View style={{ marginTop: 6 }}>
                <AudioIndicator id={`${stepId}-whole`} size={38} />
              </View>
            </View>
          </Pressable>
          <Diagram layout={step.layout} parts={step.parts} focus={focus} onPick={open} ctx={ctx} />
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {step.parts.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => open(i)}
              accessibilityRole="button"
              accessibilityLabel={`${ctx.zh(p.zh)}, ${ROLE_LABEL[p.role]}${seen.has(i) ? ', seen' : ''}`}
              accessibilityState={{ selected: focus === i }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 22,
                  borderWidth: focus === i ? 2 : 1,
                  borderColor: focus === i ? c.jade : c.border,
                  backgroundColor: focus === i ? c.sageSoft : c.card,
                }}
              >
                {seen.has(i) && <Check size={13} color={c.sageDark} strokeWidth={3} />}
                <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 22, lineHeight: 30, color: c.navy }}>
                  {ctx.zh(p.zh)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Card>

      {part && (
        <View accessibilityLiveRegion="polite" style={{ marginTop: 12, borderRadius: 18, padding: 14, backgroundColor: c.sageSoft }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 34, lineHeight: 44, color: c.navy }}>
              {ctx.zh(part.zh)}
            </Text>
            <View style={{ flex: 1 }}>
              <Text className="font-nunito-bold" style={{ fontSize: 12, letterSpacing: 1, color: c.sageDark }}>
                {ROLE_LABEL[part.role].toUpperCase()}
              </Text>
              <Text className="font-nunito-bold" style={{ fontSize: 15.5, color: c.navy }}>
                {ctx.text(part.gloss)}
              </Text>
            </View>
          </View>
          <Text className="font-lora" style={{ marginTop: 6, fontSize: 15, lineHeight: 21, color: c.navy }}>
            {ctx.text(part.note)}
          </Text>
          {part.related && part.related.length > 0 && (
            <>
              <Text className="font-nunito-bold" style={{ marginTop: 10, fontSize: 12, letterSpacing: 1, color: c.slate }}>
                ALSO IN
              </Text>
              <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {part.related.map((r, i) => {
                  const text = ctx.zh(r.zh)
                  const id = `${stepId}-rel-${focus}-${i}`
                  return (
                    <Pressable key={i} onPress={() => playZh(text, id)} accessibilityRole="button" accessibilityLabel={`${text}, ${r.gloss ?? ''}. Play`}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.card }}>
                        <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 24, lineHeight: 32, color: c.navy }}>
                          {text}
                        </Text>
                        <View>
                          <Reading pinyin={r.pinyin} ctx={ctx} size={12.5} />
                          {r.gloss && (
                            <Text className="font-nunito-semibold" style={{ fontSize: 12, color: c.slate }}>
                              {r.gloss}
                            </Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  )
}

const BOX = 128

/** The square, split by layout, each part in its region. */
function Diagram({
  layout,
  parts,
  focus,
  onPick,
  ctx,
}: {
  layout: CharacterLayout
  parts: CharacterPart[]
  focus: number | null
  onPick: (i: number) => void
  ctx: BasicsCtx
}) {
  const at = (slot: CharacterPart['slot']) => parts.findIndex((p) => p.slot === slot)
  const region = (slot: CharacterPart['slot'], style: object, fontSize: number) => {
    const i = at(slot)
    if (i < 0) return null
    const on = focus === i
    return (
      <Pressable
        key={slot}
        onPress={() => onPick(i)}
        accessibilityRole="button"
        accessibilityLabel={`${ctx.zh(parts[i].zh)}, ${layoutWord(layout, slot)}`}
        style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, style]}
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            backgroundColor: on ? c.sageSoft : 'transparent',
            borderWidth: on ? 2 : 0,
            borderColor: c.jade,
          }}
        >
          <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize, lineHeight: fontSize * 1.2, color: on ? c.jadeDark : c.navy }}>
            {ctx.zh(parts[i].zh)}
          </Text>
        </View>
      </Pressable>
    )
  }

  return (
    <View
      style={{ width: BOX, height: BOX, borderWidth: 1.5, borderColor: c.border, borderRadius: 10, backgroundColor: c.background }}
      accessibilityLabel={`Layout: ${layoutName(layout)}`}
    >
      {layout === 'single' && region('whole', { left: 4, top: 4, right: 4, bottom: 4 }, 72)}
      {layout === 'left-right' && (
        <>
          <View style={{ position: 'absolute', left: BOX * 0.45, top: 6, bottom: 6, width: 1, backgroundColor: c.toneGrid }} />
          {region('a', { left: 4, top: 4, bottom: 4, width: BOX * 0.42 }, 44)}
          {region('b', { right: 4, top: 4, bottom: 4, width: BOX * 0.5 }, 48)}
        </>
      )}
      {layout === 'top-bottom' && (
        <>
          <View style={{ position: 'absolute', top: BOX * 0.38, left: 6, right: 6, height: 1, backgroundColor: c.toneGrid }} />
          {region('a', { left: 4, right: 4, top: 4, height: BOX * 0.34 }, 34)}
          {region('b', { left: 4, right: 4, bottom: 4, height: BOX * 0.56 }, 48)}
        </>
      )}
      {layout === 'enclosure' && (
        <>
          {region('a', { left: 4, right: 4, top: 4, bottom: 4 }, 100)}
          {region('b', { left: BOX * 0.28, right: BOX * 0.28, top: BOX * 0.28, bottom: BOX * 0.28 }, 34)}
        </>
      )}
    </View>
  )
}

function layoutName(layout: CharacterLayout): string {
  return { single: 'one part', 'left-right': 'left and right', 'top-bottom': 'top and bottom', enclosure: 'enclosed' }[layout]
}

function layoutWord(layout: CharacterLayout, slot: CharacterPart['slot']): string {
  if (slot === 'whole') return 'the whole character'
  if (layout === 'left-right') return slot === 'a' ? 'left side' : 'right side'
  if (layout === 'top-bottom') return slot === 'a' ? 'top' : 'bottom'
  return slot === 'a' ? 'outside' : 'inside'
}
