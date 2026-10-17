import { View, Text, Image, ScrollView, Animated, useWindowDimensions, type ImageSourcePropType } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApp } from '../context/AppContext'
import { PressableScale } from '../components/dashboard/parts'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { ShadowRevealProvider, ShadowSurface, useShadowReveal } from '../components/shadowReveal'
import { dashShadow, playTints, type PlayTint } from '../components/dashboard/tokens'
import {
  basicsColors as c,
  basicsRadius as radius,
  basicsSpacing as sp,
  basicsType as t,
  BASICS_CONTENT_MAX,
  BASICS_GUTTER,
  BASICS_GROUP_HUE,
} from '../components/basics/tokens'
import { BasicsBackRow, BasicsButton, BasicsChevron, BasicsProgressBar } from '../components/basics/parts'
import { BASICS_LESSONS, type BasicsGroupId, type Phon } from '../data/basics'
import { basicsText, featuredLesson, groupById, groupProgress, isLessonDone, lessonKey } from '../lib/basics'

/*
 * Chinese Basics — the course for complete beginners, opened from the Learn
 * tab's third card. Built to the Beta 2.1 reference "SS 1014 Writing Basic UI
 * redesign.png": a painted header, a Continue card with Shifu and the four
 * tones, and a two-by-two grid of the course's groups.
 *
 * One departure from the mockup: a lesson count on each tile. The course's
 * first lessons ("Getting started") open Pronunciation, so the Continue card
 * is the way in for a new learner — it offers the lesson they were part-way
 * through, else the next unfinished one in `COURSE_ORDER`.
 *
 * All painting is cut from the reference by `scripts/processBasicsArt.mjs`,
 * sized here by the same factor the mockup's 941px width maps onto the column.
 *
 * Coloured to "SS1017 Learn and Chinese Basic redesign.png": the Continue card
 * wears the sky wash and each tile its own hue, using the `tinted/` copies of
 * the card art (`scripts/processTintedArt.mjs`) so their paper takes the wash.
 */

const ART = {
  hero: require('../assets/images/basics/hero.png'),
  continue: require('../assets/images/tinted/basics-continue.png'),
  foot: require('../assets/images/basics/foot.png'),
  pronunciation: require('../assets/images/tinted/basics-pronunciation.png'),
  characters: require('../assets/images/tinted/basics-characters.png'),
  writing: require('../assets/images/tinted/basics-writing.png'),
  sentences: require('../assets/images/tinted/basics-sentences.png'),
} as const

/** The mockup's width, and each asset's pixel size in it. */
const MOCKUP_W = 941
const HERO = { w: 381, h: 284 }
const CONTINUE = { w: 466, h: 455 }
const FOOT = { w: 941, h: 98 }
/** The Continue card's width in the mockup — the art is scaled against it. */
const CONTINUE_CARD_W = 890
/**
 * The Continue card is drawn smaller than the mockup's, by request: Shifu at
 * this share of his mockup size, and the card no taller than he is.
 */
const CONTINUE_ART_SHRINK = 0.74
/** Tile art spans the tile; its height is the crop's ratio of it. */
const TILE_ART_RATIO = { tall: 296 / 424, short: 190 / 424 }

/** Tiles sit closer to each other than to the Continue card above them, so the four read as one set. */
const GRID_GAP = sp.md
const CARD_GAP = sp.xl

const TILES: { group: BasicsGroupId; art: ImageSourcePropType; tall: boolean; tint: PlayTint }[] = [
  { group: 'pronunciation', art: ART.pronunciation, tall: true, tint: playTints[BASICS_GROUP_HUE.pronunciation] },
  { group: 'characters', art: ART.characters, tall: true, tint: playTints[BASICS_GROUP_HUE.characters] },
  { group: 'writing', art: ART.writing, tall: false, tint: playTints[BASICS_GROUP_HUE.writing] },
  { group: 'sentences', art: ART.sentences, tall: false, tint: playTints[BASICS_GROUP_HUE.sentences] },
]
/** The Continue card's wash. */
const START_TINT = playTints.sky

const openGroup = (group: BasicsGroupId) =>
  router.push({ pathname: '/basics/[group]', params: { group } })
