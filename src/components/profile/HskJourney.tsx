import { useMemo } from 'react'
import { View, Text, Image } from 'react-native'
import { router } from 'expo-router'
import { Check, ChevronRight } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { HSK_MAX_LEVEL, levelUpTarget, studiedByLevel } from '../../lib/selectors'
import { SectionCard, ProgressBar, useProfileCosmetics } from './parts'
import { PressableScale } from '../dashboard/parts'
import { playTints } from '../dashboard/tokens'
import { profArt } from './art'
import { profColors as c, profSpacing as s, profType as t } from './tokens'

/*
 * The learner's road through HSK 1-6: a line through six stops, filled up to
 * where they are and partway along the next stretch by how much of their
 * level they've studied. The level moves up by itself
 * (`earnedHskLevel`, applied in AppContext), so this is a picture of a rule,
 * not a goal the learner sets.
 */

/** The corner painting: 448×152 of the mockup's pixels, 58% of the card. */
const SCENE_RATIO = 448 / 152

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

  const sceneWidth = (width + 26) * 0.6

  /* Six equal slots; each stop sits in the middle of its own. */
  const slot = width / HSK_MAX_LEVEL
  const centre = (i: number) => slot * (i + 0.5)
  const lineTop = CURRENT / 2 - LINE / 2

  return (
    <PressableScale onPress={() => router.push('/settings/progress')} scaleTo={0.985} accessibilityLabel={`HSK Journey. Current level HSK ${level}. ${studied} of ${target} words. Open progress`}>
    <SectionCard
      title="HSK Journey"
      scene={
        <View style={{ width: sceneWidth, height: sceneWidth / SCENE_RATIO }}>
          <Image source={profArt.hskScene} resizeMode="contain" style={{ width: sceneWidth, height: sceneWidth / SCENE_RATIO }} />
          {/* On the spot the script cut out of the painting for it. */}
          <View
            style={{
              position: 'absolute',
              left: sceneWidth * 0.89 - 19,
              top: (sceneWidth / SCENE_RATIO) * 0.66 - 19,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={20} color={playTints.sky.ink} strokeWidth={2.4} />
          </View>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 4, marginTop: -6 }}>
        <Text className="font-lora" style={{ ...t.body, fontSize: 16, color: c.slate }}>
          Current level
        </Text>
        <Text className="font-lora-bold" style={{ fontSize: 34, lineHeight: 40, color: ink.pillInk }}>
          HSK {level}
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
    </PressableScale>
  )
}
