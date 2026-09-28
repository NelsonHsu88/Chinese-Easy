import { View, Text } from 'react-native'
import { PenSquare, Sparkles, Scroll, Shapes } from 'lucide-react-native'
import { Modal } from './Modal'
import { SpeakButton } from './SpeakButton'
import { ICON_GREEN, ICON_GREEN_DARK, ICON_MUTED } from './dictionary/DictionaryControls'
import type { Radical } from '../types'

/** A labelled block in the detail sheet — icon, heading, body. */
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <View className="mb-1.5 flex-row items-center gap-1.5">
        {icon}
        <Text className="font-dict-bold text-[11px] uppercase tracking-wide text-dict-muted">{title}</Text>
      </View>
      {children}
    </View>
  )
}

/**
 * The tap-through detail for a radical: what it signals about a character's
 * meaning, where the shape came from, and characters built with it. Shared by
 * the standalone Radicals screen and the Dictionary's Radicals tab so the two
 * can't drift apart.
 */
export function RadicalDetailModal({ radical, onClose }: { radical: Radical; onClose: () => void }) {
  return (
    <Modal title={`${radical.character} · ${radical.meaning}`} onClose={onClose}>
      <View className="items-center gap-2 pb-1">
        <View className="flex-row items-center gap-3">
          <Text className="font-hanzi-tc-regular text-[72px] leading-[86px] text-dict-heading">{radical.character}</Text>
          <SpeakButton text={radical.character} />
        </View>
        <Text className="font-dict-semibold text-lg text-dict-soft">{radical.pinyin}</Text>
        <Text className="font-dict-bold text-xl text-dict-heading">{radical.meaning}</Text>

        <View className="mt-1 flex-row flex-wrap items-center justify-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-full bg-dict-page px-3 py-1">
            <PenSquare size={13} color={ICON_MUTED} />
            <Text className="font-dict-bold text-xs text-dict-muted">
              {radical.strokeCount} stroke{radical.strokeCount === 1 ? '' : 's'}
            </Text>
          </View>
          {radical.variants?.length ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-dict-green-pale px-3 py-1">
              <Shapes size={13} color={ICON_GREEN_DARK} />
              <Text className="font-dict-bold text-xs text-dict-green-dark">
                also written {radical.variants.join(' ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Section icon={<Sparkles size={13} color={ICON_MUTED} />} title="What it means">
        <Text className="font-dict-sans text-[15px] leading-[22px] text-dict-body">{radical.explanation}</Text>
      </Section>

      <Section icon={<Scroll size={13} color={ICON_MUTED} />} title="Where it comes from">
        <Text className="font-dict-sans text-[15px] leading-[22px] text-dict-body">{radical.origin}</Text>
      </Section>

      <Section icon={<Shapes size={13} color={ICON_MUTED} />} title="Used in">
        <View className="gap-2">
          {radical.examples.map((ex) => (
            <View
              key={ex.word}
              className="flex-row items-center gap-3 rounded-2xl border border-dict-border bg-dict-page px-3.5 py-2.5"
            >
              <Text className="font-hanzi-tc-regular text-[28px] leading-[36px] text-dict-heading">{ex.word}</Text>
              <View className="flex-1">
                <Text className="font-dict-semibold text-[13px] text-dict-soft">{ex.pinyin}</Text>
                <Text className="font-dict-sans text-[14px] text-dict-body">{ex.meaning}</Text>
              </View>
              <SpeakButton text={ex.word} size={18} />
            </View>
          ))}
        </View>
      </Section>

      <View className="h-4" />
    </Modal>
  )
}
