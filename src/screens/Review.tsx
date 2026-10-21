import { useMemo, useRef } from 'react'
import { View, Text, Image, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useScrollToTop } from 'expo-router'
import { useScrollToTopOnFocus } from '../components/useScrollToTopOnFocus'
import { BookMarked, Clock } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import {
  StreakPill,
  ReviewHero,
  StatsPanel,
  Stat,
  DueIcon,
  StreakIcon,
  WeakIcon,
  ReviewModeCard,
  ReviewButton,
  FootArt,
} from '../components/review/parts'
import { revArt } from '../components/review/art'
import { Reveal, useEntranceRun } from '../components/dashboard/entrance'
import { FlexGap } from '../components/FlexGap'
import { TourScrollContext, TourTarget } from '../components/tour/targets'
import { revColors as c, revSpacing as s, revEntrance as anim, revRadius, revShadow, REV_CONTENT_MAX } from '../components/review/tokens'
import { playTints } from '../components/dashboard/tokens'
import { ShadowSurface } from '../components/shadowReveal'
import { dueCardsFor, dueCountFor, mistakeCardsFor, weakCardsFor } from '../lib/selectors'
import { playTapSound } from '../lib/sound'
import { tapHaptic, thunkHaptic } from '../lib/haptics'
import type { ReviewMode } from './ReviewSession'
import { PAGE_TITLE_TOP } from '../components/pageHeader'
import { PlayWash } from '../components/dashboard/playWash'

/*
 * The Review hub, built to the Beta 2.1 reference (`SS928 Redesigned Review
 * Screen.png`) and coloured to "SS1017 New words flashcard and Review
 * Redesign.png": Flashcards on sky, Mixed Drills on jade, Mistakes on blossom,
 * the two quiet buttons paired in one row, and Shifu's quote at the foot.
 *
 * Its design system is `components/review/tokens.ts` and its pieces are in
 * `components/review/parts.tsx`. What lives here is the composition and the
 * wiring from deck state to each number — every count on this screen is a
 * selector over the real deck, so the mockup's 17 / 2 / 4 appear only when the
 * learner's own deck says so.
 *
 * The drills themselves run in `ReviewSession.tsx`, pushed on top of this hub
 * and closing back to it. None of that changed: `openSession` is the same call
 * it always was.
 */

function openSession(mode: ReviewMode) {
  playTapSound()
  router.push(`/review-session?mode=${mode}`)
}

