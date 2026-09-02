import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft, BookOpen, Timer, TriangleAlert, Flame, CalendarDays } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import {
  StreakPill,
  ReviewHero,
  StatsCard,
  Stat,
  DeckPeekCard,
  DrillCard,
  DrillBadge,
  CtaButton,
  FootDecor,
} from '../components/review/parts'
import { revArt } from '../components/review/art'
import { Reveal, useEntranceRun } from '../components/dashboard/entrance'
import { FlexGap } from '../components/FlexGap'
import { vspace } from '../lib/verticalSpace'
import {
  revColors as c,
  revSpacing as s,
  revType as t,
  revCard,
  revDrills,
  revEntrance as anim,
  REV_CONTENT_MAX,
} from '../components/review/tokens'
import { dueCardsFor, dueCountFor, listeningCardsFor, mistakeCardsFor, weakCardsFor } from '../lib/selectors'
import { playTapSound } from '../lib/sound'
import { tapHaptic, thunkHaptic } from '../lib/haptics'
import type { ReviewMode } from './ReviewSession'

/*
 * The Review hub, built to its reference mockup.
 *
 * Its design system is `components/review/tokens.ts` and its pieces are in
 * `components/review/parts.tsx`. What lives here is the composition and the
 * wiring from deck state to each number — every count on this screen is a
 * selector over the real deck, so the mockup's 29 / 3 / 6 appear only when the
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

  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const column = Math.min(width, REV_CONTENT_MAX)
  const contentWidth = column - s.screen * 2

  /*
   * Vertical rhythm, sized to the device rather than to one screenshot.
   *
   * Both of these sit at their designed minimum on every iPhone in the range
   * this app is built for — 10.5% of an 852pt screen is 89, well under the 126pt
   * card — and only open up on a viewport with genuine room to spare. Growth is
   * capped at about 12% so a tall window gets a slightly roomier page rather
   * than three inflated panels.
   */
  const drillHeight = vspace(revCard.minHeight, 0.115, 148, height)
  const drillGap = vspace(s.md, 0.014, 20, height)

  /*
   * Below the button block, and it is not only the home indicator this clears:
   * the bonsai hangs 26pt past the block's own bottom edge so its pot is cropped
   * rather than resting on a line. Now that the block is pinned to the foot of
   * the viewport, that overhang needs somewhere to be — without this it is the
   * screen edge doing the cropping, which is a different and much worse crop.
   */
  const pageFoot = Math.max(30, insets.bottom + 8)

  /*
   * The entrance replays on every focus, not only on mount — coming back from a
   * finished session should find the screen assembling itself again rather than
   * already sitting there. One `run` drives all of it, and every element shares
   * one delay, so the whole page arrives on a single beat.
   */
  const run = useEntranceRun()
  const beat = { at: anim.at, duration: anim.for, run, distance: anim.slideY } as const

  const counts = useMemo(
    () => ({
      due: dueCountFor(deck),
      flashcards: dueCardsFor(deck, settings).length,
      listening: listeningCardsFor(deck, settings).length,
      mistakes: mistakeCardsFor(deck).length,
      weak: weakCardsFor(deck).length,
    }),
    [deck, settings],
  )

  /*
   * Shifu's line. Three states rather than one: with nothing due, offering the
   * mistakes drill is more use than congratulating someone on an empty queue.
   */
  const message =
    counts.due === 0
      ? 'Nothing due — want to\ndrill past mistakes?'
      : "Let's strengthen\nwhat you've learned!"

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        /*
         * `flexGrow: 1` rather than a natural content height, and it is the whole
         * fix for this screen: it lets the column below fill a tall device while
         * still scrolling on a short one. Without it the page is laid out to the
         * height of its own contents and everything the device has left over is a
         * band of bare paper under the last button.
         */
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: pageFoot }}
      >
        <View style={{ width: column, flexGrow: 1, paddingHorizontal: s.screen }}>
          {/*
            Review is pushed over the tabs, so this arrow is the only way out —
            and it is guarded rather than a bare `back()`. Reached by deep link
            or as the first entry after a web reload there is nothing to pop, and
            `back()` then silently does nothing.
          */}
          <View className="flex-row items-center" style={{ height: 46 }}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              className="items-center justify-center active:opacity-60"
              style={{ width: 34, height: 44, marginLeft: -8 }}
            >
              <ChevronLeft size={26} color={c.navy} strokeWidth={2.6} />
            </Pressable>

            <Text
              className="flex-1 font-nunito-extrabold"
              style={{ ...t.title, color: c.navy, marginLeft: 2 }}
            >
              Review
            </Text>

            <StreakPill streak={streak} />
          </View>

          {/*
            Tight to the title, and barely allowed to grow. The scenery is the
            top of this page, and a generous gap above it just reads as the
            screen starting late — so this gap takes the smallest share of any
            slack there is to hand out.
          */}
          <FlexGap min={s.sm} max={s.lg} grow={0.4} />
          <ReviewHero message={message} width={contentWidth} run={run} />

          <FlexGap min={s.lg} max={34} />
          <View>
            <Reveal from="bottom" {...beat}>
              <StatsCard>
                {[
                <Stat
                  key="due"
                  value={counts.due}
                  label="Words due"
                  icon={CalendarDays}
                  iconColor={c.coral}
                  onPress={() => router.push('/due-words')}
                />,
                <Stat key="streak" value={streak} label="Day streak" icon={Flame} iconColor={c.coral} iconFill={c.gold} />,
                <Stat
                  key="weak"
                  value={counts.weak}
                  label="Weak words"
                  icon={TriangleAlert}
                  iconColor={c.gold}
                  iconFill={c.goldSoft}
                />,
                ]}
              </StatsCard>
            </Reveal>
          </View>

          {/*
            A way to *look* at the deck rather than be tested on it. Every other
            route to My Words is inside the Dictionary tab, which is a strange
            place to go looking for it when you are standing in front of your
            review queue wondering what is in it.
          */}
          <FlexGap min={s.md} max={20} />
          <Reveal from="bottom" {...beat}>
            <DeckPeekCard count={deck.length} onPress={() => router.push('/my-words')} />
          </Reveal>

          {/*
            A section break, not a list gap. On a phone the drills sit `drillGap`
            apart — 12 — and this used to be 16, near enough to read as one more
            item in the same stack rather than the start of a new group. Doubling
            it is what separates "here is your deck" from "here are the ways to
            drill it".
          */}
          <FlexGap min={s.xxl} max={40} />
          <Reveal from="bottom" {...beat}>
            <View style={{ gap: drillGap }}>
              <DrillCard
                minHeight={drillHeight}
                tag="Review"
                title="Flashcards"
                description="Review words and meanings with spaced repetition."
                count={String(counts.flashcards)}
                fill={revDrills.flashcards.fill}
                ink={revDrills.flashcards.ink}
                badge={<DrillBadge source={revArt.flashcards} />}
                onPress={() => openSession('flashcards')}
              />

              <DrillCard
                minHeight={drillHeight}
                tag="Listen"
                title="Listening"
                description="Practice listening and improve your comprehension."
                count={String(counts.listening)}
                fill={revDrills.listening.fill}
                ink={revDrills.listening.ink}
                badge={<DrillBadge source={revArt.listening} />}
                onPress={() => openSession('listening')}
              />

              {/*
                A dash rather than a zero when nothing has been missed. A bold 0
                reads as a broken counter; a dash reads as "nothing here", which is
                the truth and is not a failure.
              */}
              <DrillCard
                minHeight={drillHeight}
                tag="Improve"
                title="Mistakes"
                description="Review words you've missed before."
                count={counts.mistakes > 0 ? String(counts.mistakes) : '—'}
                fill={revDrills.mistakes.fill}
                ink={revDrills.mistakes.ink}
                badge={<DrillBadge source={revArt.mistakes} />}
                onPress={() => openSession('mistakes')}
              />
            </View>
          </Reveal>

          <FlexGap min={s.xl} max={64} grow={1.4} />

          {/*
            The two buttons and the artwork share one container so the bonsai can
            be anchored to the block rather than to the page, and so it is painted
            underneath both of them.

            This block is the screen's slack absorber — `flexGrow` with no ceiling,
            where every gap above it is capped. That is deliberate and it is what
            anchors the landscape: the buttons stay put at the top of the block and
            the bonsai and petals, which are pinned to its *bottom*, ride down to
            the foot of the viewport. On a phone the block is its natural height
            and the canopy overlaps the buttons as drawn; on a tall window the two
            separate and the artwork becomes the bottom of the page. Either way
            there is no unexplained rectangle beneath it, because the space that
            would have been one now has the painting in it.
          */}
          <View style={{ flexGrow: 3, flexShrink: 0, paddingBottom: s.xxl }}>
            <FootDecor width={contentWidth} run={run} />

            <Reveal from="bottom" {...beat}>
              <View style={{ gap: s.md }}>
                <CtaButton
                  label="Start Review Session"
                  icon={BookOpen}
                  tone="primary"
                  onPress={() => {
                    thunkHaptic()
                    openSession('full')
                  }}
                />
                <CtaButton
                  label="Quick 5-min Review"
                  icon={Timer}
                  tone="quiet"
                  onPress={() => {
                    tapHaptic()
                    openSession('quick')
                  }}
                />
              </View>
            </Reveal>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
