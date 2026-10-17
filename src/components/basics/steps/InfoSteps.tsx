import { View, Text, Pressable } from 'react-native'
import { Check, Play } from 'lucide-react-native'
import type { BasicsStep } from '../../../data/basics/types'
import { AudioIndicator, playZh } from '../audio'
import { BasicsPill } from '../parts'
import { Card, Gloss, ItemRow, LearnMore, Reading, StepBody, StepTitle, type StepProps } from '../lessonParts'
import { hanziFont } from '../../../lib/hanzi'
import { basicsColors as c } from '../tokens'

/*
 * Steps that show and tell: explanations, things to listen to, a dialogue,
 * and the recap. None of them is checked — the lesson's Continue is always
 * open on them.
 */

type Of<K extends BasicsStep['kind']> = Extract<BasicsStep, { kind: K }>

export function ExplainStep({ step, ctx, stepId }: StepProps<Of<'explain'>>) {
  return (
    <View>
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>
      {step.items && (
        <View style={{ marginTop: 18, gap: 10 }}>
          {step.items.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              ctx={ctx}
              audioId={`${stepId}-item-${i}`}
              bothReadings={step.bothReadings}
              bothScripts={step.bothScripts}
            />
          ))}
        </View>
      )}
      {step.more && <LearnMore>{ctx.text(step.more)}</LearnMore>}
    </View>
  )
}

export function ListenStep({ step, ctx, stepId }: StepProps<Of<'listen'>>) {
  return (
    <View>
      <BasicsPill label="Listen" />
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>
      <View style={{ marginTop: 18, gap: 10 }}>
        {step.items.map((item, i) => (
          <ItemRow key={i} item={item} ctx={ctx} audioId={`${stepId}-item-${i}`} bothReadings={step.bothReadings} />
        ))}
      </View>
    </View>
  )
}

export function DialogueStep({ step, ctx, stepId }: StepProps<Of<'dialogue'>>) {
  const whole = step.lines.map((l) => ctx.zh(l.item.zh)).join('')
  return (
    <View>
      <BasicsPill label="Conversation" />
      <StepTitle>{ctx.text(step.title)}</StepTitle>
      <StepBody>{ctx.text(step.body)}</StepBody>
      <View style={{ marginTop: 16, gap: 10 }}>
        {step.lines.map((line, i) => {
          const spoken = ctx.zh(line.item.zh)
          const left = line.speaker === 'A'
          const id = `${stepId}-line-${i}`
          return (
            <Pressable
              key={i}
              onPress={() => playZh(spoken, id)}
              accessibilityRole="button"
              accessibilityLabel={`Speaker ${line.speaker}: ${spoken}, ${line.item.gloss ?? ''}. Play`}
              style={{ alignSelf: left ? 'flex-start' : 'flex-end', maxWidth: '88%' }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderRadius: 18,
                  borderTopLeftRadius: left ? 6 : 18,
                  borderTopRightRadius: left ? 18 : 6,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: left ? c.card : c.sageSoft,
                  borderWidth: 1,
                  borderColor: left ? c.border : c.sageSoft,
                }}
              >
                <Text className="font-nunito-bold" style={{ fontSize: 12, color: c.textMuted }}>
                  {line.speaker}
                </Text>
                <View style={{ flexShrink: 1 }}>
                  <Text className={hanziFont(ctx.script, 'medium')} style={{ fontSize: 22, lineHeight: 30, color: c.navy }}>
                    {spoken}
                  </Text>
                  <Reading pinyin={line.item.pinyin} ctx={ctx} size={13.5} />
                  {line.item.gloss && <Gloss>{line.item.gloss}</Gloss>}
                </View>
                <AudioIndicator id={id} size={34} />
              </View>
            </Pressable>
          )
        })}
      </View>
      <Pressable
        onPress={() => playZh(whole, `${stepId}-all`)}
        accessibilityRole="button"
        accessibilityLabel="Play the whole conversation"
        style={{ alignSelf: 'center', marginTop: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: c.sageSoft }}>
          <Play size={16} color={c.sageDark} strokeWidth={2.4} />
          <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.sageDark }}>
            Play it all
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

export function RecapStep({ step, ctx }: StepProps<Of<'recap'>>) {
  return (
    <View>
      <BasicsPill label="Recap" />
      <StepTitle>What you learned</StepTitle>
      <Card style={{ marginTop: 16, gap: 14 }}>
        {step.points.map((point, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                marginTop: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.sageSoft,
              }}
            >
              <Check size={14} color={c.sageDark} strokeWidth={2.8} />
            </View>
            <Text className="font-lora" style={{ flex: 1, fontSize: 16, lineHeight: 23, color: c.navy }}>
              {ctx.text(point)}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  )
}
