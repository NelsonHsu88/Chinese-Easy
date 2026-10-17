import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View, Text, Image, ScrollView, Animated, Platform, Pressable, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { BarChart3, Check, ChevronUp, Clock, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { PressableScale } from '../components/dashboard/parts'
import { ARRIVE, useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { ShadowRevealProvider, ShadowSurface, useShadowReveal } from '../components/shadowReveal'
import { dashShadow, playTints, type PlayHue, type PlayTint } from '../components/dashboard/tokens'
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
 * in order. Nothing is locked — the order is a recommendation, marked "Next",
 * and any lesson can be opened or replayed. A lesson left part-way shows
 * "In progress" and reopens at its step.
 *
 * Built to the Pronunciation half of "SS1017 Dictionary and Pronunciation UI
 * Redesign.png": the painting top right over the title, a "Your progress" card,
 * then each `module` as its own card — a tinted header band with a solid
 * numbered disc, a count and a collapse chevron, over its lessons separated by
 * hairlines. Sections take hues in order (`playHueAt`). The reference's lesson
 * thumbnails are paintings; here each is a tile in the section's wash carrying
 * what the lesson teaches (`LESSON_GLYPH`) — legible at thumbnail size, which a
 * crop of an 85px mockup thumbnail would not be.
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

/** The painting's share of the column, and the most it may stand. */
const ART_SHARE = 0.5
const ART_MAX_HEIGHT = 124
/** How far the title may ride up over the painting's (empty) foot. */
const TITLE_OVERLAP = 6

const THUMB = { w: 76, h: 60 }

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

/** Section hues in the reference's order: green, blue, then gold. */
const SECTION_HUES: readonly PlayHue[] = ['jade', 'sky', 'honey', 'blossom', 'lilac']

const HAS_CJK = /[㄀-ㄯˇˊˋˉ一-鿿]/

export function ChineseBasicsGroup() {
  const { group: groupParam } = useLocalSearchParams<{ group: string }>()
  const group = groupById(groupParam ?? '')
  const { completedLessonIds, basicsProgress, settings } = useApp()
  const [showGuide, setShowGuide] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
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
  const artWidth = Math.min(column * ART_SHARE, ART_MAX_HEIGHT * art.ratio)
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
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: sp.sm, right: sp.sm }, hero]}>
              <Image source={art.source} resizeMode="contain" style={{ width: artWidth, height: artHeight }} />
            </Animated.View>

            <Animated.View style={[{ paddingHorizontal: BASICS_GUTTER }, page]} needsOffscreenAlphaCompositing>
              <BasicsBackRow fallback="/basics" />
              <View style={{ paddingTop: Math.max(sp.md, artHeight - 44 - TITLE_OVERLAP) }}>
                <Text
                  className="font-lora-bold"
                  accessibilityRole="header"
                  style={{ ...t.groupTitle, color: c.navy }}
                >
                  {group.title}
                </Text>
                <Text className="font-lora" style={{ ...t.cardBody, fontSize: 14.5, lineHeight: 20, marginTop: 6, color: c.slate }}>
                  {group.intro}
                </Text>
              </View>

              {/* ── Your progress ───────────────────────────────────────── */}
              <ShadowSurface
                shadow={dashShadow}
                style={{
                  marginTop: sp.lg,
                  borderRadius: radius.row,
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: sp.lg,
                  paddingVertical: sp.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: sp.md,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: playTints.sky.soft,
                  }}
                >
                  <BarChart3 size={20} color={playTints.sky.ink} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="font-lora-bold" style={{ fontSize: 14.5, lineHeight: 19, color: c.navy }}>
                    Your progress
                  </Text>
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
                    <BasicsProgressBar done={progress.done} total={progress.total} tint={playTints.sky} />
                    <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
                      {progress.done} / {progress.total} lessons
                    </Text>
                  </View>
                </View>
              </ShadowSurface>

              <View style={{ marginTop: sp.lg, gap: sp.lg }}>
                {group.id === 'writing' && (
                  <SectionCard tint={playTints.honey}>
                    <LessonRow
                      thumb={<Thumb tint={playTints.honey}><PenLine size={24} color={playTints.honey.ink} strokeWidth={2.2} /></Thumb>}
                      title="The Writing Primer"
                      subtitle="Four pages on how characters are built, with a character to trace."
                      minutes={5}
                      tint={playTints.honey}
                      pill={<BasicsPill label="Guide" tone="quiet" />}
                      onPress={() => setShowGuide(true)}
                    />
                  </SectionCard>
                )}
                {sections.map(({ module, lessons: rows }, sectionIndex) => {
                  const tint = playTints[SECTION_HUES[sectionIndex % SECTION_HUES.length]]
                  const key = module ?? '-'
                  const open = !collapsed.has(key)
                  const done = rows.filter(({ lesson }) => isLessonDone(lesson, completedLessonIds, phonetic)).length
                  return (
                    <SectionCard key={key} tint={tint}>
                      <SectionHeader
                        number={sectionIndex + 1}
                        title={module ?? 'Lessons'}
                        note={module ? MODULE_NOTE[module] : group.description}
                        done={done}
                        total={rows.length}
                        open={open}
                        tint={tint}
                        onToggle={() => toggle(key)}
                      />
                      {open && (
                        <SectionRows>
                          {rows.map(({ lesson, number }, i) => {
                            const lessonDone = isLessonDone(lesson, completedLessonIds, phonetic)
                            const inProgress =
                              !lessonDone &&
                              resumeStep(basicsProgress, lessonKey(lesson, phonetic), stepsFor(lesson, phonetic).length) > 0
                            const glyph = text(LESSON_GLYPH[lesson.id] ?? String(number))
                            return (
                              <View key={lesson.id}>
                                {i > 0 && <View style={{ height: 1, marginLeft: sp.lg, backgroundColor: c.border }} />}
                                <LessonRow
                                  thumb={
                                    <Thumb tint={tint} number={lessonDone ? undefined : number} done={lessonDone}>
                                      <Text
                                        className={HAS_CJK.test(glyph) ? hanziFont(settings.script, 'semibold') : 'font-lora-bold'}
                                        numberOfLines={1}
                                        style={{
                                          fontSize: glyph.length > 2 ? 19 : 26,
                                          lineHeight: glyph.length > 2 ? 26 : 34,
                                          color: c.navy,
                                          includeFontPadding: false,
                                        }}
                                      >
                                        {glyph}
                                      </Text>
                                    </Thumb>
                                  }
                                  title={text(lesson.title)}
                                  subtitle={text(lesson.subtitle)}
                                  minutes={lesson.minutes}
                                  tint={tint}
                                  pill={
                                    lessonDone ? (
                                      <BasicsPill label="Done" />
                                    ) : inProgress ? (
                                      <BasicsPill label="In progress" tone="coral" />
                                    ) : lesson.id === nextId ? (
                                      <BasicsPill label={progress.done === 0 ? 'Start here' : 'Next'} tone="coral" />
                                    ) : (
                                      <HuePill label="New" tint={playTints.honey} />
                                    )
                                  }
                                  onPress={() =>
                                    router.push({ pathname: '/basics/lesson/[lessonId]', params: { lessonId: lesson.id } })
                                  }
                                />
                              </View>
                            )
                          })}
                        </SectionRows>
                      )}
                    </SectionCard>
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

/** A module's card: white, hairline in its hue, the header band on top. */
function SectionCard({ tint, children }: { tint: PlayTint; children: ReactNode }) {
  return (
    <ShadowSurface
      shadow={dashShadow}
      style={{
        borderRadius: radius.row,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: tint.border,
        overflow: 'hidden',
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
  tint,
  onToggle,
}: {
  number: number
  title: string
  note?: string
  done: number
  total: number
  open: boolean
  tint: PlayTint
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

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${title}, ${done} of ${total} done. ${open ? 'Collapse' : 'Expand'}`}
    >
      <View
        style={{
          backgroundColor: tint.fill,
          paddingHorizontal: sp.md,
          paddingVertical: sp.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: sp.md,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tint.badge,
          }}
        >
          <Text className="font-lora-bold" style={{ fontSize: 17, lineHeight: 22, color: '#FFFFFF' }}>
            {number}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text className="font-lora-bold" accessibilityRole="header" style={{ ...t.rowTitle, color: c.navy }}>
            {title}
          </Text>
          {note && (
            <Text className="font-lora" style={{ ...t.cardBody, fontSize: 12.5, lineHeight: 17, color: c.slate }}>
              {note}
            </Text>
          )}
        </View>
        <Text className="font-nunito-bold" style={{ ...t.meta, color: tint.text }}>
          {done} / {total}
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronUp size={20} color={tint.text} strokeWidth={2.4} />
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

/** A lesson's thumbnail: a tile in the section's wash, its number in a disc on the corner. */
function Thumb({
  tint,
  number,
  done = false,
  children,
}: {
  tint: PlayTint
  number?: number
  done?: boolean
  children: ReactNode
}) {
  return (
    <View style={{ width: THUMB.w, height: THUMB.h }}>
      <View
        style={{
          flex: 1,
          borderRadius: 14,
          backgroundColor: tint.fill,
          borderWidth: 1,
          borderColor: tint.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
      {(number !== undefined || done) && (
        <View
          style={{
            position: 'absolute',
            left: -6,
            top: -6,
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: done ? tint.badge : c.card,
            borderWidth: 1.5,
            borderColor: tint.badge,
          }}
        >
          {done ? (
            <Check size={13} color="#FFFFFF" strokeWidth={3} />
          ) : (
            <Text className="font-nunito-bold" style={{ fontSize: 11.5, lineHeight: 14, color: tint.text }}>
              {number}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

/** A pill in one of the playful hues — "New" is honey, as in the reference. */
function HuePill({ label, tint }: { label: string; tint: PlayTint }) {
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: tint.soft }}>
      <Text className="font-nunito-bold" style={{ ...t.pill, color: tint.text }}>
        {label}
      </Text>
    </View>
  )
}

function LessonRow({
  thumb,
  title,
  subtitle,
  minutes,
  pill,
  tint,
  onPress,
}: {
  thumb: ReactNode
  title: string
  subtitle: string
  minutes: number
  pill: ReactNode
  tint: PlayTint
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
        {thumb}
        <View style={{ flex: 1 }}>
          <Text className="font-lora-bold" style={{ ...t.rowTitle, fontSize: 15.5, lineHeight: 20, color: c.navy }}>
            {title}
          </Text>
          <Text className="font-lora" style={{ ...t.cardBody, fontSize: 12.5, lineHeight: 17, marginTop: 2, color: c.slate }}>
            {subtitle}
          </Text>
          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.xs }}>
              <Clock size={13} color={playTints.sky.ink} strokeWidth={2.2} />
              <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
                {minutes} min
              </Text>
            </View>
            {pill}
          </View>
        </View>
        <BasicsChevron size={32} tint={tint} />
      </View>
    </PressableScale>
  )
}
