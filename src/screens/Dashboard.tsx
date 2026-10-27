import { useEffect, useMemo, useRef } from 'react'
import { View, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useApp } from '../context/AppContext'
import { HomeHero } from '../components/dashboard/HomeHero'
import {
  ReviewCard,
  WordCard,
  ChallengesCard,
  WeekCard,
  type ChallengeStep,
  type RewardState,
} from '../components/dashboard/HomeCards'
import { Reveal, useEntranceRun } from '../components/dashboard/entrance'
import { useScrollToTopOnFocus } from '../components/useScrollToTopOnFocus'
import {
  dashColors as c,
  dashSpacing as s,
  dashEntrance as e,
  dashRadius,
  homeLayout as l,
  DASH_CONTENT_MAX,
} from '../components/dashboard/tokens'
import { dueCountFor, newWordsPool, NEW_WORDS_SESSION_SEED } from '../lib/selectors'
import { currentWeekActivity } from '../lib/progress'
import { todayISO } from '../lib/date'
import { devNow } from '../lib/devClock'
import {
  COMPLETION_REWARDS,
  challengeInstanceId,
  challengeTarget,
  isChallengeComplete,
  isCompletionRewardEarned,
  offeredChallenges,
  type ChallengeContext,
  type ChallengeDef,
} from '../lib/challenges'
import { carefulHaptic, tickHaptic } from '../lib/haptics'
import { playTapSound } from '../lib/sound'
import { AppBannerAd } from '../components/ads/AppBannerAd'
import { TourScrollContext, TourTarget } from '../components/tour/targets'

/*
 * Home, built to "SS1012 Home Page Redesign UI 2".
 *
 * Its design system is the `home*` section of `components/dashboard/tokens.ts`;
 * its pieces are `HomeHero` and `HomeCards`. What lives here is the screen's
 * composition and the wiring from app state to each card — every card is a
 * pure presentation of numbers this screen has already worked out.
 *
 * The whole screen scrolls inside a fixed 430pt column. On a wider window the
 * column centres rather than stretching: these cards are phone-sized objects.
 */

function greeting(): string {
  const hour = devNow().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}


/** The two lines under each step on the challenge path. */
function stepLabel(def: ChallengeDef, target: number): Pick<ChallengeStep, 'verb' | 'detail'> {
  const words = `${target} ${target === 1 ? 'word' : 'words'}`
  switch (def.id) {
    case 'daily-new-words':
      return { verb: 'Learn', detail: words }
    case 'daily-writing':
      return { verb: 'Write', detail: `${target} characters` }
    case 'daily-listening':
      return { verb: 'Listen', detail: `${target} questions` }
    case 'daily-review':
      return { verb: 'Review', detail: words }
    default:
      return { verb: def.title.split(' ')[0], detail: String(target) }
  }
}

/** How many of the pool's front-runners the date chooses between for the word of the day. */
const WORD_OF_DAY_SPREAD = 8

/** A stable number from a date string, so each day lands on its own word. */
function dateHash(date: string): number {
  let h = 0
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0
  return h
}

