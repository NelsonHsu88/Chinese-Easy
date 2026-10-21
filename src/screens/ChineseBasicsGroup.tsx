import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View, Text, Image, ScrollView, Animated, Platform, Pressable, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Check, ChevronUp, Clock, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { PressableScale } from '../components/dashboard/parts'
import { ARRIVE, useEntranceRun, useReveal } from '../components/dashboard/entrance'
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
import { hanziFont } from '../lib/hanzi'

/*
 * One Chinese Basics group: its painting, how far along it is, and its lessons
 * in order. Nothing is locked — the order is a recommendation, marked "Start
 * here" / "Next", and any lesson can be opened or replayed. A lesson left
 * part-way shows "Continue" and reopens at its step.
 *
 * All four groups share one design: a white header card with the group's
 * painting top right, the same thin jade progress bar, then each `module` as a
 * white card under a faint jade header band. Colour is reserved for meaning —
 * jade for progress and "go" — and each group's personality is its painting.
 * Only the section holding the next lesson opens by default; the rest are a
 * tap away, and any number can be open at once.
 *
 * Writing Basics also offers the original four-page writing primer
 * (`WritingGuideModal`) as a quiet resource row above its lessons.
 */

const ART: Partial<Record<BasicsGroupId, { source: number; ratio: number }>> = {
  /* The Chinese Basics tiles' paintings ("SS1017 New APP DesIGN UI (1)"). */
  pronunciation: { source: require('../assets/images/app/basics-pronunciation.png'), ratio: 348 / 230 },
  characters: { source: require('../assets/images/app/basics-characters.png'), ratio: 350 / 230 },
  writing: { source: require('../assets/images/app/basics-writing.png'), ratio: 348 / 206 },
  sentences: { source: require('../assets/images/app/basics-sentences.png'), ratio: 350 / 206 },
}
const CONTINUE_ART = { source: require('../assets/images/basics/continue.png'), ratio: 466 / 455 }

/** The header painting's share of the column, and its tallest. */
const BANNER_ART_SHARE = 0.4
const BANNER_ART_HEIGHT = 100
const BANNER_TITLE = { fontSize: 27, lineHeight: 32 }

/** A lesson's glyph tile, the same in every group. */
const TILE = 56

/** Hub type sizes on top of `basicsType`: one per role, shared by every group. */
const hubType = {
  intro: { fontSize: 14.5, lineHeight: 20 },
  sectionTitle: { fontSize: 16.5, lineHeight: 21 },
  sectionNote: { fontSize: 13, lineHeight: 18 },
  rowTitle: { fontSize: 15.5, lineHeight: 20 },
  rowBody: { fontSize: 13, lineHeight: 18 },
} as const

/**
 * What each lesson's thumbnail carries. Hanzi are ones written the same in
 * both scripts; readings are `Phon` pairs, so a zhuyin learner never sees
 * pinyin here (the rule `basics.test.ts` holds the lesson data to).
 */
const LESSON_GLYPH: Record<string, Phon> = {
  'cb-p-how-sounds-work': '你好',
  'cb-p-your-system': { pinyin: 'mā', zhuyin: 'ㄇㄚ' },
  'cb-p-first-consonants': { pinyin: 'b p', zhuyin: 'ㄅㄆ' },
  'cb-p-first-vowels': { pinyin: 'a o', zhuyin: 'ㄚㄛ' },
  'cb-p-combine': { pinyin: 'ba', zhuyin: 'ㄅㄚ' },
  'cb-p-four-tones': { pinyin: 'mǎ', zhuyin: 'ㄇㄚˇ' },
  'cb-p-recognize-tones': '耳',
  'cb-p-tone-pairs': { pinyin: 'nǐ hǎo', zhuyin: 'ㄋㄧˇ' },
  'cb-p-more-consonants': { pinyin: 'd t', zhuyin: 'ㄉㄊ' },
  'cb-p-jqx': { pinyin: 'j q', zhuyin: 'ㄐㄑ' },
  'cb-p-retroflex': { pinyin: 'zh', zhuyin: 'ㄓ' },
  'cb-p-zcs': { pinyin: 'z c', zhuyin: 'ㄗㄘ' },
  'cb-p-compound': { pinyin: 'ai', zhuyin: 'ㄞ' },
  'cb-p-nasals': { pinyin: 'an', zhuyin: 'ㄢ' },
  'cb-p-spelling': { pinyin: 'yu', zhuyin: 'ㄩ' },
  'cb-p-tone-changes': '一',
  'cb-c-what-is': '字',
  'cb-c-structure': '好',
  'cb-c-components': '木',
  'cb-c-patterns': '林',
  'cb-c-recognize': '人',
  'cb-w-strokes': '一',
  'cb-w-order': '十',
  'cb-w-first': '大',
  'cb-w-structures': '明',
  'cb-w-practice': '永',
  'cb-s-introduce': '我',
  'cb-s-questions': '哪',
  'cb-s-no': '不',
  'cb-s-have': '有',
  'cb-s-conversation': '你',
}

