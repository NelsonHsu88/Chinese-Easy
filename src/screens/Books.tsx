import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, Animated } from 'react-native'
import { router, Stack } from 'expo-router'
import { ChevronLeft, Star, Lock } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { STORIES } from '../data/stories'
import type { Story } from '../types'
import { hanziFont } from '../lib/hanzi'
import { forScript } from '../lib/scriptConversion'
import { playTapSound } from '../lib/sound'
import { tapHaptic, tickHaptic } from '../lib/haptics'
import { BrushHighlight } from '../components/BrushHighlight'
import { useScrollToTopOnFocus } from '../components/useScrollToTopOnFocus'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { PageDecor } from '../components/reading/PageDecor'
import { ReadingShell } from '../components/reading/ReadingShell'
import { StoryArt } from '../components/reading/StoryArt'
import { COLLECTIONS, formatCount, paletteFor, progressPercent } from '../components/reading/storyPresentation'
import { AppBannerAd } from '../components/ads/AppBannerAd'

/*
 * The Reading Library.
 *
 * Shelves, not a list: each collection is a horizontally swipeable row of poster
 * cards, so 46 stories stay browsable without a scroll of near-identical strips.
 * Cream paper, dark-ink type, restrained pastel accents — the colour lives in the
 * covers and the badges while everything structural stays warm neutral.
 *
 * Deliberately light-only: the whole design rests on cream paper, and a dark
 * repaint would be a different design rather than a recolour of this one.
 */

const LEVELS = [1, 2, 3, 4, 5, 6] as const
type Filter = 'all' | (typeof LEVELS)[number]

/*
 * Poster geometry. Two cards sit side by side inside the 430pt column and a
 * sliver of the third shows past the right edge. That peek is deliberate and
 * worth the few points it costs each card: with two cards fitting exactly, a
 * shelf looks like a finished pair and nobody thinks to swipe it.
 */
const CARD_W = 174

/*
 * The library's arrival: the whole page rises a little and fades up.
 *
 * One beat rather than a staggered score — the Dashboard assembles itself
 * because it is six unrelated things, where this is one object being put in
 * front of the reader. The rise is short on purpose; past about 40pt the
 * movement stops reading as arrival and starts reading as a page turn, and this
 * screen is the destination rather than a step on the way somewhere.
 *
 * It replays on every focus, so backing out of a story hands the library back
 * the same way it was first opened.
 */
const ENTER = { at: 0, for: 640, rise: 28 } as const
/* 2:3, the native aspect of the cover artwork. Cropping these portrait paintings
 * into a squarer card cut the tops off compositions that run full height. */
const CARD_H = 261
const ROW_GAP = 11
const EDGE = 18

function HskChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tickHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="h-9 justify-center rounded-full px-[15px]"
      style={{
        backgroundColor: active ? '#d9f2e0' : 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: active ? 'transparent' : '#e4ded4',
      }}
    >
      <Text
        className={active ? 'font-inter-semibold text-sm' : 'font-inter-medium text-sm'}
        style={{ color: active ? '#246847' : '#242430' }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function StoryPoster({ story, percent }: { story: Story; percent: number }) {
  const script = useApp().settings.script
  const palette = paletteFor(story)
  const available = story.pages.length > 0

  return (
    <Pressable
      disabled={!available}
      onPress={() => {
        playTapSound()
        tapHaptic()
        router.push(`/story/${story.id}`)
      }}
      accessibilityRole="button"
      accessibilityLabel={`${story.titleEnglish}, HSK ${story.hskLevel}${available ? `, ${percent}% read` : ', coming soon'}`}
      className="overflow-hidden rounded-[18px] shadow-paper"
      style={{
        width: CARD_W,
        height: CARD_H,
        borderWidth: 1,
        borderColor: 'rgba(217,207,192,0.45)',
        opacity: available ? 1 : 0.55,
      }}
    >
      <StoryArt story={story} width={CARD_W} height={CARD_H} radius={18} glyphScale={1.25} />

      {/* Level badge, over the art in the top-left corner. */}
      <View
        className="absolute left-2 top-2 h-[22px] justify-center rounded-[8px] px-2"
        style={{ backgroundColor: palette.soft }}
      >
        <Text className="font-inter-bold text-[10px]" style={{ color: palette.strong }}>
          HSK {story.hskLevel}
        </Text>
      </View>

      {available ? (
        percent > 0 && (
          // Hairline along the very bottom edge — the shelf layout has no room for
          // a percentage label, but an unfinished story should still say so.
          <View className="absolute inset-x-0 bottom-0 h-[3px]" style={{ backgroundColor: 'rgba(247,222,215,0.85)' }}>
            <View className="h-full" style={{ width: `${percent}%`, backgroundColor: '#f46757' }} />
          </View>
        )
      ) : (
        <View
          className="absolute right-2 top-2 h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
        >
          <Lock size={11} color="#8a8a99" />
        </View>
      )}

      {/* Title band. Sits on a translucent cream wash so it stays readable over
          whatever the cover happens to be. */}
      <View
        className="absolute inset-x-0 bottom-0 px-2.5 pb-3 pt-2"
        style={{ backgroundColor: 'rgba(253,251,245,0.88)' }}
      >
        <Text
          className={`text-center ${hanziFont(script, 'semibold')} text-[19px] leading-[25px]`}
          style={{ color: '#16161e' }}
          numberOfLines={1}
        >
          {forScript(story.title, script)}
        </Text>
        <Text
          className="text-center font-inter-medium text-[11.5px] leading-[15px]"
          style={{ color: '#3f3e49' }}
          numberOfLines={2}
        >
          {story.titleEnglish}
        </Text>
      </View>
    </Pressable>
  )
}

function Shelf({
  title,
  tagline,
  stories,
  progressFor,
}: {
  title: string
  tagline: string
  stories: Story[]
  progressFor: (story: Story) => number
}) {
  return (
    <View className="mb-6">
      <View className="mb-2.5 flex-row items-baseline gap-2.5" style={{ paddingHorizontal: EDGE }}>
        <Text className="font-nunito-black text-[21px]" style={{ color: '#1a1a2e', letterSpacing: -0.4 }}>
          {title}
        </Text>
        <Text className="font-handwriting-medium text-[16px]" style={{ color: '#8a7f6a' }} numberOfLines={1}>
          {tagline}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        // Snapping to the card pitch makes the row feel like a shelf being
        // flicked rather than a free-scrolling strip.
        snapToInterval={CARD_W + ROW_GAP}
        snapToAlignment="start"
        contentContainerStyle={{ gap: ROW_GAP, paddingHorizontal: EDGE, paddingVertical: 3 }}
      >
        {stories.map((story) => (
          <StoryPoster key={story.id} story={story} percent={progressFor(story)} />
        ))}
      </ScrollView>
    </View>
  )
}

export function Books() {
  const { xp, storyProgress } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const scroll = useScrollToTopOnFocus()

  const run = useEntranceRun()
  const enter = useReveal({ from: 'bottom', ...ENTER, duration: ENTER.for, distance: ENTER.rise, run })

  // Shelves keep their fixed order; a level filter thins each row and drops any
  // that empty out, rather than reshuffling the library under the learner.
  const shelves = useMemo(
    () =>
      COLLECTIONS.map((collection) => ({
        ...collection,
        stories: STORIES.filter(
          (s) => s.collection === collection.id && (filter === 'all' || s.hskLevel === filter),
        ),
      })).filter((shelf) => shelf.stories.length > 0),
    [filter],
  )

  return (
    <ReadingShell>
      {/*
        The navigator's own push transition is switched off for this route so
        the fade-up is the only animation playing. Left on, a native build would
        slide the whole page in from the right *and* run this one inside it —
        two transitions at different speeds, which reads as a stutter rather
        than as either one. Same call `DetailShell` makes, for the same reason.
      */}
      <Stack.Screen options={{ animation: 'none' }} />

      {/*
        Plain styles on the animated view with everything else in a plain View
        inside it — NativeWind drops `className` on an `Animated.View` entirely,
        and the cream page would go with it.
      */}
      <Animated.View style={[{ flex: 1 }, enter]}>
        <View className="flex-1">
          {/* Painted page. Spans the whole column — including behind the header and
              chips — so the clouds can sit high on the page, and stays put while the
              shelves scroll over it. */}
          <PageDecor clouds />

          <View className="h-[72px] flex-row items-center px-[18px] pb-2 pt-[18px]">
            <Pressable
              // The library is opened from the Lessons tab's picker sheet, so the
              // dashboard is where it belongs when there is no stack to pop —
              // reaching /books by its own URL otherwise leaves this button inert.
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              className="pr-1"
            >
              <ChevronLeft size={28} color="#1a1a2e" strokeWidth={2} />
            </Pressable>

            <Text
              className="flex-1 text-center font-nunito-black text-[31px]"
              style={{ color: '#1a1a2e', lineHeight: 36, letterSpacing: -0.8 }}
            >
              Reading Library
            </Text>

            <View
              className="h-[38px] flex-row items-center gap-[7px] rounded-full px-3.5"
              style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7e1d7' }}
            >
              <Star size={15} color="#ffc414" fill="#ffc414" />
              <Text className="font-nunito-bold text-sm" style={{ color: '#1a1a2e' }}>
                {formatCount(xp)} XP
              </Text>
            </View>
          </View>

          {/*
            Pinned to its content height. Left as a bare sibling of the vertical list
            below, this horizontal ScrollView gets squeezed by the vertical one taking
            the remaining space, which crops the chips.
          */}
          <View className="shrink-0 grow-0">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' }}
            >
              <HskChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
              {LEVELS.map((level) => (
                <HskChip
                  key={level}
                  label={`HSK ${level}`}
                  active={filter === level}
                  onPress={() => setFilter(level)}
                />
              ))}
            </ScrollView>
          </View>

          <View className="flex-1">
            {/* Back from a story is a return to the library, not to the shelf the
                last scroll happened to stop on. */}
            <ScrollView ref={scroll} contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }}>
              {shelves.length === 0 ? (
                <Text className="py-12 text-center font-inter text-sm" style={{ color: '#8a8a99' }}>
                  No stories at this level yet.
                </Text>
              ) : (
                shelves.map((shelf) => (
                  <Shelf
                    key={shelf.id}
                    title={shelf.title}
                    tagline={shelf.tagline}
                    stories={shelf.stories}
                    progressFor={(story) => progressPercent(story, storyProgress[story.id])}
                  />
                ))
              )}

              {/* One handwritten note per screen — the restraint is what makes it land.
                  The inner wrapper is load-bearing: BrushHighlight aligns itself to the
                  start of its parent, which would beat this row's centring on its own. */}
              <View className="mt-1 items-center">
                <View className="self-center">
                  <BrushHighlight color="#f9e58c" bleedX={12} bleedTop={5} bleedBottom={1}>
                    <Text className="font-handwriting-medium text-xl" style={{ color: '#1a1a2e' }}>
                      Every story, a step closer.
                    </Text>
                  </BrushHighlight>
                </View>
              </View>

              {/*
                Below the handwritten note rather than above it, so the note
                still closes the *library* — the shelves and their encouragement
                are one thought, and an advert wedged between them would break
                it. Down here the advert is something after the page has
                finished, which is the honest place for it.

                Padded to `EDGE` so it lines up with the shelf titles; the
                ScrollView itself carries no horizontal padding.
              */}
              <View style={{ paddingHorizontal: EDGE }}>
                <AppBannerAd placement="books" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Animated.View>
    </ReadingShell>
  )
}
