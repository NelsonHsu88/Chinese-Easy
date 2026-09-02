import { useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Menu } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { StreakPill } from '../components/dashboard/parts'
import { DashboardHero } from '../components/dashboard/DashboardHero'
import { ReviewCard } from '../components/dashboard/ReviewCard'
import { NewWordCard } from '../components/dashboard/NewWordCard'
import { ChallengesSummaryCard } from '../components/dashboard/ChallengesSummaryCard'
import { WeeklyActivityCard } from '../components/dashboard/WeeklyActivityCard'
import { FIRE_ICON } from '../components/dashboard/art'
import { Reveal, useEntranceRun } from '../components/dashboard/entrance'
import { useScrollToTopOnFocus } from '../components/useScrollToTopOnFocus'
import {
  dashColors as c,
  dashSpacing as s,
  dashEntrance as e,
  DASH_CONTENT_MAX,
} from '../components/dashboard/tokens'
import { dueCountFor, newWordsPool } from '../lib/selectors'
import { currentWeekActivity } from '../lib/progress'
import { todayISO } from '../lib/date'
import { devNow } from '../lib/devClock'
import { CHALLENGE_DEFS, challengeInstanceId } from '../lib/challenges'
import { carefulHaptic, tapHaptic } from '../lib/haptics'
import { playTapSound } from '../lib/sound'
import { AppBannerAd } from '../components/ads/AppBannerAd'

/*
 * The Dashboard, built to the reference mockup.
 *
 * Its design system is `components/dashboard/tokens.ts`; its pieces are the
 * five components in that folder. What lives here is the screen's composition
 * and the wiring from app state to each card — deliberately, because every one
 * of those cards is a pure presentation of numbers this screen has already
 * worked out.
 *
 * The whole screen scrolls inside a fixed 430pt column. On a wider window the
 * column centres rather than stretching: these cards are phone-sized objects,
 * and a 700pt-wide "Start Review" card with a campfire marooned in one corner
 * is not the same design at a larger size.
 */

