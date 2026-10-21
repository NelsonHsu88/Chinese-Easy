import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, Image, Animated, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { allDueCardsFor } from '../lib/selectors'
import { displayWord, displayPinyin, displayExample, hanziFont } from '../lib/hanzi'
import { ReadingSentence } from '../components/dictionary/ReadingSentence'
import { Modal } from '../components/Modal'
import { SpeakButton } from '../components/SpeakButton'
import { CATEGORY_META } from '../lib/categories'
import { PressableScale } from '../components/dashboard/parts'
import { ReviewButton } from '../components/review/parts'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { ShadowRevealProvider, ShadowSurface, useShadowReveal } from '../components/shadowReveal'
import { playTints, type PlayTint } from '../components/dashboard/tokens'
import { revColors as c, revSpacing as s, revRadius, revShadow, REV_CONTENT_MAX } from '../components/review/tokens'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../components/pageHeader'
import { thunkHaptic } from '../lib/haptics'
import { PlayWash } from '../components/dashboard/playWash'
import type { VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'

/*
 * Due for Review — the list behind the Review hub's "Due today" stat.
 *
 * Rebuilt into the Review family (it was the last screen on the old slate
 * design): the same title block, cards and raised jade button as the hub, and
 * each word's FSRS stage as a chip in one of the shared `playTints` hues, so
 * the pile reads at a glance — blue new words, gold ones being learned, green
 * ones in review, pink ones that lapsed and are working their way back.
 */

/** FSRS card states, as a learner-facing word and a hue. */
const STAGE: Record<string, { label: string; tint: PlayTint }> = {
  new: { label: 'New', tint: playTints.sky },
  learning: { label: 'Learning', tint: playTints.honey },
  review: { label: 'Review', tint: playTints.jade },
  relearning: { label: 'Relearning', tint: playTints.blossom },
}

const EMPTY_ART = { source: require('../assets/images/session-end/empty-hero.png') }
/** The Flashcards card's 字 stack (SS1017), at the summary banner's right. 176×150. */
const BANNER_ART = { source: require('../assets/images/ss1017/review-flashcards.png'), ratio: 176 / 150 }
const STAGE_ORDER = ['new', 'learning', 'review', 'relearning'] as const

export function DueWords() {
  const { deck, settings, getWord } = useApp()
  const [selected, setSelected] = useState<VocabWord | null>(null)
  const { width } = useWindowDimensions()
  const column = Math.min(width, REV_CONTENT_MAX)

  const dueCards = useMemo(() => allDueCardsFor(deck, settings), [deck, settings])
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const card of dueCards) counts[card.state] = (counts[card.state] ?? 0) + 1
    return counts
  }, [dueCards])
  const bannerArt = Math.min(150, column * 0.36)

  const run = useEntranceRun()
  const head = useReveal({ from: 'bottom', at: 0, duration: 380, run, distance: 16 })
  const list = useReveal({ from: 'bottom', at: 90, duration: 420, run, distance: 20 })
  const shadowArrival = useShadowReveal({ at: 90, duration: 420, run })

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: dueCards.length > 0 ? 110 : s.xl }}
        showsVerticalScrollIndicator={false}
      >
        <ShadowRevealProvider value={shadowArrival}>
          <View style={{ width: column, flexGrow: 1, paddingHorizontal: s.screen }}>
            <View style={{ paddingTop: s.sm }}>
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/review-tab'))}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={10}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: playTints.jade.fill,
                  borderWidth: 1,
                  borderColor: playTints.jade.border,
                }}
              >
                <ArrowLeft size={20} color={playTints.jade.text} strokeWidth={2.4} />
              </Pressable>
            </View>

            <Animated.View style={head}>
              <Text className="font-lora-bold" accessibilityRole="header" style={{ ...PAGE_TITLE, marginTop: s.md, color: c.navy }}>
                Due today
              </Text>
              <Text className="font-lora" style={{ ...PAGE_SUBTITLE, marginTop: 4, color: c.slate }}>
                {dueCards.length === 0 ? 'Nothing waiting for you.' : 'A little review keeps every word fresh.'}
              </Text>

              {dueCards.length > 0 && (
                /* The pile at a glance, in the Flashcards card's sky wash. */
                <ShadowSurface
                  shadow={revShadow}
                  style={{
                    marginTop: s.lg,
                    borderRadius: revRadius.large,
                    backgroundColor: playTints.sky.fill,
                    borderWidth: 1,
                    borderColor: playTints.sky.border,
                    minHeight: bannerArt / BANNER_ART.ratio,
                  }}
                >
                  <PlayWash tint={playTints.sky} direction="left" radius={revRadius.large - 1} />
                  <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' }}>
                    <Image source={BANNER_ART.source} resizeMode="contain" style={{ width: bannerArt, height: bannerArt / BANNER_ART.ratio }} />
                  </View>
                  <View style={{ padding: s.lg, paddingRight: bannerArt }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text className="font-lora-bold" style={{ fontSize: 40, lineHeight: 46, color: playTints.sky.text }}>
                        {dueCards.length}
                      </Text>
                      <Text className="font-lora-bold" style={{ fontSize: 17, lineHeight: 22, color: c.navy }}>
                        {dueCards.length === 1 ? 'word ready' : 'words ready'}
                      </Text>
                    </View>
                    <View style={{ marginTop: s.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {STAGE_ORDER.filter((key) => stageCounts[key]).map((key) => (
                        <View key={key} style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: STAGE[key].tint.soft }}>
                          <Text className="font-nunito-bold" style={{ fontSize: 12, lineHeight: 16, color: STAGE[key].tint.text }}>
                            {stageCounts[key]} {STAGE[key].label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </ShadowSurface>
              )}
            </Animated.View>

            {dueCards.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: s.md, paddingVertical: s.xxl }}>
                <Image source={EMPTY_ART.source} resizeMode="contain" style={{ width: 200, height: 170 }} />
                <Text className="font-lora" style={{ fontSize: 16, lineHeight: 22, color: c.slate, textAlign: 'center' }}>
                  All caught up. New words you save{'\n'}will show up here when they're due.
                </Text>
              </View>
            ) : (
              <Animated.View style={[{ marginTop: s.lg, gap: s.sm }, list]}>
                {dueCards.map((card) => {
                  const word = getWord(card.wordId)
                  if (!word) return null
                  const stage = STAGE[card.state] ?? { label: card.state, tint: playTints.lilac }
                  const hanzi = displayWord(word, settings.script)
                  return (
                    <PressableScale
                      key={card.wordId}
                      onPress={() => setSelected(word)}
                      scaleTo={0.985}
                      accessibilityLabel={`${hanzi}, ${shortGloss(word)}, ${stage.label}`}
                    >
                      <ShadowSurface
                        shadow={revShadow}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: s.md,
                          paddingHorizontal: s.lg,
                          paddingVertical: s.md,
                          borderRadius: revRadius.large,
                          backgroundColor: stage.tint.fill,
                          borderWidth: 1,
                          borderColor: stage.tint.border,
                        }}
                      >
                        <PlayWash tint={stage.tint} radius={revRadius.large - 1} />
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: c.card,
                            borderWidth: 1,
                            borderColor: stage.tint.border,
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            className={hanziFont(settings.script, 'medium')}
                            style={{ fontSize: [...hanzi].length > 2 ? 18 : 24, lineHeight: 32, color: c.navy }}
                          >
                            {hanzi}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} className="font-nunito-semibold" style={{ fontSize: 14.5, lineHeight: 19, color: c.slate }}>
                            {displayPinyin(word, settings.phoneticScript)}
                          </Text>
                          <Text numberOfLines={1} className="font-lora-bold" style={{ fontSize: 15.5, lineHeight: 21, color: c.navy }}>
                            {shortGloss(word)}
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: stage.tint.soft }}>
                          <Text className="font-nunito-bold" style={{ fontSize: 12, lineHeight: 16, color: stage.tint.text }}>
                            {stage.label}
                          </Text>
                        </View>
                        <ChevronRight size={18} color={stage.tint.ink} strokeWidth={2.2} />
                      </ShadowSurface>
                    </PressableScale>
                  )
                })}
              </Animated.View>
            )}
          </View>
        </ShadowRevealProvider>
      </ScrollView>

      {dueCards.length > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            paddingTop: s.md,
            paddingBottom: s.xl,
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderTopWidth: 1,
            borderTopColor: c.border,
          }}
        >
          <View style={{ width: column, paddingHorizontal: s.screen }}>
            <ReviewButton
              label="Start Review"
              tone="primary"
              onPress={() => {
                thunkHaptic()
                /* Straight into the session these words are waiting for —
                   sending the learner back to the hub made them choose twice. */
                router.push('/review-session?mode=full')
              }}
            />
          </View>
        </View>
      )}

      {selected && (
        <Modal title={displayWord(selected, settings.script)} onClose={() => setSelected(null)}>
          <View className="items-center gap-3">
            <View className="flex-row items-center gap-2">
              <Text className={hanziFont(settings.script, 'semibold')} style={{ fontSize: 56, lineHeight: 70, color: c.navy }}>
                {displayWord(selected, settings.script)}
              </Text>
              <SpeakButton text={displayWord(selected, settings.script)} />
            </View>
            <Text className="font-nunito-semibold" style={{ fontSize: 18, lineHeight: 24, color: c.slate }}>
              {displayPinyin(selected, settings.phoneticScript)}
            </Text>
            <Text className="font-lora-bold" style={{ fontSize: 20, lineHeight: 26, color: c.navy }}>
              {shortGloss(selected)}
            </Text>
            {selected.example && displayExample(selected, settings.script) && (
              <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: c.border, paddingTop: s.md }}>
                <ReadingSentence
                  text={displayExample(selected, settings.script)}
                  term={displayWord(selected, settings.script)}
                  tone="card"
                  size="compact"
                />
                <Text className="font-lora" style={{ fontSize: 14, lineHeight: 20, color: c.slate, fontStyle: 'italic' }}>
                  {selected.example.translation}
                </Text>
              </View>
            )}
            <View className="flex-row flex-wrap items-center justify-center gap-2">
              {[selected.custom ? 'Custom word' : `HSK ${selected.hskLevel}`, CATEGORY_META[selected.category].label].map(
                (label, i) => {
                  const tint = i === 0 ? playTints.jade : playTints.sky
                  return (
                    <View key={label} style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: tint.soft }}>
                      <Text className="font-nunito-bold" style={{ fontSize: 12, lineHeight: 16, color: tint.text }}>
                        {label}
                      </Text>
                    </View>
                  )
                },
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}
