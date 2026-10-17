import { useState } from 'react'
import { View, Text, Image, ScrollView, Animated, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Check, Clock, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { PressableScale } from '../components/dashboard/parts'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { ShadowRevealProvider, ShadowSurface, useShadowReveal } from '../components/shadowReveal'
import { dashShadow } from '../components/dashboard/tokens'
import { WritingGuideModal } from '../components/WritingGuideModal'
import {
  basicsColors as c,
  basicsRadius as radius,
  basicsSpacing as sp,
  basicsType as t,
  BASICS_CONTENT_MAX,
  BASICS_GUTTER,
} from '../components/basics/tokens'
import { BasicsBackRow, BasicsChevron, BasicsPill, BasicsProgressBar } from '../components/basics/parts'
import type { BasicsGroupId, BasicsLesson, Phon } from '../data/basics'
import {
  basicsText,
  groupById,
  groupProgress,
  isLessonDone,
  lessonKey,
  lessonsInGroup,
  resumeStep,
  stepsFor,
} from '../lib/basics'

/*
 * One Chinese Basics group: its painting, how far along it is, and its lessons
 * in order. Nothing is locked — the order is a recommendation, marked "Next",
 * and any lesson can be opened or replayed. A lesson left part-way shows
 * "In progress" and reopens at its step. Lessons with a `module` sit under
 * that heading, in data order.
 *
 * Writing Basics also offers the original four-page writing primer
 * (`WritingGuideModal`), which the Learn tab's card used to open directly.
 */

const ART: Partial<Record<BasicsGroupId, { source: number; ratio: number }>> = {
  pronunciation: { source: require('../assets/images/basics/pronunciation.png'), ratio: 424 / 296 },
  characters: { source: require('../assets/images/basics/characters.png'), ratio: 424 / 296 },
  writing: { source: require('../assets/images/basics/writing.png'), ratio: 424 / 190 },
  sentences: { source: require('../assets/images/basics/sentences.png'), ratio: 424 / 190 },
}
const CONTINUE_ART = { source: require('../assets/images/basics/continue.png'), ratio: 466 / 455 }

/** Art height on this screen, whatever the crop's shape. */
const ART_HEIGHT = 150

export function ChineseBasicsGroup() {
  const { group: groupParam } = useLocalSearchParams<{ group: string }>()
  const group = groupById(groupParam ?? '')
  const { completedLessonIds, basicsProgress, settings } = useApp()
  const [showGuide, setShowGuide] = useState(false)
  const { width: windowWidth } = useWindowDimensions()
  const column = Math.min(windowWidth, BASICS_CONTENT_MAX)

  const run = useEntranceRun()
  const page = useReveal({ from: 'bottom', at: 0, duration: 420, run, distance: 22 })
  const shadowArrival = useShadowReveal({ at: 0, duration: 420, run })

  if (!group) return <Redirect href="/basics" />

  const phonetic = settings.phoneticScript
  const text = (s: Phon) => basicsText(s, settings.script, phonetic)
  const lessons = lessonsInGroup(group.id)
  const progress = groupProgress(group.id, completedLessonIds, phonetic)
  const nextId = lessons.find((l) => !isLessonDone(l, completedLessonIds, phonetic))?.id
  const sections = bySection(lessons)
  const art = ART[group.id] ?? CONTINUE_ART
  const artHeight = Math.min(ART_HEIGHT, (column - BASICS_GUTTER * 2) / art.ratio)

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: sp.xxxl }} showsVerticalScrollIndicator={false}>
        <ShadowRevealProvider value={shadowArrival}>
          <Animated.View
            style={[{ width: column, paddingHorizontal: BASICS_GUTTER }, page]}
            needsOffscreenAlphaCompositing
          >
            <BasicsBackRow fallback="/basics" />

            <View style={{ alignItems: 'center', marginTop: sp.xs }}>
              <Image source={art.source} resizeMode="contain" style={{ width: artHeight * art.ratio, height: artHeight }} />
            </View>

            <Text
              className="font-lora-bold"
              accessibilityRole="header"
              style={{ ...t.groupTitle, marginTop: sp.md, color: c.navy }}
            >
              {group.title}
            </Text>
            <Text className="font-lora" style={{ ...t.pageSubtitle, marginTop: 6, color: c.slate }}>
              {group.intro}
            </Text>
            <View style={{ marginTop: sp.lg, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
              <BasicsProgressBar done={progress.done} total={progress.total} />
              <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
                {progress.done} / {progress.total} lessons
              </Text>
            </View>

            <View style={{ marginTop: sp.xxl, gap: sp.md }}>
              {group.id === 'writing' && (
                <LessonRow
                  index={<PenLine size={18} color={c.sageDark} strokeWidth={2.2} />}
                  title="The Writing Primer"
                  subtitle="Four pages on how characters are built, with a character to trace."
                  minutes={5}
                  pill={<BasicsPill label="Guide" tone="quiet" />}
                  onPress={() => setShowGuide(true)}
                />
              )}
              {sections.map(({ module, lessons: rows }) => (
                <View key={module ?? '-'} style={{ gap: sp.md }}>
                  {module && (
                    <Text
                      className="font-nunito-bold"
                      accessibilityRole="header"
                      style={{ ...t.eyebrow, marginTop: sp.sm, color: c.sageDark }}
                    >
                      {module.toUpperCase()}
                    </Text>
                  )}
                  {rows.map(({ lesson, number }) => {
                    const done = isLessonDone(lesson, completedLessonIds, phonetic)
                    const inProgress =
                      !done && resumeStep(basicsProgress, lessonKey(lesson, phonetic), stepsFor(lesson, phonetic).length) > 0
                    return (
                      <LessonRow
                        key={lesson.id}
                        index={
                          done ? (
                            <Check size={18} color={c.sageDark} strokeWidth={2.6} />
                          ) : (
                            <Text className="font-nunito-bold" style={{ ...t.lessonButton, color: c.sageDark }}>
                              {number}
                            </Text>
                          )
                        }
                        title={text(lesson.title)}
                        subtitle={text(lesson.subtitle)}
                        minutes={lesson.minutes}
                        pill={
                          done ? (
                            <BasicsPill label="Done" />
                          ) : inProgress ? (
                            <BasicsPill label="In progress" tone="coral" />
                          ) : lesson.id === nextId ? (
                            <BasicsPill label={progress.done === 0 ? 'Start here' : 'Next'} tone="coral" />
                          ) : (
                            <BasicsPill label="New" tone="quiet" />
                          )
                        }
                        onPress={() => router.push({ pathname: '/basics/lesson/[lessonId]', params: { lessonId: lesson.id } })}
                      />
                    )
                  })}
                </View>
              ))}
            </View>
          </Animated.View>
        </ShadowRevealProvider>
      </ScrollView>

      {showGuide && <WritingGuideModal onClose={() => setShowGuide(false)} />}
    </SafeAreaView>
  )
}