function greeting(): string {
  const hour = devNow().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const GENERAL_SHIFU_LINES = [
  'Every character you learn brings you closer to fluency!',
  'Consistency beats perfection — even five minutes counts today.',
  'I believe in you! Let’s keep the momentum going.',
  'Ready when you are! What shall we learn today?',
  'Small steps every day add up to big progress.',
]

/**
 * What Shifu says when there is nothing due.
 *
 * The due-word case is handled in the bubble itself, which sets the count in
 * bold — so this covers only the lines with no number in them.
 */
function shifuQuote(name: string, streak: number): string {
  const displayName = name || 'friend'
  if (streak >= 3) return `You’re on a ${streak}-day streak! I’m proud of you, ${displayName}.`
  const dayIndex = devNow().getDate() % GENERAL_SHIFU_LINES.length
  return GENERAL_SHIFU_LINES[dayIndex]
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
  } = useApp()

  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, DASH_CONTENT_MAX)
  const contentWidth = columnWidth - s.screen * 2

  const dueCount = dueCountFor(deck)
  const todayReviews = dailyProgress.find((d) => d.date === todayISO())?.reviewsCompleted ?? 0

  const claimableChallenges = useMemo(() => {
    const ctx = { dailyProgress, streak, completedLessonCount: completedLessonIds.length, xp }
    return CHALLENGE_DEFS.filter((def) => {
      const id = challengeInstanceId(def)
      if (claimedChallengeIds.includes(id)) return false
      return def.progress(ctx) >= def.target
    }).length
  }, [dailyProgress, streak, completedLessonIds.length, xp, claimedChallengeIds])

  const week = useMemo(() => currentWeekActivity(dailyProgress), [dailyProgress])

  // --- The word on offer ------------------------------------------------------

  /*
   * Dismissal lasts for the session only, so the card comes back next launch
   * without needing any persisted state of its own — the same bargain the old
   * `NewWordPrompt` made. `added` is separate from dismissal: adding a word
   * confirms in place rather than collapsing the card out from under the finger.
   */
  const [wordDismissed, setWordDismissed] = useState(false)
  const [addedWordId, setAddedWordId] = useState<string | null>(null)

  const nextWord = useMemo(() => newWordsPool(wordBank, deck, settings)[0], [wordBank, deck, settings])
  const reachedDailyGoal = wordsLearnedToday >= settings.dailyNewWordLimit
  const showWordCard = !wordDismissed && !reachedDailyGoal && !!nextWord

  const [greetingLead, ...greetingRest] = greeting().split(' ')
  const greetingTail = greetingRest.join(' ')

  const fallbackMessage = useMemo(() => shifuQuote(settings.username, streak), [settings.username, streak])

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

  /*
   * The entrance replays every time this screen is focused, not only on mount —
   * arriving from another tab or back from Review should assemble the scene
   * again. `run` is the one number the whole score keys off.
   */
  const run = useEntranceRun()

  /* Coming back to the Dashboard means coming back to the greeting, not to
     wherever the last visit happened to leave the scroll. */
  const scroll = useScrollToTopOnFocus()

  /*
   * The cards arrive in the order they are read, so their delays come from
   * their position rather than being written out per card — the word card is
   * conditional, and a hardcoded delay each would leave a hole in the rhythm on
   * the days it is not shown.
   */
  let cardIndex = 0
  const nextCardDelay = () => e.cards.at + e.cards.stagger * cardIndex++

  return (
    <View className="flex-1" style={{ backgroundColor: c.background }}>
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView
          ref={scroll}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            // Clears the tab bar with room to spare, so the last card is never
            // half-hidden behind it at the end of the scroll.
            paddingBottom: s.xxl,
          }}
        >
          <View style={{ width: columnWidth, paddingHorizontal: s.screen }}>
            <View className="flex-row items-center justify-between" style={{ height: 52 }}>
              <Pressable
                onPress={() => {
                  tapHaptic()
                  router.push('/settings')
                }}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                hitSlop={12}
                className="items-center justify-center rounded-full active:opacity-60"
                style={{ width: 44, height: 44, marginLeft: -10 }}
              >
                <Menu size={25} color={c.navy} strokeWidth={2.5} />
              </Pressable>

              {/* The streak's own screen is Challenges — that's where the
                  streak milestones are claimed. */}
              <StreakPill streak={streak} icon={FIRE_ICON} onPress={() => router.push('/challenges')} />
            </View>

            <DashboardHero
              greetingLead={greetingLead}
              greetingTail={greetingTail}
              name={settings.username || 'Learner'}
              dueCount={dueCount}
              fallbackMessage={fallbackMessage}
              width={contentWidth}
              run={run}
            />

            {/*
              Each card is wrapped rather than the group, so they rise one after
              another. The wrapper is the flex child the `gap` measures between,
              which is why the spacing survives — a transform moves what is
              painted, not what is laid out.
            */}
            <View style={{ gap: s.cardGap, marginTop: 14 }}>
              <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                <ReviewCard dueCount={dueCount} onPress={() => router.push('/review')} />
              </Reveal>

              {showWordCard && (
                <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                  <NewWordCard
                    word={nextWord}
                    script={settings.script}
                    phoneticScript={settings.phoneticScript}
                    added={addedWordId === nextWord.id}
                    onSeeAll={() => {
                      playTapSound()
                      router.push('/new-words')
                    }}
                    onDismiss={() => setWordDismissed(true)}
                    onAdd={() => {
                      playTapSound()
                      addToReviewDeck(nextWord.id)
                      setAddedWordId(nextWord.id)
                    }}
                  />
                </Reveal>
              )}

              <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                <ChallengesSummaryCard
                  claimable={claimableChallenges}
                  total={CHALLENGE_DEFS.length}
                  onPress={() => router.push('/challenges')}
                />
              </Reveal>

              <Reveal from="bottom" at={nextCardDelay()} duration={e.cards.for} run={run} distance={e.slideY}>
                {/* The week in summary; Progress is the same story over twelve
                    weeks, so it is where this card leads. It arrives from the
                    right on `DetailShell`'s own transition. */}
                <WeeklyActivityCard week={week} onPress={() => router.push('/settings/progress')} />
              </Reveal>

              {/*
                The one advert on this screen, and it is last on purpose.
                Everything the learner came here to do — what is due, the next
                word, the week — is above it, so the advert is something they
                scroll *past* rather than through. It renders nothing at all for
                an ad-free learner, and collapses silently if it fails to load;
                being the final element means either outcome moves nothing.

                Deliberately outside `Reveal`: the entrance score is the
                Dashboard introducing itself, and an advert has no business
                being choreographed into it.
              */}
              <AppBannerAd placement="dashboard" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