export function Review() {
  const { deck, settings, streak } = useApp()

  const { width } = useWindowDimensions()
  const column = Math.min(width, REV_CONTENT_MAX)
  const contentWidth = column - s.screen * 2

  /* Below the last button, with the foot painting bleeding through it down to
     the tab bar. The bar already clears the home indicator, so no inset here. */
  const pageFoot = s.xl

  /*
   * The entrance replays on every focus, not only on mount — coming back from a
   * finished session should find the screen assembling itself again rather than
   * already sitting there. One `run` drives all of it, on one beat.
   */
  const run = useEntranceRun()
  const beat = { at: anim.at, duration: anim.for, run, distance: anim.slideY } as const

  const counts = useMemo(
    () => ({
      due: dueCountFor(deck),
      flashcards: dueCardsFor(deck, settings).length,
      /* Mixed Drills runs on the same due pool as Flashcards — see ReviewSession. */
      mixed: dueCardsFor(deck, settings).length,
      mistakes: mistakeCardsFor(deck).length,
      weak: weakCardsFor(deck).length,
    }),
    [deck, settings],
  )

  /*
   * Shifu's line. Two states: with nothing due, offering the mistakes drill is
   * more use than congratulating someone on an empty queue.
   */
  /* Shifu's Review guide points at the buttons at the foot, below the fold on
     a phone — so it can ask for a scroll. Tracked, not read back. */
  /*
   * Review opens at the top, every time: on leaving it the offset is reset
   * (`useScrollToTopOnFocus`), so whether the learner comes back by its tab, the
   * Dashboard's Start Review or the end of a session, they arrive at the start
   * of the screen rather than wherever they left it. Tapping the Review tab
   * while already on it scrolls up too (`useScrollToTop`).
   */
  const scroll = useScrollToTopOnFocus()
  useScrollToTop(scroll)
  const scrollY = useRef(0)
  const tourScrollBy = useMemo(
    () => (dy: number) => scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: true }),
    [],
  )

  const message =
    counts.due === 0
      ? 'All caught up!\nThe mistakes drill is always open if you want more.'
      : 'A little review today makes a big difference!'

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scroll}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        /*
         * `flexGrow: 1` so the column fills a tall device — the buttons and the
         * foot painting sit at the bottom of the screen rather than in the
         * middle of it — while still scrolling on a short one.
         */
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: pageFoot }}
      >
        <TourScrollContext.Provider value={tourScrollBy}>
        <View style={{ width: column, flexGrow: 1, paddingHorizontal: s.screen }}>
          {/* Tab content, so no back arrow. No streak pill either: the stats
              panel below already carries the streak, as in the reference. */}

          <ReviewHero message={message} column={column} run={run} />

          {/* No gap: the panel's top edge is where the hero painting ends. */}
          <Reveal from="bottom" {...beat}>
            <TourTarget id="review-stats" radius={revRadius.large}>
            <StatsPanel>
              {[
                <Stat
                  key="due"
                  value={counts.due}
                  label="Due today"
                  icon={<DueIcon />}
                  onPress={() => router.push('/due-words')}
                />,
                <Stat key="streak" value={streak} label="Day streak" icon={<StreakIcon />} />,
                <Stat key="weak" value={counts.weak} label="Weak words" icon={<WeakIcon />} />,
              ]}
            </StatsPanel>
            </TourTarget>
          </Reveal>

          <FlexGap min={s.lg} max={s.xxl} />
          <Reveal from="bottom" {...beat}>
            <TourTarget id="review-drills" radius={revRadius.large}>
            <View style={{ gap: s.md }}>
              <ReviewModeCard
                title="Flashcards"
                description="Review words and meanings with spaced repetition."
                art={revArt.cards.flashcards}
                tint={playTints.sky}
                plain
                count={counts.flashcards}
                width={contentWidth}
                onPress={() => openSession('flashcards')}
              />
              <ReviewModeCard
                title="Mixed Drills"
                description="Listening, fill the gap, and match the pairs."
                art={revArt.cards.listening}
                tint={playTints.jade}
                plain
                count={counts.mixed}
                width={contentWidth}
                onPress={() => openSession('mixed')}
              />
              <ReviewModeCard
                title="Mistakes"
                description="Review words you’ve missed to make them stick."
                art={revArt.cards.mistakes}
                tint={playTints.blossom}
                plain
                countLabel={counts.mistakes === 1 ? 'item' : 'items'}
                count={counts.mistakes}
                width={contentWidth}
                onPress={() => openSession('mistakes')}
              />
            </View>
            </TourTarget>
          </Reveal>

          {/*
            The screen's slack absorber, uncapped: on a tall window the space
            opens here, so the buttons and the foot painting stay together at the
            bottom of the screen. On a phone the content already overflows and
            this sits at its minimum.
          */}
          <FlexGap min={s.xl} />

          {/* Inset from the cards as drawn — except on a narrow phone, where the
              inset is what truncated "Quick 5-min Review" at 360pt. */}
          <View style={{ paddingHorizontal: column < 400 ? s.sm : s.buttonInset }}>
            <FootArt column={column} bleed={pageFoot} run={run} />

            <Reveal from="bottom" {...beat}>
              <TourTarget id="review-sessions" radius={revRadius.large}>
              <View style={{ gap: s.md }}>
                <ReviewButton
                  label="Start Review Session"
                  tone="primary"
                  onPress={() => {
                    thunkHaptic()
                    openSession('full')
                  }}
                />
                <View style={{ flexDirection: 'row', gap: s.md }}>
                <ReviewButton
                  /* Half a row on a 360pt phone can't hold the full label in Lora
                     Bold, and Android has no shrink-to-fit — so it says less. */
                  label={column < 400 ? '5-min Review' : 'Quick 5-min Review'}
                  accessibilityLabel="Quick 5-minute review"
                  icon={Clock}
                  tone="quiet"
                  compact
                  onPress={() => {
                    tapHaptic()
                    openSession('quick')
                  }}
                />
                {/*
                  A way to *look* at the deck rather than be tested on it. Every
                  other route to My Words is inside the Dictionary tab, which is a
                  strange place to go looking for it when you are standing in
                  front of your review queue wondering what is in it.
                */}
                <ReviewButton
                  label="My Words"
                  icon={BookMarked}
                  tone="quiet"
                  compact
                  accessibilityLabel={`My Words, ${deck.length} ${deck.length === 1 ? 'word' : 'words'} in your deck`}
                  onPress={() => {
                    tapHaptic()
                    playTapSound()
                    router.push('/my-words')
                  }}
                />
                </View>
              </View>
              </TourTarget>
            </Reveal>

          </View>
        </View>
        </TourScrollContext.Provider>
      </ScrollView>
    </SafeAreaView>
  )
}