/** A line under each module's heading. */
const MODULE_NOTE: Record<string, string> = {
  'Getting started': 'The building blocks of Mandarin.',
  'Individual sounds': 'Consonants, vowels and more.',
  Tones: 'Make your meaning clear.',
  'More sounds': 'The rest of the sound system.',
}

const HAS_CJK = /[㄀-ㄯˇˊˋˉ一-鿿]/

export function ChineseBasicsGroup() {
  const { group: groupParam } = useLocalSearchParams<{ group: string }>()
  const group = groupById(groupParam ?? '')
  const { completedLessonIds, basicsProgress, settings } = useApp()
  const [showGuide, setShowGuide] = useState(false)
  /* Opens on the section holding the next lesson; a finished group opens everything. */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => {
    if (!group) return new Set()
    const all = lessonsInGroup(group.id)
    const next = all.find((l) => !isLessonDone(l, completedLessonIds, settings.phoneticScript))
    if (!next) return new Set()
    return new Set(
      bySection(all)
        .filter((section) => !section.lessons.some(({ lesson }) => lesson.id === next.id))
        .map((section) => section.module ?? '-'),
    )
  })
  const { width: windowWidth } = useWindowDimensions()
  const column = Math.min(windowWidth, BASICS_CONTENT_MAX)

  const run = useEntranceRun()
  const page = useReveal({ from: 'bottom', at: 0, duration: 420, run, distance: 22 })
  const hero = useReveal({ from: 'right', at: 0, duration: 520, run, distance: 28 })
  const shadowArrival = useShadowReveal({ at: 0, duration: 420, run })

  if (!group) return <Redirect href="/basics" />

  const phonetic = settings.phoneticScript
  const text = (s: Phon) => basicsText(s, settings.script, phonetic)
  const lessons = lessonsInGroup(group.id)
  const progress = groupProgress(group.id, completedLessonIds, phonetic)
  const nextId = lessons.find((l) => !isLessonDone(l, completedLessonIds, phonetic))?.id
  const sections = bySection(lessons)
  const art = ART[group.id] ?? CONTINUE_ART
  const artWidth = Math.min(column * BANNER_ART_SHARE, BANNER_ART_HEIGHT * art.ratio)
  const artHeight = artWidth / art.ratio

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: sp.xxxl }} showsVerticalScrollIndicator={false}>
        <ShadowRevealProvider value={shadowArrival}>
          <View style={{ width: column }}>
            <Animated.View style={[{ paddingHorizontal: BASICS_GUTTER }, page]} needsOffscreenAlphaCompositing>
              <BasicsBackRow fallback="/basics" />

              {/* The group's header: painting top right, title and intro, progress along the foot. */}
              <HubCard style={{ marginTop: sp.sm }}>
                <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0 }, hero]}>
                  <Image source={art.source} resizeMode="contain" style={{ width: artWidth, height: artHeight }} />
                </Animated.View>
                <View style={{ padding: sp.lg }}>
                  <View
                    style={{
                      minHeight: artHeight - sp.lg + 2,
                      justifyContent: 'flex-end',
                      maxWidth: column - BASICS_GUTTER * 2 - artWidth - sp.sm,
                    }}
                  >
                    <Text className="font-lora-bold" accessibilityRole="header" style={{ ...t.groupTitle, ...BANNER_TITLE, color: c.navy }}>
                      {group.title}
                    </Text>
                  </View>
                  <Text className="font-lora" style={{ ...hubType.intro, marginTop: 6, color: c.slate }}>
                    {group.intro}
                  </Text>
                  <View style={{ marginTop: sp.lg, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
                    <BasicsProgressBar done={progress.done} total={progress.total} height={6} />
                    <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
                      {progress.done} / {progress.total} lessons
                    </Text>
                  </View>
                </View>
              </HubCard>

              <View style={{ marginTop: sp.lg, gap: sp.lg }}>
                {group.id === 'writing' && (
                  <HubCard>
                    <ResourceRow
                      icon={<PenLine size={20} color={c.jadeDark} strokeWidth={2.2} />}
                      title="The Writing Primer"
                      subtitle="Four pages on how characters are built, with a character to trace."
                      meta="Guide · 5 min"
                      onPress={() => setShowGuide(true)}
                    />
                  </HubCard>
                )}
                {sections.map(({ module, lessons: rows }, sectionIndex) => {
                  const key = module ?? '-'
                  const open = !collapsed.has(key)
                  const done = rows.filter(({ lesson }) => isLessonDone(lesson, completedLessonIds, phonetic)).length
                  return (
                    <HubCard key={key}>
                      <SectionHeader
                        number={sectionIndex + 1}
                        title={module ?? 'Lessons'}
                        note={module ? MODULE_NOTE[module] : group.description}
                        done={done}
                        total={rows.length}
                        open={open}
                        onToggle={() => toggle(key)}
                      />
                      {open && (
                        <SectionRows>
                          {rows.map(({ lesson, number }) => {
                            const lessonDone = isLessonDone(lesson, completedLessonIds, phonetic)
                            const inProgress =
                              !lessonDone &&
                              resumeStep(basicsProgress, lessonKey(lesson, phonetic), stepsFor(lesson, phonetic).length) > 0
                            const status: LessonStatus = lessonDone
                              ? 'done'
                              : inProgress
                                ? 'continue'
                                : lesson.id === nextId
                                  ? progress.done === 0
                                    ? 'start'
                                    : 'next'
                                  : null
                            return (
                              <View key={lesson.id}>
                                <View style={{ height: 1, backgroundColor: c.hairline }} />
                                <LessonRow
                                  glyph={text(LESSON_GLYPH[lesson.id] ?? String(number))}
                                  script={settings.script}
                                  number={number}
                                  title={text(lesson.title)}
                                  subtitle={text(lesson.subtitle)}
                                  minutes={lesson.minutes}
                                  status={status}
                                  onPress={() =>
                                    router.push({ pathname: '/basics/lesson/[lessonId]', params: { lessonId: lesson.id } })
                                  }
                                />
                              </View>
                            )
                          })}
                        </SectionRows>
                      )}
                    </HubCard>
                  )
                })}
              </View>
            </Animated.View>
          </View>
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

/** The one card every hub surface uses: white, hairline, the family's faint shadow. */
function HubCard({ style, children }: { style?: object; children: ReactNode }) {
  return (
    <ShadowSurface
      shadow={dashShadow}
      style={{
        borderRadius: radius.row,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.hairline,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </ShadowSurface>
  )
}

function SectionHeader({
  number,
  title,
  note,
  done,
  total,
  open,
  onToggle,
}: {
  number: number
  title: string
  note?: string
  done: number
  total: number
  open: boolean
  onToggle: () => void
}) {
  /* The chevron turns over rather than swapping icons, so the change reads as one control flipping. */
  const turn = useRef(new Animated.Value(open ? 0 : 1)).current
  useEffect(() => {
    const anim = Animated.timing(turn, {
      toValue: open ? 0 : 1,
      duration: 220,
      easing: ARRIVE,
      useNativeDriver: Platform.OS !== 'web',
    })
    anim.start()
    const backstop = setTimeout(() => turn.setValue(open ? 0 : 1), 220 + 140)
    return () => {
      anim.stop()
      clearTimeout(backstop)
    }
  }, [open, turn])
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const complete = total > 0 && done === total

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${title}, ${done} of ${total} done. ${open ? 'Collapse' : 'Expand'}`}
    >
      <View
        style={{
          minHeight: 64,
          backgroundColor: c.sectionHead,
          paddingHorizontal: sp.lg,
          paddingVertical: sp.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.md,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.sectionDisc,
          }}
        >
          {complete ? (
            <Check size={15} color={c.onSolid} strokeWidth={3} />
          ) : (
            <Text className="font-nunito-bold" style={{ fontSize: 14, lineHeight: 18, color: c.onSolid }}>
              {number}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text className="font-lora-bold" accessibilityRole="header" style={{ ...hubType.sectionTitle, color: c.navy }}>
            {title}
          </Text>
          {note && (
            <Text className="font-lora" style={{ ...hubType.sectionNote, marginTop: 1, color: c.slate }}>
              {note}
            </Text>
          )}
        </View>
        <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
          {done} / {total}
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronUp size={20} color={c.slate} strokeWidth={2.2} />
        </Animated.View>
      </View>
    </Pressable>
  )
}

/** A section's rows, easing in each time it is opened. */
function SectionRows({ children }: { children: ReactNode }) {
  const shown = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.timing(shown, {
      toValue: 1,
      duration: 260,
      easing: ARRIVE,
      useNativeDriver: Platform.OS !== 'web',
    })
    anim.start()
    const backstop = setTimeout(() => shown.setValue(1), 260 + 140)
    return () => {
      anim.stop()
      clearTimeout(backstop)
    }
  }, [shown])
  const translateY = shown.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] })
  return <Animated.View style={{ opacity: shown, transform: [{ translateY }] }}>{children}</Animated.View>
}

/**
 * Only what changes what the learner does next earns a label: the
 * recommended lesson, one left part-way, and one finished. A lesson not yet
 * started carries none.
 */
type LessonStatus = 'start' | 'next' | 'continue' | 'done' | null

function StatusLabel({ status }: { status: LessonStatus }) {
  if (status === 'done') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Check size={13} color={c.jadeDark} strokeWidth={2.8} />
        <Text className="font-nunito-bold" style={{ ...t.pill, color: c.jadeDark }}>
          Completed
        </Text>
      </View>
    )
  }
  if (status === 'continue') return <BasicsPill label="Continue" />
  if (status === 'start') return <BasicsPill label="Start here" />
  if (status === 'next') return <BasicsPill label="Next" />
  return null
}

function LessonRow({
  glyph,
  script,
  number,
  title,
  subtitle,
  minutes,
  status,
  onPress,
}: {
  glyph: string
  script: Parameters<typeof hanziFont>[0]
  number: number
  title: string
  subtitle: string
  minutes: number
  status: LessonStatus
  onPress: () => void
}) {
  const done = status === 'done'
  const long = [...glyph].length > 2
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`Lesson ${number}: ${title}. ${subtitle}. ${minutes} minutes${done ? ', completed' : ''}`}
    >
      <View
        style={{
          paddingHorizontal: sp.lg,
          paddingVertical: sp.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.md,
          backgroundColor: c.card,
        }}
      >
        {/* The glyph tile, its lesson number (or a tick) on the corner. */}
        <View style={{ width: TILE, height: TILE }}>
          <View
            style={{
              flex: 1,
              borderRadius: 14,
              backgroundColor: c.glyphTile,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              className={HAS_CJK.test(glyph) ? hanziFont(script, 'semibold') : 'font-lora-bold'}
              numberOfLines={1}
              style={{
                fontSize: long ? 16 : 23,
                lineHeight: long ? 22 : 30,
                color: c.navy,
                includeFontPadding: false,
              }}
            >
              {glyph}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              left: -5,
              top: -5,
              width: 20,
              height: 20,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: done ? c.jade : c.card,
              borderWidth: 1,
              borderColor: done ? c.jade : c.hairline,
            }}
          >
            {done ? (
              <Check size={11} color={c.onSolid} strokeWidth={3} />
            ) : (
              <Text className="font-nunito-bold" style={{ fontSize: 10.5, lineHeight: 13, color: c.slate }}>
                {number}
              </Text>
            )}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text className="font-lora-bold" style={{ ...hubType.rowTitle, color: c.navy }}>
            {title}
          </Text>
          <Text className="font-lora" style={{ ...hubType.rowBody, marginTop: 2, color: c.slate }}>
            {subtitle}
          </Text>
          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: sp.md, rowGap: sp.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.xs }}>
              <Clock size={13} color={c.slate} strokeWidth={2.2} />
              <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
                {minutes} min
              </Text>
            </View>
            <StatusLabel status={status} />
          </View>
        </View>
        <BasicsChevron size={32} />
      </View>
    </PressableScale>
  )
}

/** A quiet resource above the lessons (the Writing Primer): an icon where a number would be, no status. */
function ResourceRow({
  icon,
  title,
  subtitle,
  meta,
  onPress,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  meta: string
  onPress: () => void
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`}>
      <View
        style={{
          paddingHorizontal: sp.lg,
          paddingVertical: sp.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.md,
          backgroundColor: c.card,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginHorizontal: (TILE - 40) / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.glyphTile,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text className="font-lora-bold" style={{ ...hubType.rowTitle, color: c.navy }}>
            {title}
          </Text>
          <Text className="font-lora" style={{ ...hubType.rowBody, marginTop: 2, color: c.slate }}>
            {subtitle}
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.meta, marginTop: 4, color: c.slate }}>
            {meta}
          </Text>
        </View>
        <BasicsChevron size={32} />
      </View>
    </PressableScale>
  )
}
