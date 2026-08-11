import { useState } from 'react'
import { View, Text, Pressable, ScrollView, Image, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft, Lock, Check, CheckCircle2, Circle, Star } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { UNITS } from '../data/units'
import { lessonsForUnit } from '../data/lessons'
import { TOWN_BUILDINGS } from '../data/townBuildings'
import { playTapSound } from '../lib/sound'
import { levelForXp, XP_PER_LEVEL } from '../lib/townEconomy'

const CLOUDS = require('../assets/images/icons/lessons-clouds.png')
// Cropped to its own content by scripts/processCloudOverlay.mjs, so the sprite's
// aspect is fixed and the art meets the bottom edge exactly — no magic offset.
const CLOUDS_ASPECT = 1080 / 239

/**
 * Badge art for each unit's path node, cut from the design renders by
 * scripts/processUnitIcons.mjs. Keyed by unit id rather than listed in
 * src/data/units.ts so that `require` stays static — Metro resolves these at
 * bundle time and can't follow a computed path. A unit with no entry falls back
 * to its `glyph`, so adding a unit doesn't require art up front.
 *
 * There is also a units/pop-culture-music.png; swap it in here if the music note
 * suits Pop Culture better than the gift.
 */
const UNIT_ICONS: Record<string, number> = {
  'the-basics': require('../assets/images/units/the-basics.png'),
  'basic-food': require('../assets/images/units/basic-food.png'),
  friendship: require('../assets/images/units/friendship.png'),
  travel: require('../assets/images/units/travel.png'),
  electronics: require('../assets/images/units/electronics.png'),
  lifestyle: require('../assets/images/units/lifestyle.png'),
  beauty: require('../assets/images/units/beauty.png'),
  'pop-culture': require('../assets/images/units/pop-culture.png'),
}

const NODE = 104 // diameter of a path node
const RAIL = 136 // width of the left rail the nodes and connector sit in

/** The dashed vertical connector running between path nodes. */
function Connector({ active }: { active: boolean }) {
  return (
    <View className="flex-1 items-center justify-center">
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          className={`my-[5px] h-[9px] w-[9px] rounded-full ${active ? 'bg-brand-500' : 'bg-stone-300 dark:bg-slate-700'}`}
        />
      ))}
    </View>
  )
}