const openLesson = (lessonId: string) =>
  router.push({ pathname: '/basics/lesson/[lessonId]', params: { lessonId } })

export function ChineseBasicsHome() {
  const { completedLessonIds, basicsProgress, settings } = useApp()
  const { width: windowWidth } = useWindowDimensions()
  const column = Math.min(windowWidth, BASICS_CONTENT_MAX)
  const cardWidth = column - BASICS_GUTTER * 2
  const scale = column / MOCKUP_W
  const typeScale = Math.max(0.84, Math.min(1, column / BASICS_CONTENT_MAX))
  const phonetic = settings.phoneticScript
  const text = (s: Phon) => basicsText(s, settings.script, phonetic)

  const run = useEntranceRun()
  const page = useReveal({ from: 'bottom', at: 0, duration: 420, run, distance: 22 })
  const hero = useReveal({ from: 'right', at: 0, duration: 520, run, distance: 28 })
  const shadowArrival = useShadowReveal({ at: 0, duration: 420, run })

  const offer = featuredLesson(basicsProgress, completedLessonIds, phonetic)
  const featured = offer?.lesson ?? BASICS_LESSONS[0]
  const resuming = (offer?.resumeAt ?? 0) > 0
  const started =
    resuming ||
    BASICS_LESSONS.some((l) => isLessonDone(l, completedLessonIds, phonetic) || lessonKey(l, phonetic) in basicsProgress.resume)
  const featuredGroup = groupById(featured.group)!
  const featuredProgress = groupProgress(featured.group, completedLessonIds, phonetic)
  const eyebrow = !offer ? 'COURSE COMPLETE' : started ? 'CONTINUE LESSON' : 'START HERE'
  const buttonLabel = !offer ? 'Start Over' : resuming ? 'Resume' : started ? 'Continue' : 'Start Learning'

  const continueScale = (cardWidth / CONTINUE_CARD_W) * CONTINUE_ART_SHRINK
  const continueArt = { width: CONTINUE.w * continueScale, height: CONTINUE.h * continueScale }

  const tileWidth = (cardWidth - GRID_GAP) / 2

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <ShadowRevealProvider value={shadowArrival}>
          <View style={{ width: column, flexGrow: 1 }}>
            {/* The sun, pine and pavilion, flush with the column's top right. */}
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0 }, hero]}>
              <Image
                source={ART.hero}
                resizeMode="contain"
                style={{ width: HERO.w * scale, height: HERO.h * scale }}
              />
            </Animated.View>

            <Animated.View style={[{ paddingHorizontal: BASICS_GUTTER }, page]} needsOffscreenAlphaCompositing>
              <BasicsBackRow fallback="/lessons-tab" />
              <View style={{ paddingTop: sp.sm, paddingBottom: sp.xxl, minHeight: HERO.h * scale - 44 }}>
                <Text
                  className="font-lora-bold"
                  accessibilityRole="header"
                  style={{ ...t.pageTitle, fontSize: Math.min(t.pageTitle.fontSize, column * 0.093), color: c.navy }}
                >
                  Chinese Basics
                </Text>
                <Text className="font-lora" style={{ ...t.pageSubtitle, marginTop: 6, color: c.slate }}>
                  Build a strong foundation,{'\n'}step by step.
                </Text>
              </View>

              {/* ── Continue ─────────────────────────────────────────────── */}
              <ShadowSurface
                shadow={dashShadow}
                style={{
                  borderRadius: radius.card,
                  backgroundColor: START_TINT.fill,
                  borderWidth: 1,
                  borderColor: START_TINT.border,
                  overflow: 'hidden',
                  minHeight: continueArt.height,
                }}
              >
                <View pointerEvents="none" style={{ position: 'absolute', right: 0, bottom: 0 }}>
                  <Image source={ART.continue} resizeMode="contain" style={continueArt} />
                </View>
                <View style={{ width: cardWidth - continueArt.width, paddingLeft: sp.lg, paddingVertical: sp.lg }}>
                  <Text
                    className="font-nunito-bold"
                    style={{ ...t.eyebrow, color: START_TINT.text }}
                  >
                    {eyebrow}
                  </Text>
                  <Text
                    className="font-lora-bold"
                    style={{ marginTop: sp.xs, fontSize: t.cardTitle.fontSize * typeScale, lineHeight: t.cardTitle.lineHeight * typeScale, color: c.navy }}
                  >
                    {offer ? text(featured.title) : 'Well done'}
                  </Text>
                  <Text className="font-nunito-bold" style={{ ...t.meta, marginTop: sp.xs, color: c.sageDark }}>
                    {offer ? `${featuredGroup.title} · ${featured.minutes} min` : 'Every lesson finished'}
                  </Text>
                  <View style={{ marginTop: sp.md, flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
                    <BasicsProgressBar done={featuredProgress.done} total={featuredProgress.total} tint={START_TINT} />
                    <Text className="font-nunito-semibold" style={{ ...t.meta, color: c.slate }}>
                      {featuredProgress.done} / {featuredProgress.total}
                    </Text>
                  </View>
                  <View style={{ marginTop: sp.md }}>
                    <BasicsButton
                      hub
                      solid
                      label={buttonLabel}
                      onPress={() => openLesson(featured.id)}
                    />
                  </View>
                </View>
              </ShadowSurface>

              {/* ── The four groups ──────────────────────────────────────── */}
              {[TILES.slice(0, 2), TILES.slice(2)].map((row, i) => (
                <View key={i} style={{ marginTop: i === 0 ? CARD_GAP : GRID_GAP, flexDirection: 'row', gap: GRID_GAP }}>
                  {row.map((tile) => {
                    const group = groupById(tile.group)!
                    const progress = groupProgress(tile.group, completedLessonIds, phonetic)
                    const artHeight = tileWidth * (tile.tall ? TILE_ART_RATIO.tall : TILE_ART_RATIO.short)
                    return (
                      <PressableScale
                        key={tile.group}
                        onPress={() => openGroup(tile.group)}
                        accessibilityLabel={`${group.title}. ${text(group.description)}`}
                        wrapperStyle={{ width: tileWidth }}
                        style={{ flex: 1 }}
                      >
                        <ShadowSurface
                          shadow={dashShadow}
                          style={{
                            flex: 1,
                            borderRadius: radius.card,
                            backgroundColor: tile.tint.fill,
                            borderWidth: 1,
                            borderColor: tile.tint.border,
                            overflow: 'hidden',
                          }}
                        >
                          <Image source={tile.art} resizeMode="cover" style={{ width: '100%', height: artHeight }} />
                          <View style={{ flex: 1, paddingHorizontal: sp.lg, paddingBottom: sp.lg, marginTop: -sp.xs }}>
                            <Text
                              className="font-lora-bold"
                              style={{ ...t.tileTitle, fontSize: t.tileTitle.fontSize * typeScale, lineHeight: t.tileTitle.lineHeight * typeScale, color: c.navy }}
                            >
                              {group.title}
                            </Text>
                            <Text
                              className="font-lora"
                              style={{ marginTop: sp.xs, fontSize: t.cardBody.fontSize * typeScale, lineHeight: t.cardBody.lineHeight * typeScale, color: c.slate }}
                            >
                              {text(group.description)}
                            </Text>
                            <View style={{ flex: 1, minHeight: sp.md }} />
                            <View style={{ flexDirection: 'row', marginBottom: sp.sm }}>
                              <BasicsProgressBar done={progress.done} total={progress.total} height={6} tint={tile.tint} />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text className="font-nunito-bold" style={{ ...t.meta, color: tile.tint.text }}>
                                {progress.done === progress.total ? 'Complete' : `${progress.done} / ${progress.total} lessons`}
                              </Text>
                              <BasicsChevron size={34} tint={tile.tint} />
                            </View>
                          </View>
                        </ShadowSurface>
                      </PressableScale>
                    )
                  })}
                </View>
              ))}
            </Animated.View>

            <View style={{ flex: 1, minHeight: sp.md }} />
            <View pointerEvents="none">
              <Image
                source={ART.foot}
                resizeMode="contain"
                style={{ width: column, height: FOOT.h * (column / FOOT.w) }}
              />
            </View>
          </View>
        </ShadowRevealProvider>
      </ScrollView>
    </SafeAreaView>
  )
}
