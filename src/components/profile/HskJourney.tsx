import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { Check } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { HSK_MAX_LEVEL, levelUpTarget, studiedByLevel } from '../../lib/selectors'
import { SectionCard, ProgressBar, useProfileCosmetics } from './parts'
import { profColors as c, profSpacing as s, profType as t } from './tokens'

/*
 * The learner's road through HSK 1-6: a line through six stops, filled up to
 * where they are and partway along the next stretch by how much of their
 * level they've studied. The level moves up by itself
 * (`earnedHskLevel`, applied in AppContext), so this is a picture of a rule,
 * not a goal the learner sets.
 */

const NODE = 26
const CURRENT = 34
const LINE = 5

export function HskJourney({ width }: { width: number }) {
  const { deck, wordBank, getWord, settings } = useApp()
  const { ink } = useProfileCosmetics()
  const level = Math.min(HSK_MAX_LEVEL, Math.max(1, settings.hskLevel))

  const { studied, target } = useMemo(() => {
    const byLevel = studiedByLevel(deck, (id) => getWord(id)?.hskLevel)
    return { studied: byLevel.get(level) ?? 0, target: levelUpTarget(wordBank, level) }
  }, [deck, getWord, wordBank, level])

  const atTop = level >= HSK_MAX_LEVEL
  const share = atTop ? 1 : Math.min(1, studied / target)
  const remaining = Math.max(0, target - studied)

  /* Six equal slots; each stop sits in the middle of its own. */
  const slot = width / HSK_MAX_LEVEL
  const centre = (i: number) => slot * (i + 0.5)
  const lineTop = CURRENT / 2 - LINE / 2

  return (
    <SectionCard title="HSK Journey">
      <View className="flex-row items-end justify-between" style={{ paddingHorizontal: 4 }}>
        <View>
          <Text className="font-lora" style={{ ...t.tag, color: c.slate }}>
            Current level
          </Text>
          <Text className="font-lora-bold" style={{ ...t.name, color: ink.pillInk }}>
            HSK {level}
          </Text>
        </View>
        <Text className="font-lora" style={{ ...t.body, color: c.slate, marginBottom: 4 }}>
          {atTop ? 'Top level reached' : `${studied.toLocaleString()} / ${target.toLocaleString()} words`}
        </Text>
      </View>

      {/* The road: grey track, the travelled part in the profile's ink. */}
      <View
        style={{ width, height: CURRENT + 22, marginTop: s.lg }}
        accessible
        accessibilityLabel={`HSK level ${level} of ${HSK_MAX_LEVEL}`}
      >
        {Array.from({ length: HSK_MAX_LEVEL - 1 }, (_, i) => {
          const from = i + 1
          const fill = from < level ? 1 : from === level ? share : 0
          const left = centre(i)
          const span = slot
          return (
            <View
              key={i}
              style={{ position: 'absolute', top: lineTop, left, width: span, height: LINE, backgroundColor: c.track }}
            >
              <View
                style={{
                  width: span * fill,
                  height: LINE,
                  backgroundColor: ink.bar,
                  borderTopRightRadius: fill < 1 ? LINE / 2 : 0,
                  borderBottomRightRadius: fill < 1 ? LINE / 2 : 0,
                }}
              />
            </View>
          )
        })}

        {Array.from({ length: HSK_MAX_LEVEL }, (_, i) => {
          const n = i + 1
          const done = n < level
          const current = n === level
          const size = current ? CURRENT : NODE
          return (
            <View
              key={n}
              pointerEvents="none"
              style={{ position: 'absolute', top: 0, left: centre(i) - slot / 2, width: slot, alignItems: 'center' }}
            >
              <View style={{ height: CURRENT, justifyContent: 'center' }}>
                <View
                  className="items-center justify-center"
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: done ? ink.bar : current ? ink.pill : c.card,
                    borderWidth: done ? 0 : current ? 3 : 1.5,
                    borderColor: current ? ink.bar : c.border,
                  }}
                >
                  {done ? (
                    <Check size={14} color={c.onJade} strokeWidth={3} />
                  ) : (
                    <Text
                      className={current ? 'font-lora-bold' : 'font-lora'}
                      style={{ fontSize: current ? 15 : 12.5, color: current ? ink.pillInk : c.lockedInk, includeFontPadding: false }}
                    >
                      {n}
                    </Text>
                  )}
                </View>
              </View>
              <Text
                className={current ? 'font-lora-bold' : 'font-lora'}
                style={{ ...t.tag, marginTop: 6, color: done || current ? ink.pillInk : c.lockedInk }}
              >
                HSK {n}
              </Text>
            </View>
          )
        })}
      </View>

      <View style={{ marginTop: s.md, paddingHorizontal: 4 }}>
        <ProgressBar fraction={share} color={ink.bar} height={6} />
        <Text className="font-lora" style={{ ...t.body, color: c.slate, marginTop: s.sm }}>
          {atTop
            ? 'You’ve reached HSK 6. Keep studying to master the rarer words.'
            : remaining === 0
              ? `Moving you up to HSK ${level + 1}…`
              : `Study ${remaining.toLocaleString()} more HSK ${level} ${remaining === 1 ? 'word' : 'words'} to reach HSK ${level + 1}.`}
        </Text>
      </View>
    </SectionCard>
  )
}