export function Lessons() {
  const { completedLessonIds, xp } = useApp()
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null)
  // Measured rather than taken from useWindowDimensions: on web the window can be
  // far wider than the screen the app is actually laid out in, and that would
  // scale the mist band to match the window instead of the content.
  const { width: windowWidth } = useWindowDimensions()
  const [containerWidth, setContainerWidth] = useState(windowWidth)
  const cloudsHeight = containerWidth / CLOUDS_ASPECT

  const sortedUnits = [...UNITS].sort((a, b) => a.order - b.order)
  const { level, xpIntoLevel, levelPct } = levelForXp(xp)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas dark:bg-slate-950">
      {/*
        Misty mountains sitting behind the path, as in the reference design.
        Height is derived from the screen width so the art keeps its aspect — the
        old fixed 190pt box stretched it, which is what made the mountains look
        smeared. It has to be computed rather than left to `aspectRatio`, because
        an RN <Image> falls back to its intrinsic pixel height and wins.
      */}
      <View
        pointerEvents="none"
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: cloudsHeight }}
      >
        <Image source={CLOUDS} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-1 p-1"
        >
          <ChevronLeft size={28} color="#1e293b" strokeWidth={2.5} />
        </Pressable>
        <Text className="flex-1 text-[22px] font-extrabold text-slate-900 dark:text-white">Lessons Path</Text>
        <View className="flex-row items-center gap-1.5 rounded-full border border-coral-200 bg-white px-3.5 py-2 dark:border-coral-900 dark:bg-slate-900">
          <Star size={17} color="#f5b93d" fill="#f5b93d" />
          <Text className="text-[15px] font-extrabold text-slate-900 dark:text-white">{xp}</Text>
          <Text className="text-[13px] font-semibold text-slate-400">XP</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mx-4 flex-row items-center overflow-hidden rounded-3xl bg-white pl-4 shadow-card dark:bg-slate-900">
          <View className="flex-1 py-4">
            <Text className="text-[17px] font-extrabold text-slate-900 dark:text-white">Your Progress</Text>
            <View className="mt-1 flex-row items-baseline justify-between pr-3">
              <Text className="text-[19px] font-extrabold text-brand-600">Level {level}</Text>
              <Text className="text-[13px] font-medium text-slate-400">
                {xpIntoLevel} / {XP_PER_LEVEL} XP
              </Text>
            </View>
            <View className="mt-2.5 mr-3 h-3 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
              <View className="h-full rounded-full bg-brand-500" style={{ width: `${levelPct}%` }} />
            </View>
          </View>
          <Image source={TOWN_BUILDINGS[6].image} style={{ width: 104, height: 88, marginRight: 8 }} resizeMode="contain" />
        </View>

        <View className="mt-2 px-4">
          {sortedUnits.map((unit, i) => {
            const lessons = lessonsForUnit(unit.id)
            const hasContent = lessons.length > 0
            const previousUnit = sortedUnits[i - 1]
            const previousComplete =
              !previousUnit || lessonsForUnit(previousUnit.id).every((l) => completedLessonIds.includes(l.id))
            const unlocked = unit.order === 1 || (hasContent && previousComplete)
            const completedCount = lessons.filter((l) => completedLessonIds.includes(l.id)).length
            const unitComplete = hasContent && completedCount === lessons.length
            const isExpanded = expandedUnitId === unit.id
            const isLast = i === sortedUnits.length - 1

            return (
              <View key={unit.id}>
                <Pressable
                  disabled={!unlocked}
                  onPress={() => {
                    playTapSound()
                    setExpandedUnitId((prev) => (prev === unit.id ? null : unit.id))
                  }}
                  className="flex-row items-center"
                >
                  <View style={{ width: RAIL }} className="items-center">
                    <View
                      style={{ width: NODE, height: NODE }}
                      className={`items-center justify-center overflow-hidden rounded-full border-[6px] border-white shadow-card ${
                        unlocked ? 'bg-brand-500' : 'bg-stone-200 dark:bg-slate-800'
                      }`}
                    >
                      {!unlocked ? (
                        <Lock size={32} color="#78716c" strokeWidth={2.5} />
                      ) : UNIT_ICONS[unit.id] ? (
                        <Image source={UNIT_ICONS[unit.id]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : /\p{Script=Han}/u.test(unit.glyph) ? (
                        <Text className="font-hanzi text-[46px] leading-[54px] text-white">{unit.glyph}</Text>
                      ) : (
                        <Text className="text-[40px] leading-[48px]">{unit.glyph}</Text>
                      )}
                    </View>
                    {unlocked && (
                      <View className="absolute left-2.5 top-0 h-8 w-8 items-center justify-center rounded-full bg-white shadow-card">
                        <Text className="text-[15px] font-extrabold text-brand-600">{i + 1}</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-1 py-5">
                    <Text className="text-[20px] font-extrabold text-slate-900 dark:text-white">{unit.title}</Text>
                    <Text className="mt-0.5 font-hanzi text-[17px] text-slate-800 dark:text-slate-200">{unit.hanzi}</Text>
                    <Text className="mt-0.5 text-[14px] text-slate-400">{unit.pinyin}</Text>
                  </View>

                  {unitComplete && (
                    <View className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-brand-100">
                      <Check size={20} color="#16a34a" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>

                {isExpanded && unlocked && hasContent && (
                  <View className="mb-3 ml-[112px] gap-2">
                    {lessons.map((lesson) => {
                      const isComplete = completedLessonIds.includes(lesson.id)
                      return (
                        <Pressable
                          key={lesson.id}
                          onPress={() => {
                            playTapSound()
                            router.push(`/lesson/${lesson.id}`)
                          }}
                          className="flex-row items-center gap-3 rounded-2xl bg-white p-3 shadow-card active:opacity-80 dark:bg-slate-900"
                        >
                          {isComplete ? <CheckCircle2 size={18} color="#22c55e" /> : <Circle size={18} color="#cbd5e1" />}
                          <Text className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{lesson.title}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                )}

                {!isLast && (
                  <View className="flex-row items-stretch">
                    <View style={{ width: RAIL, height: 44 }} className="items-center">
                      <Connector active={unlocked} />
                    </View>
                    <View className="flex-1 justify-end">
                      <View className="h-px bg-slate-200/80 dark:bg-slate-800" />
                    </View>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