export function Dashboard() {
  const {
    wordBank,
    wordsLearnedToday,
    dailyProgress,
    streak,
    deck,
    settings,
    xp,
    completedLessonIds,
    claimedChallengeIds,
    addToReviewDeck,
    removeFromReviewDeck,
    updateSettings,
    newWordHistory,
    reportTourAction,
  } = useApp()

  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, DASH_CONTENT_MAX)
  const contentWidth = columnWidth - l.screen * 2

  const dueCount = dueCountFor(deck)
  const todayReviews = dailyProgress.find((d) => d.date === todayISO())?.reviewsCompleted ?? 0

  const { challengeSteps, reward } = useMemo(() => {
    const ctx: ChallengeContext = {
      dailyProgress,
      streak,
      completedLessonCount: completedLessonIds.length,
      xp,
      dailyNewWordLimit: settings.dailyNewWordLimit,
      dailyReviewLimit: settings.dailyReviewLimit,
    }
    const steps: ChallengeStep[] = offeredChallenges('daily').map((def) => ({
      id: def.id,
      ...stepLabel(def, challengeTarget(def, ctx)),
      done: isChallengeComplete(def, ctx),
    }))
    const claimed = claimedChallengeIds.includes(challengeInstanceId(COMPLETION_REWARDS.daily))
    const state: RewardState = claimed ? 'claimed' : isCompletionRewardEarned('daily', ctx) ? 'ready' : 'locked'
    return { challengeSteps: steps, reward: state }
  }, [dailyProgress, streak, completedLessonIds.length, xp, claimedChallengeIds, settings.dailyNewWordLimit, settings.dailyReviewLimit])

  const week = useMemo(() => currentWeekActivity(dailyProgress), [dailyProgress])

  // --- The word on offer ------------------------------------------------------

  /*
   * The word of the day: chosen once per date from the front of the learner's
   * new-word pool (skipped words stay out), then remembered, so it stays put
   * all day — after it is added, after the app restarts. The date picks among
   * the first few candidates, so the word changes each day even when nothing
   * else has.
   */
  const today = todayISO()
  const wordOfDayRecord = settings.wordOfDay
  const pool = useMemo(() => {
    const skipped = new Set(newWordHistory.filter((h) => h.outcome === 'skipped').map((h) => h.wordId))
    return newWordsPool(wordBank, deck, settings, NEW_WORDS_SESSION_SEED).filter((w) => !skipped.has(w.id))
  }, [wordBank, deck, settings, newWordHistory])
  const offeredWord = useMemo(() => {
    if (wordOfDayRecord?.date === today) {
      const kept = wordBank.find((w) => w.id === wordOfDayRecord.wordId)
      if (kept) return kept
    }
    if (pool.length === 0) return undefined
    return pool[dateHash(today) % Math.min(pool.length, WORD_OF_DAY_SPREAD)]
  }, [wordOfDayRecord, today, wordBank, pool])
  useEffect(() => {
    if (offeredWord && (wordOfDayRecord?.date !== today || wordOfDayRecord.wordId !== offeredWord.id)) {
      updateSettings({ wordOfDay: { date: today, wordId: offeredWord.id } })
    }
  }, [offeredWord, wordOfDayRecord, today, updateSettings])
  const wordAdded = !!offeredWord && deck.some((card) => card.wordId === offeredWord.id)

  const [greetingLead, ...greetingRest] = greeting().split(' ')
  const greetingTail = greetingRest.join(' ')

  /*
   * A streak that's alive but untouched today is about to lapse. Warned once per
   * mount of this screen — the flame and day count are right here, so the buzz
   * has something to point at rather than arriving out of nowhere.
   */
  const warnedRef = useRef(false)
  const streakAtRisk = streak > 0 && wordsLearnedToday === 0 && todayReviews === 0
  useEffect(() => {
    if (!streakAtRisk || warnedRef.current) return
    warnedRef.current = true
    carefulHaptic()
  }, [streakAtRisk])

  /* The entrance replays every time this screen is focused, not only on mount. */
  const run = useEntranceRun()

  /* Coming back to Home means coming back to the greeting, not to the last scroll. */
  const scroll = useScrollToTopOnFocus()

  /*
   * The guided tour spotlights cards on this screen, and on a short phone the
   * word card can start below the fold — so the tour can ask for a scroll. The
   * offset is tracked rather than read back, which a ScrollView cannot do.
   */
  const scrollY = useRef(0)
  const tourScrollBy = useMemo(
    () => (dy: number) => scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: true }),
    [scroll],
  )

  let cardIndex = 0
  const nextCardDelay = () => e.cards.at + e.cards.stagger * cardIndex++

  return (
    <View className="flex-1" style={{ backgroundColor: c.background }}>
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView
          ref={scroll}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={(ev) => {
            scrollY.current = ev.nativeEvent.contentOffset.y
          }}
          scrollEventThrottle={32}
          contentContainerStyle={{
            alignItems: 'center',
            // Clears the tab bar with room to spare.
            paddingBottom: s.xxl,
          }}
        >
          <View style={{ width: columnWidth }}>
            <HomeHero
              greetingLead={greetingLead}
              greetingTail={greetingTail}
              name={settings.username || 'Learner'}
              columnWidth={columnWidth}
              run={run}
            />

            <TourScrollContext.Provider value={tourScrollBy}>
              <View style={{ gap: l.gap, marginTop: l.gap, paddingHorizontal: l.screen }}>
                <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                  <TourTarget id="dashboard-review" radius={dashRadius.card}>
                    <ReviewCard dueCount={dueCount} width={contentWidth} onPress={() => router.navigate('/review-tab')} />
                  </TourTarget>
                </Reveal>

                <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                  <TourTarget id="dashboard-new-word" radius={dashRadius.card}>
                    <WordCard
                      word={offeredWord}
                      script={settings.script}
                      phoneticScript={settings.phoneticScript}
                      added={wordAdded}
                      wordsToday={wordsLearnedToday}
                      width={contentWidth}
                      onSeeAll={() => {
                        playTapSound()
                        router.push('/new-words')
                      }}
                      onToggle={() => {
                        if (!offeredWord) return
                        if (wordAdded) {
                          /* Undo: out of the review deck again. */
                          tickHaptic()
                          removeFromReviewDeck([offeredWord.id])
                        } else {
                          playTapSound()
                          /* Counts toward today's goal once; an undo doesn't rewind the count, so adding back doesn't count again. */
                          addToReviewDeck(offeredWord.id, { count: !wordOfDayRecord?.counted })
                          reportTourAction('word:add')
                        }
                        updateSettings({ wordOfDay: { date: today, wordId: offeredWord.id, counted: true } })
                      }}
                    />
                  </TourTarget>
                </Reveal>

                <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                  <ChallengesCard
                    steps={challengeSteps}
                    reward={reward}
                    xpReward={COMPLETION_REWARDS.daily.xpReward}
                    width={contentWidth}
                    onPress={() => router.push('/challenges')}
                  />
                </Reveal>

                <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                  {/* Progress is the same story over twelve weeks, so it is where this card leads. */}
                  <WeekCard week={week} width={contentWidth} onPress={() => router.push('/settings/progress')} />
                </Reveal>

                {/*
                  The one advert on this screen, last on purpose and outside the
                  entrance: everything the learner came for is above it. It renders
                  nothing for an ad-free learner and collapses if it fails to load.
                */}
                <AppBannerAd placement="dashboard" />
              </View>
            </TourScrollContext.Provider>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