/** Consecutive lessons under the same `module`, numbered through the group. */
function bySection(lessons: BasicsLesson[]) {
  const sections: { module?: string; lessons: { lesson: BasicsLesson; number: number }[] }[] = []
  lessons.forEach((lesson, i) => {
    const last = sections[sections.length - 1]
    if (last && last.module === lesson.module) last.lessons.push({ lesson, number: i + 1 })
    else sections.push({ module: lesson.module, lessons: [{ lesson, number: i + 1 }] })
  })
  return sections
}

function LessonRow({
  index,
  title,
  subtitle,
  minutes,
  pill,
  onPress,
}: {
  index: React.ReactNode
  title: string
  subtitle: string
  minutes: number
  pill: React.ReactNode
  onPress: () => void
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`}>
      <ShadowSurface
        shadow={dashShadow}
        style={{
          borderRadius: radius.row,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          padding: sp.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.md,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.sageSoft,
          }}
        >
          {index}
        </View>
        <View style={{ flex: 1 }}>
          <Text className="font-lora-bold" style={{ ...t.rowTitle, color: c.navy }}>
            {title}
          </Text>
          <Text className="font-lora" style={{ ...t.cardBody, marginTop: 2, color: c.slate }}>
            {subtitle}
          </Text>
          <View style={{ marginTop: sp.sm, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
            {pill}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.xs }}>
              <Clock size={13} color={c.slate} strokeWidth={2.2} />
              <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
                {minutes} min
              </Text>
            </View>
          </View>
        </View>
        <BasicsChevron size={32} />
      </ShadowSurface>
    </PressableScale>
  )
}
