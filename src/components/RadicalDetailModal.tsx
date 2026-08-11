import { View, Text } from 'react-native'
import { PenSquare, Sparkles, Scroll, Shapes } from 'lucide-react-native'
import { Modal } from './Modal'
import { SpeakButton } from './SpeakButton'
import type { Radical } from '../types'

/** A labelled block in the detail sheet — icon, heading, body. */
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <View className="mb-1.5 flex-row items-center gap-1.5">
        {icon}
        <Text className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{title}</Text>
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
          <Text className="font-hanzi-bold text-[72px] leading-[86px] text-slate-900 dark:text-white">{radical.character}</Text>
          <SpeakButton text={radical.character} />
        </View>
        <Text className="text-lg font-medium text-slate-400">{radical.pinyin}</Text>
        <Text className="text-xl font-semibold text-slate-900 dark:text-white">{radical.meaning}</Text>

        <View className="mt-1 flex-row flex-wrap items-center justify-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            <PenSquare size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {radical.strokeCount} stroke{radical.strokeCount === 1 ? '' : 's'}
            </Text>
          </View>
          {radical.variants?.length ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 dark:bg-brand-900/30">
              <Shapes size={13} color="#16a34a" />
              <Text className="text-xs font-bold text-brand-700 dark:text-brand-300">
                also written {radical.variants.join(' ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Section icon={<Sparkles size={13} color="#94a3b8" />} title="What it means">
        <Text className="text-[15px] leading-[22px] text-slate-700 dark:text-slate-300">{radical.explanation}</Text>
      </Section>

      <Section icon={<Scroll size={13} color="#94a3b8" />} title="Where it comes from">
        <Text className="text-[15px] leading-[22px] text-slate-700 dark:text-slate-300">{radical.origin}</Text>
      </Section>

      <Section icon={<Shapes size={13} color="#94a3b8" />} title="Used in">
        <View className="gap-2">
          {radical.examples.map((ex) => (
            <View
              key={ex.word}
              className="flex-row items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/60"
            >
              <Text className="font-hanzi-bold text-[28px] leading-[36px] text-slate-900 dark:text-white">{ex.word}</Text>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-slate-400">{ex.pinyin}</Text>
                <Text className="text-[14px] text-slate-700 dark:text-slate-300">{ex.meaning}</Text>
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
