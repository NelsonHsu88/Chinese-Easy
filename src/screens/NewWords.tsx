import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal, Image, Animated, Easing, Platform, PanResponder, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  ChevronLeft,
  CirclePlus,
  CircleAlert,
  PenLine,
  History,
  RotateCcw,
  Check,
  X,
  Volume2,
  Star,
} from 'lucide-react-native'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { useApp, type NewWordSeen } from '../context/AppContext'
import { newWordsPool, NEW_WORDS_SESSION_SEED } from '../lib/selectors'
import { displayWord, displayExample, displayPinyin } from '../lib/hanzi'
import { ReadingSentence } from '../components/dictionary/ReadingSentence'
import { FlexGap } from '../components/FlexGap'
import { revealedShadow, SHADOW_EASING, shadowDuration } from '../components/shadowReveal'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { dashColors as c, dashShadow, dashShadowLifted, DASH_CONTENT_MAX } from '../components/dashboard/tokens'
import { PressableScale, LiftedFace, usePressClaim } from '../components/dashboard/parts'
import { TourTarget } from '../components/tour/targets'
import { speak } from '../lib/speech'
import { tapHaptic, tickHaptic } from '../lib/haptics'
import { shortGloss } from '../lib/definitions'
import type { PhoneticScript, ScriptMode, VocabWord } from '../types'

/*
 * New Words, built to the Beta 2.1 reference "SS 927 GOAL NEW WORDS UI LEARN
 * REDESIGN": one card showing everything at once — the word, its reading with
 * a speaker, its meaning, and an example, with a small pagoda in the card's
 * corner beside the translation — then Skip / Add to my words, a full-width
 * mint "Practice writing this word", and bamboo and mist along the foot.
 *
 * Kept from the old screen on purpose, beyond the reference: "Practice writing
 * this word" under the buttons.
 *
 * **The card swipes**, like a page in the reader. Drag it and it follows the
 * finger; let go past `SWIPE.commit` of its width (or flick it) and it leaves.
 * Left is Skip — the next word comes in from the right. Right brings back the
 * word before, from the left, as far back as this visit goes; there the
 * learner can still add a word they skipped. Adding is the button's job. A drag that falls short
 * springs back, and a right drag with nothing behind it gives a little and
 * returns.
 *
 * There is no flip any more — the reference shows the meaning and the example
 * together with the word, so there is nothing hidden to tap for. The star in the
 * card's top right corner, as the reference draws it, favourites the word — the
 * same `favoriteWordIds` My Words filters by. It works before the word is
 * added, so a learner can star something and still skip it for now.
 *
 * Styled with plain style objects, not `className` — on native, NativeWind was
 * dropping class-applied styles on re-render elsewhere in the app (see the
 * comment over `HeroCard`'s button row), and a card that re-renders on every
 * Skip and Add is exactly where that would show.
 *
 * **Never pass `Pressable` a style *function* here** (`style={({ pressed }) =>
 * …}`). On native that form was dropped outright — the buttons rendered with
 * no box at all, Skip as bare text and Add as a thin strip — while the object
 * form beside it (Recent, Custom) was fine, and web rendered both correctly,
 * which is how it shipped. `PressFace` below tracks the press itself and puts
 * the look on a plain `View` instead.
 *
 * Artwork comes from `scripts/processNewWordsArt.mjs`, cropped out of the
 * reference itself.
 */

const ART = {
  card: require('../assets/images/new-words/card-scenery.png'),
  foot: require('../assets/images/new-words/foot-scenery.png'),
} as const
const CARD_ART_RATIO = 338 / 412
const FOOT_ART_RATIO = 941 / 168

/**
 * One height and shape for all three buttons, so they read as one set.
 *
 * All three are the Dashboard's `LiftedFace` — a face standing `DASH_LIFT`
 * above a shoulder a shade darker, sinking onto it when pressed — the same
 * object as Start Review and "Add this word", so a button looks like a button
 * wherever the learner meets it. Each face is paired with its shoulder here;
 * the step between them is a judgement about the colour, as `dashShoulders`
 * explains, not arithmetic.
 */
const BUTTON_HEIGHT = 50
/** The Add pill's face — lighter at the top-left, as the reference lights it. */
const ADD_GRADIENT = ['#4E9E5E', '#3A8650'] as const
const ADD_SHOULDER = '#2B6A3C'

/** Skip: warm white, a warm grey hairline. */
const SKIP = { fill: '#FFFDFC', border: '#D8D4CB', shoulder: '#CFC8BA' } as const

/** Practice: the full-width mint pill under the pair. */
const PRACTICE = { fill: '#EAF4EC', border: '#BFDCC6', shoulder: '#A7CDB1' } as const

/**
 * A button whose look lives on a plain `View`, with the press tracked here
 * rather than read from a `Pressable` style function — see the note at the top
 * of this file for why that function form can't be used.
 *
 * `outer` is layout (flex share, margin) and goes on the `Pressable`; `face`
 * is the look and goes on the `View` inside it.
 */
function PressFace({
  onPress,
  disabled = false,
  outer,
  face,
  accessibilityLabel,
  children,
}: {
  onPress: () => void
  disabled?: boolean
  outer?: ViewStyle
  face: StyleProp<ViewStyle>
  accessibilityLabel: string
  children: ReactNode
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={outer}
    >
      <View style={[face, { opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>{children}</View>
    </Pressable>
  )
}

/**
 * Skip and Add hand the card on rather than swapping it in place: the current
 * one slides left as it fades out, then the next arrives from the right. The
 * leave is quicker than the arrival, so the new word is what the eye lands on.
 */
const SWAP = { distance: 56, leave: 170, arrive: 260 } as const

/**
 * The swipe. `commit` is the share of the card's width a release has to pass,
 * `flick` the release speed (px/ms) that commits a shorter drag, so long as it
 * has travelled `flickMin`;
 * `slop`/`bias` decide when a touch is plainly a horizontal swipe rather than a
 * tap or a scroll; `resist` is how far a right drag gives when there is no word
 * behind; `out` is how long a released card takes to leave; `tilt` the most it
 * leans as it is dragged. A swipe's card leaves and arrives quicker than a
 * button's (`out`/`arrive` against `SWAP`): the finger has already done half
 * the moving, and the learner swiping through is waiting on the next word.
 */
const SWIPE = { commit: 0.28, flick: 0.45, flickMin: 36, slop: 8, bias: 1.4, resist: 0.22, out: 140, arrive: 190, tilt: 6 } as const
const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/**
 * The card's height before it takes a share of the screen's spare height —
 * enough for a single-character word with a three-row example sentence and a
 * three-line translation. Every card is this plus the same share, whatever
 * word it holds; a longer example is clipped rather than allowed to move the
 * buttons.
 */
const CARD_MIN = 460
/**
 * "Daily goal reached!" is a passing note, not a fixture: it appears on the way
 * in, holds long enough to read, then fades. It floats over the top of the card
 * rather than taking a place in the column, so nothing moves when it goes.
 */
const GOAL_NOTE = {
  in: 320,
  hold: 2600,
  out: 1200,
  /**
   * Transparent room around the box, inside the faded layer, so its shadow is
   * part of that layer rather than cut off at the box's edge (see below).
   */
  room: 16,
} as const

const GUTTER = 20
const TRACK = '#E9ECE8'

/** The serif hanzi face per script — `hanziFont`'s semibold classes, as family names. */
function serif(script: ScriptMode): string {
  return script === 'simplified' ? 'NotoSerifSCSemiBold' : 'NotoSerifTCSemiBold'
}

/** A word's size on the card: the full display size for one character, stepping down so a phrase stays on one line. */
function hanziSize(text: string): number {
  const n = [...text].length
  return n <= 1 ? 96 : n === 2 ? 80 : n === 3 ? 62 : 48
}

export function NewWords() {
  const {
    wordBank,
    deck,
    settings,
    addToReviewDeck,
    wordsLearnedToday,
    newWordHistory,
    skipNewWord,
    noteNewWordAdded,
    unskipNewWord,
    getWord,
    favoriteWordIds,
    toggleFavorite,
    reportTourAction,
  } = useApp()
  const [showPractice, setShowPractice] = useState(false)
  const [showRecent, setShowRecent] = useState(false)

  /*
   * The card hand-off. `slide` runs -1 (gone left) → 0 (at rest) → 1 (waiting
   * on the right). The word is only changed once the old card has left, and
   * the value is parked at 1 in the same tick, so the next word's first frame
   * is already off to the right rather than flashing up in place.
   *
   * Each leg commits on whichever of its callback and a `setTimeout` arrives
   * first. On web these run on requestAnimationFrame, which a background tab
   * stops dead — without the backstop a Skip there would never reach the
   * commit, and the word would never change (see Animation in CLAUDE.md).
   * `swapping` drops presses mid-swap, so a double tap can't skip two words.
   */
  const slide = useRef(new Animated.Value(0)).current
  /*
   * The card's shadow, faded on its own JS-driven value in step with `slide`.
   * `elevation` and `shadowOpacity` can't ride the native driver, and Android
   * draws an elevation shadow on its own schedule regardless of the native
   * opacity above it — so without this the shadow and hairline border led the
   * card in and trailed it out. Same fix as `shadowReveal.tsx` on the
   * Dashboard, Dictionary and Settings.
   */
  const shade = useRef(new Animated.Value(1)).current
  const swapping = useRef(false)
  const arrivePending = useRef(false)
  /* The shadow's own backstop outlives the swap (it arrives slowly — see
     below), so a quick next Skip has to cancel it before fading it out. */
  const shadeSettle = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** How long the pending arrival takes — a swipe's is shorter than a button's. */
  const arriveMs = useRef<number>(SWAP.arrive)

  /*
   * The arrival starts only once the next word has committed (the effect
   * below), not straight after `commit()`. Started straight away, the native
   * driver ran the slide-in on the UI thread while JS was still rendering the
   * next word, so the card came back briefly showing the old one.
   */
  const startArrive = () => {
    if (!arrivePending.current) return
    arrivePending.current = false

    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      slide.setValue(0)
      swapping.current = false
    }
    Animated.timing(slide, {
      toValue: 0,
      duration: arriveMs.current,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(settle)
    setTimeout(settle, arriveMs.current + 150)

    // The shadow creeps in well after the card has landed, on the app's
    // shared slow shadow curve — and doesn't hold up the next Skip.
    const shadeFor = shadowDuration(arriveMs.current)
    Animated.timing(shade, { toValue: 1, duration: shadeFor, easing: SHADOW_EASING, useNativeDriver: false }).start()
    shadeSettle.current = setTimeout(() => shade.setValue(1), shadeFor + 150)
  }

  /*
   * `dir` 1 moves forward (the card leaves left, the next waits on the right);
   * -1 moves back (leaves right, the previous waits on the left). `flung` is a
   * released swipe: the card carries on from under the finger and off the
   * screen, rather than starting the short button slide from rest.
   */
  const swapCard = (commit: () => void, dir: 1 | -1 = 1, flung = false) => {
    if (swapping.current) return
    swapping.current = true
    if (shadeSettle.current) clearTimeout(shadeSettle.current)
    arriveMs.current = flung ? SWIPE.arrive : SWAP.arrive

    let left = false
    const leave = () => {
      if (left) return
      left = true
      drag.setValue(0)
      slide.setValue(dir)
      shade.setValue(0)
      arrivePending.current = true
      commit()
      // Backstop for the effect below, should the commit not change the word.
      setTimeout(startArrive, 200)
    }

    const timing = { duration: flung ? SWIPE.out : SWAP.leave, easing: flung ? Easing.out(Easing.quad) : Easing.in(Easing.cubic) }
    Animated.timing(shade, { ...timing, toValue: 0, useNativeDriver: false }).start()
    if (flung) {
      Animated.timing(drag, { ...timing, toValue: -dir * windowWidth, useNativeDriver: USE_NATIVE_DRIVER }).start(leave)
    } else {
      Animated.timing(slide, { ...timing, toValue: -dir, useNativeDriver: USE_NATIVE_DRIVER }).start(leave)
    }
    setTimeout(leave, timing.duration + 150)
  }

  const { width: windowWidth } = useWindowDimensions()
  const columnWidth = Math.min(windowWidth, DASH_CONTENT_MAX)
  const cardWidth = columnWidth - GUTTER * 2

  /*
   * Where the finger has the card, in px. Separate from `slide` so a drag can
   * start from rest and a released card can carry on from wherever it was let
   * go. Both feed the card's one transform; both stay on the native driver,
   * since a value joined to a native animation can't then run a JS one.
   */
  const drag = useRef(new Animated.Value(0)).current
  const dragOpacity = drag.interpolate({
    inputRange: [-cardWidth, 0, cardWidth],
    outputRange: [0.25, 1, 0.25],
    extrapolate: 'clamp',
  })
  const cardMotion = {
    opacity: Animated.multiply(slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }), dragOpacity),
    transform: [
      {
        translateX: Animated.add(
          slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [-SWAP.distance, 0, SWAP.distance] }),
          drag,
        ),
      },
      {
        rotate: drag.interpolate({
          inputRange: [-cardWidth, 0, cardWidth],
          outputRange: [`-${SWIPE.tilt}deg`, '0deg', `${SWIPE.tilt}deg`],
          extrapolate: 'clamp',
        }),
      },
    ],
  }

  /*
   * Skips come from persisted state, not from local `useState`.
   *
   * They used to live in a `Set` in this component, so a skip lasted exactly as
   * long as the screen stayed mounted: leaving New Words and coming back put the
   * skipped word straight back at the front of the queue, every time. Skipping a
   * word is a decision about that word — the learner is saying they don't want
   * to learn it — so it belongs with the rest of the learner's state and has to
   * outlive the screen.
   */
  const skipped = useMemo(
    () => new Set(newWordHistory.filter((entry) => entry.outcome === 'skipped').map((entry) => entry.wordId)),
    [newWordHistory],
  )

  const pool = useMemo(() => newWordsPool(wordBank, deck, settings, NEW_WORDS_SESSION_SEED), [wordBank, deck, settings])
  const available = useMemo(() => pool.filter((w) => !skipped.has(w.id)), [pool, skipped])
  const current = available[0]

  /*
   * This visit's words, in the order they were dealt with (added or skipped),
   * and how many of them the learner has swiped back through. 0 is the live
   * queue. Local on purpose: going back is a way of looking again during one
   * sitting, and every decision it can change is already persisted.
   */
  const [visit, setVisit] = useState<string[]>([])
  const [back, setBack] = useState(0)
  const past = back > 0 ? getWord(visit[visit.length - back]) : undefined
  const shown = past ?? current
  const shownInDeck = !!shown && deck.some((card) => card.wordId === shown.id)

  /*
   * The words either side of the one on screen, mounted in advance and hidden
   * behind it, so a swipe or a button only has to reveal a card that already
   * exists. Building a card — its hanzi, its segmented example, its painting —
   * is most of what used to sit between the old card leaving and the new one
   * arriving.
   *
   * The order is this visit's words, then the live queue's first two (the one
   * on screen and the one after it). Keyed by word id, a card keeps its mounted
   * instance as it moves from neighbour to shown.
   */
  const neighbours = useMemo(() => {
    const track: string[] = []
    for (const id of [...visit, available[0]?.id, available[1]?.id]) if (id && !track.includes(id)) track.push(id)
    const at = shown ? track.indexOf(shown.id) : -1
    if (at < 0) return shown ? [shown] : []
    return [track[at - 1], track[at], track[at + 1]]
      .map((id) => (id ? getWord(id) : undefined))
      .filter((w): w is VocabWord => !!w)
  }, [visit, available, shown, getWord])

  // The next word has committed: bring its card in (see `startArrive`).
  useEffect(() => {
    startArrive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown?.id])

  /* Forward: from a word swiped back to, just move on — or add it, if it was
     skipped and the learner has changed their mind. From the live queue, add
     or skip the word in front of them. */
  const forward = (action: 'add' | 'skip', flung = false) => {
    if (!shown) return
    const id = shown.id
    if (back > 0) {
      swapCard(() => {
        if (action === 'add' && !shownInDeck) {
          unskipNewWord(id)
          addToReviewDeck(id)
          noteNewWordAdded(id)
          reportTourAction('word:add')
        }
        setBack((b) => Math.max(0, b - 1))
      }, 1, flung)
      return
    }
    swapCard(() => {
      if (action === 'add') {
        addToReviewDeck(id)
        noteNewWordAdded(id)
        /* Only once the word is really in — the guided tour celebrates it
           and moves on to Review. */
        reportTourAction('word:add')
      } else {
        skipNewWord(id)
      }
      setVisit((v) => [...v.filter((w) => w !== id), id])
    }, 1, flung)
  }

  const backward = (flung = false) => {
    if (back >= visit.length) return
    swapCard(() => setBack((b) => b + 1), -1, flung)
  }

  /* The gesture reads the latest of these through a ref: the responder is
     built once, and would otherwise act on the word of its first render. */
  const live = useRef({ forward, backward, canGoBack: false, width: cardWidth })
  live.current = { forward, backward, canGoBack: back < visit.length, width: cardWidth }

  /*
   * Claimed in the capture phase once a touch is plainly horizontal, so a drag
   * that starts on the speaker or the star still swipes the card, while a tap
   * on them — or a vertical scroll — still reaches them. PanResponder zeroes
   * `dx` at the grant, so the distance travelled before the claim is carried
   * in `claimedDx`, as the book reader does.
   */
  const claimedDx = useRef(0)
  /*
   * A drag must not also be a tap. On web the card's Pressable still fired its
   * press on the mouse-up that ended a swipe, so every swipe opened writing
   * practice as well. Set when a drag is granted, cleared just after it ends —
   * late enough that the press arriving on the same release still sees it.
   */
  const dragging = useRef(false)
  const pan = useMemo(() => {
    const claim = (g: { dx: number; dy: number }) => {
      if (swapping.current) return false
      if (Math.abs(g.dx) <= SWIPE.slop || Math.abs(g.dx) <= Math.abs(g.dy) * SWIPE.bias) return false
      claimedDx.current = g.dx
      return true
    }
    const offset = (dx: number) => (dx > 0 && !live.current.canGoBack ? dx * SWIPE.resist : dx)
    const springBack = () =>
      Animated.spring(drag, { toValue: 0, damping: 18, stiffness: 220, mass: 0.8, useNativeDriver: USE_NATIVE_DRIVER }).start()
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => claim(g),
      onMoveShouldSetPanResponder: (_, g) => claim(g),
      onPanResponderGrant: () => {
        dragging.current = true
      },
      onPanResponderMove: (_, g) => drag.setValue(offset(g.dx + claimedDx.current)),
      onPanResponderRelease: (_, g) => {
        setTimeout(() => (dragging.current = false), 80)
        const dx = g.dx + claimedDx.current
        const reach = live.current.width * SWIPE.commit
        const far = Math.abs(dx) >= SWIPE.flickMin
        if ((dx < -reach && g.vx < SWIPE.flick) || (far && dx < 0 && g.vx < -SWIPE.flick)) {
          tickHaptic()
          live.current.forward('skip', true)
        } else if (live.current.canGoBack && ((dx > reach && g.vx > -SWIPE.flick) || (far && dx > 0 && g.vx > SWIPE.flick))) {
          tickHaptic()
          live.current.backward(true)
        } else {
          springBack()
        }
      },
      onPanResponderTerminate: () => {
        setTimeout(() => (dragging.current = false), 80)
        springBack()
      },
      onPanResponderTerminationRequest: () => false,
    })
  }, [drag])

  // The daily limit is a goal, not a gate: reaching it changes the banner,
  // never whether Add works.
  const limit = settings.dailyNewWordLimit
  const limitReached = wordsLearnedToday >= limit
  const progress = limit > 0 ? Math.min(1, wordsLearnedToday / limit) : 0

  /*
   * The goal note plays whenever the goal becomes reached: on arrival if it
   * already is, or the moment an Add crosses it, with a backstop that
   * force-hides it — a stalled requestAnimationFrame (a hidden web tab) must
   * not leave the note parked over the card for good.
   *
   * One JS-driven value runs the whole thing, shadow included. The shadow
   * (`shadowOpacity`, `elevation`) can't ride the native driver, and a value
   * can't be on both drivers — so splitting them is exactly how the shadow ended
   * up fading on a different clock from the box. See the markup for the other
   * half of the fix.
   */
  const goalNote = useRef(new Animated.Value(0)).current
  const [goalNoteVisible, setGoalNoteVisible] = useState(false)
  const showGoalNote = limitReached && Boolean(shown)
  useEffect(() => {
    if (!showGoalNote) return
    setGoalNoteVisible(true)
    goalNote.setValue(0)
    const run = Animated.sequence([
      Animated.timing(goalNote, { toValue: 1, duration: GOAL_NOTE.in, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.delay(GOAL_NOTE.hold),
      Animated.timing(goalNote, { toValue: 0, duration: GOAL_NOTE.out, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ])
    let done = false
    const finish = () => {
      if (done) return
      done = true
      goalNote.setValue(0)
      setGoalNoteVisible(false)
    }
    run.start(finish)
    const backstop = setTimeout(finish, GOAL_NOTE.in + GOAL_NOTE.hold + GOAL_NOTE.out + 300)
    return () => {
      run.stop()
      clearTimeout(backstop)
    }
  }, [showGoalNote, goalNote])

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      {/* The bamboo and mist along the foot — out of flow and behind everything. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: windowWidth / FOOT_ART_RATIO }}
      >
        <Image source={ART.foot} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <View style={{ width: columnWidth, flexGrow: 1, paddingHorizontal: GUTTER, paddingBottom: 12 }}>
          {/* Header: back, the centred title, Recent. */}
          <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={10}
              style={{ width: 40, height: 44, justifyContent: 'center', marginLeft: -6 }}
            >
              <ChevronLeft size={28} color={c.greenDark} strokeWidth={2.4} />
            </Pressable>

            {/*
              The title spans the whole header so it centres on the screen, and
              is drawn over the back arrow. `pointerEvents` has to sit on a
              wrapping View: on a `Text` it is ignored on native, and the title
              swallowed every tap on the arrow (web honoured it, so it only
              broke on a phone).
            */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0 }}>
              <Text
                style={{
                  textAlign: 'center',
                  fontFamily: 'NunitoExtraBold',
                  fontSize: 21,
                  lineHeight: 27,
                  color: c.navy,
                }}
              >
                New Words
              </Text>
            </View>

            <Pressable
              onPress={() => {
                tickHaptic()
                setShowRecent(true)
              }}
              accessibilityRole="button"
              accessibilityLabel={`Recent words, ${newWordHistory.length} seen`}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <History size={20} color={c.greenDark} strokeWidth={2.2} />
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 20, color: c.textSecondary }}>Recent</Text>
            </Pressable>
          </View>

          {/* Today's progress towards the daily new-word goal. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: TRACK, overflow: 'hidden' }}>
              <View style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 4, backgroundColor: c.green }} />
            </View>
            <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14, lineHeight: 19, color: c.textMuted }}>
              {wordsLearnedToday} / {limit}
            </Text>
          </View>

          {/*
            Floats over the top of the card, so its fade moves nothing.

            Faded as one picture. `needsOffscreenAlphaCompositing` (and the
            hardware texture on Android) renders the box, its padding, text and
            shadow into one layer and fades that — otherwise Android fades each
            piece on its own, so the fill, the text and the elevation shadow pass
            through each other at different strengths. The layer is inset by
            `GOAL_NOTE.room` so the shadow falls inside it instead of being
            clipped at the box's edge.
          */}
          {goalNoteVisible && (
            <Animated.View
              pointerEvents="none"
              needsOffscreenAlphaCompositing
              renderToHardwareTextureAndroid
              style={{
                position: 'absolute',
                top: 50 + 34 + 10 - GOAL_NOTE.room,
                left: GUTTER - GOAL_NOTE.room,
                right: GUTTER - GOAL_NOTE.room,
                padding: GOAL_NOTE.room,
                zIndex: 10,
                opacity: goalNote,
                transform: [{ translateY: goalNote.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
              }}
            >
              <Animated.View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: c.goldSoft,
                  ...dashShadowLifted,
                  shadowOpacity: goalNote.interpolate({ inputRange: [0, 1], outputRange: [0, dashShadowLifted.shadowOpacity] }),
                  elevation: goalNote.interpolate({ inputRange: [0, 1], outputRange: [0, dashShadowLifted.elevation] }),
                }}
              >
                <CircleAlert size={22} color="#C99A3E" strokeWidth={2} />
                <Text style={{ flex: 1, fontFamily: 'NunitoSemiBold', fontSize: 13.5, lineHeight: 18, color: '#8A5A1F' }}>
                  Daily goal reached! Keep adding words if you like.
                </Text>
              </Animated.View>
            </Animated.View>
          )}

          {!shown ? (
            <EmptyState onOpenSettings={() => router.push('/settings/learning')} />
          ) : (
            <>
              {/* Its height never depends on the word: a fixed `CARD_MIN` basis
                  (and matching `minHeight`, which Android needs — see
                  `FlexGap`) plus its share of the spare height. Sized by its
                  content, a long example made that card taller and the buttons
                  jumped down for that one word. */}
              <View style={{ marginTop: 14, flexGrow: 3, flexShrink: 0, flexBasis: CARD_MIN, minHeight: CARD_MIN }}>
                {neighbours.map((w) => {
                  const live = w.id === shown.id
                  return (
                    /* Hidden by this plain wrapper, never by the animated one:
                       every card stays bound to `cardMotion` for life, because
                       detaching an animated style makes Android restore its
                       default (on screen, opaque) a frame before React's hiding
                       style lands — the old card would flash back. */
                    <View
                      key={w.id}
                      pointerEvents={live ? 'auto' : 'none'}
                      accessibilityElementsHidden={!live}
                      importantForAccessibility={live ? 'auto' : 'no-hide-descendants'}
                      style={
                        live
                          ? { flex: 1, zIndex: 1 }
                          : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }
                      }
                    >
                      {/* Plain styles only on the animated wrapper — NativeWind
                          drops `className` on an `Animated.View`.
                          `needsOffscreenAlphaCompositing` flattens the card into
                          one layer while it fades, so Android doesn't fade its
                          fill, border and shadow separately. */}
                      <Animated.View
                        {...(live ? pan.panHandlers : null)}
                        style={[
                          { flex: 1 },
                          cardMotion,
                          // Web: let the browser keep vertical scrolling but not
                          // take the horizontal drag, or it pans the page and
                          // cancels it.
                          Platform.OS === 'web' ? ({ userSelect: 'none', touchAction: 'pan-y' } as object) : null,
                        ]}
                        needsOffscreenAlphaCompositing
                      >
                        {/* The whole card opens writing practice, the same as the
                            button under it. `PressableScale` rather than a plain
                            Pressable because the card holds its own speaker button:
                            that one claims its press (see `PressClaim`), so a tap on
                            the speaker plays the word without also opening the pad. */}
                        <PressableScale
                          onPress={() => {
                            if (dragging.current) return
                            tapHaptic()
                            setShowPractice(true)
                          }}
                          haptic={false}
                          scaleTo={0.985}
                          accessibilityRole="none"
                          accessibilityLabel={`Practice writing ${displayWord(w, settings.script)}`}
                          wrapperStyle={{ flex: 1 }}
                          style={{ flex: 1 }}
                        >
                          <WordCard
                            word={w}
                            width={cardWidth}
                            script={settings.script}
                            phoneticScript={settings.phoneticScript}
                            shade={shade}
                            favorite={favoriteWordIds.includes(w.id)}
                            onToggleFavorite={() => toggleFavorite(w.id)}
                          />
                        </PressableScale>
                      </Animated.View>
                    </View>
                  )
                })}
              </View>

              {/*
                One set of three, all the same height and fully round: Skip
                (warm white, grey hairline) beside Add (the one filled green
                face), then Practice as a full-width mint pill beneath them.
              */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
                {/* The quiet one of the pair: like the Dashboard's Not now, its
                    shoulder casts no shadow. */}
                <PressableScale
                  onPress={() => {
                    tickHaptic()
                    forward('skip')
                  }}
                  haptic={false}
                  wrapperStyle={{ flex: 1 }}
                  accessibilityLabel={back > 0 ? 'Next word' : 'Skip this word'}
                >
                  <LiftedFace height={BUTTON_HEIGHT} fill={SKIP.fill} shoulder={SKIP.shoulder} border={SKIP.border} shadow={false}>
                    {/* Looking back through words already dealt with, there is
                        nothing to skip — this just moves on. */}
                    <Text style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: c.textSecondary }}>
                      {back > 0 ? 'Next' : 'Skip'}
                    </Text>
                  </LiftedFace>
                </PressableScale>

                {/* The tour's "Save what matters" spotlight lands here. The
                    wrapper is the flex child now, so it carries the share. */}
                <TourTarget id="new-words-add" radius={BUTTON_HEIGHT / 2} style={{ flex: 1.4 }}>
                  <PressableScale
                    onPress={() => {
                      tapHaptic()
                      forward('add')
                    }}
                    haptic={false}
                    accessibilityLabel={shownInDeck ? 'Already in my words — next word' : 'Add to my words'}
                  >
                    <LiftedFace height={BUTTON_HEIGHT} fill={ADD_GRADIENT[1]} shoulder={ADD_SHOULDER}>
                      {/* Out of flow, under the label: the face is the solid
                          colour, and this paints the reference's light over it. */}
                      <LinearGradient
                        colors={ADD_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: BUTTON_HEIGHT / 2 }}
                      />
                      {shownInDeck ? (
                        <Check size={22} color="#ffffff" strokeWidth={2.4} />
                      ) : (
                        <CirclePlus size={22} color="#ffffff" strokeWidth={2} />
                      )}
                      <Text style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: '#ffffff' }}>
                        {shownInDeck ? 'In my words' : 'Add to my words'}
                      </Text>
                    </LiftedFace>
                  </PressableScale>
                </TourTarget>
              </View>

              {/* Kept from the old screen: the full-width mint pill under the pair. */}
              <PressableScale
                onPress={() => {
                  tapHaptic()
                  setShowPractice(true)
                }}
                haptic={false}
                wrapperStyle={{ marginTop: 12 }}
                accessibilityLabel="Practice writing this word"
              >
                <LiftedFace height={BUTTON_HEIGHT} fill={PRACTICE.fill} shoulder={PRACTICE.shoulder} border={PRACTICE.border} shadow={false}>
                  <PenLine size={20} color={c.greenDark} strokeWidth={2} />
                  <Text style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: c.greenDark }}>
                    Practice writing this word
                  </Text>
                </LiftedFace>
              </PressableScale>

              {/* The card takes three parts of any spare height and this one,
                  so the buttons ride down the page without landing on the bamboo. */}
              <FlexGap min={0} grow={1} />
            </>
          )}
        </View>
      </ScrollView>

      {showRecent && (
        <RecentWordsSheet
          history={newWordHistory}
          getWord={getWord}
          script={settings.script}
          phoneticScript={settings.phoneticScript}
          onUnskip={unskipNewWord}
          onClose={() => setShowRecent(false)}
        />
      )}
      {showPractice && shown && <WritingPracticeModal word={shown} playbackOnFinish onClose={() => setShowPractice(false)} />}
    </SafeAreaView>
  )
}

/**
 * The card: the word, its reading and a speaker, the meaning, then the
 * example with the word tinted inside it. It fills a wrapper whose height is
 * the same for every word (see `CARD_MIN`), and that height is shared out between three
 * `FlexGap`s — above the word, before the example, and at the foot — rather
 * than left as one band of empty paper under the example, which is what a
 * plainly stretched card looked like.
 */
function WordCard({
  word,
  width,
  script,
  phoneticScript,
  shade,
  favorite,
  onToggleFavorite,
}: {
  word: VocabWord
  width: number
  script: ScriptMode
  phoneticScript: PhoneticScript
  /** 0→1 strength of the card's shadow, faded with the card as it swaps. */
  shade: Animated.Value
  favorite: boolean
  onToggleFavorite: () => void
}) {
  /* Claims the speaker's press from the card around it, which opens writing practice. */
  const claim = usePressClaim()
  const hanzi = displayWord(word, script)
  const example = word.example ? displayExample(word, script) : ''
  const size = hanziSize(hanzi)
  /* Small, and down in the corner beside the translation — not behind the example. */
  const artWidth = width * 0.34

  return (
    /* `flex: 1` fills the fixed-height wrapper exactly, whatever the word. */
    <Animated.View
      style={{
        flex: 1,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
        overflow: 'hidden',
        ...revealedShadow(dashShadow, shade),
      }}
    >
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: 0, bottom: 0, width: artWidth, height: artWidth / CARD_ART_RATIO }}
      >
        <Image source={ART.card} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </View>

      {/* The star, top right as the reference draws it. Claims its press like
          the speaker, so starring doesn't also open writing practice. */}
      <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
        <PressFace
          onPress={() => {
            claim()
            tickHaptic()
            onToggleFavorite()
          }}
          face={{ padding: 6 }}
          accessibilityLabel={favorite ? `Remove ${hanzi} from favorites` : `Add ${hanzi} to favorites`}
        >
          <Star
            size={26}
            color={favorite ? c.gold : c.textMuted}
            fill={favorite ? c.gold : 'transparent'}
            strokeWidth={1.8}
          />
        </PressFace>
      </View>

      <FlexGap min={22} />

      <View style={{ alignItems: 'center', paddingHorizontal: 22 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: serif(script), fontSize: size, lineHeight: Math.round(size * 1.25), color: c.navy }}
        >
          {hanzi}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 26, lineHeight: 32, color: c.textSecondary }}>
            {displayPinyin(word, phoneticScript)}
          </Text>
          {/* A bare speaker, as the reference draws it — the padding and
              `hitSlop` keep it a full-size target without a visible circle. */}
          <PressFace
            onPress={() => {
              claim()
              tapHaptic()
              speak(hanzi)
            }}
            face={{ padding: 6 }}
            accessibilityLabel={`Play pronunciation of ${hanzi}`}
          >
            <Volume2 size={26} color={c.green} fill={c.green} strokeWidth={2} />
          </PressFace>
        </View>

        <Text style={{ marginTop: 8, textAlign: 'center', fontFamily: 'NunitoSemiBold', fontSize: 18, lineHeight: 24, color: c.textSecondary }}>
          {shortGloss(word)}
        </Text>
      </View>

      <FlexGap min={18} />

      {example ? (
        <View style={{ marginHorizontal: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Text style={{ fontFamily: 'NunitoBold', fontSize: 16, lineHeight: 21, color: c.navy }}>Example</Text>
            {/* Reads the sentence aloud. Claims its press like the word's
                speaker, so it doesn't also open writing practice. */}
            <PressFace
              onPress={() => {
                claim()
                tapHaptic()
                speak(example)
              }}
              face={{ padding: 4 }}
              accessibilityLabel="Play the example sentence"
            >
              <Volume2 size={20} color={c.green} fill={c.green} strokeWidth={2} />
            </PressFace>
          </View>
          {/* Every sentence in the app goes through `ReadingSentence`: a reading
              under each word, in the learner's own phonetic script, with the
              word being learned tinted inside it. */}
          <ReadingSentence text={example} term={hanzi} tone="card" />
          <Text numberOfLines={3} style={{ marginTop: 8, marginRight: artWidth * 0.55, fontFamily: 'NunitoSemiBold', fontSize: 15.5, lineHeight: 21, color: c.textSecondary }}>
            {word.example?.translation}
          </Text>
        </View>
      ) : null}

      <FlexGap min={22} />
    </Animated.View>
  )
}

function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 360,
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 28,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
        ...dashShadow,
      }}
    >
      <Text style={{ fontSize: 44 }}>{'\u{1F38A}'}</Text>
      <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 19, lineHeight: 25, color: c.navy, textAlign: 'center' }}>
        You've cleared this level!
      </Text>
      <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center' }}>
        Raise your HSK level in Settings to keep finding new words.
      </Text>
      <Pressable
        onPress={onOpenSettings}
        accessibilityRole="button"
        style={{ marginTop: 6, height: 46, paddingHorizontal: 22, borderRadius: 23, justifyContent: 'center', backgroundColor: c.greenDark, ...dashShadowLifted }}
      >
        <Text style={{ fontFamily: 'NunitoBold', fontSize: 15, lineHeight: 20, color: '#ffffff' }}>Open Settings</Text>
      </Pressable>
    </View>
  )
}

/**
 * The words this screen has already shown, newest first.
 *
 * Its job is to make a skip reversible. Skipping is meant to be cheap — the
 * learner is saying "not this one, move on" — and a cheap decision needs a way
 * back, or it stops being cheap. Added words are listed too, because "what have
 * I just been through?" is the same question whichever button was pressed.
 */
function RecentWordsSheet({
  history,
  getWord,
  script,
  phoneticScript,
  onUnskip,
  onClose,
}: {
  history: NewWordSeen[]
  getWord: (id: string) => VocabWord | undefined
  script: ScriptMode
  phoneticScript: PhoneticScript
  onUnskip: (wordId: string) => void
  onClose: () => void
}) {
  /* Newest first — the history is stored oldest-first so that trimming it drops
     the oldest, which is the opposite of how it should be read. */
  const rows = useMemo(
    () =>
      [...history]
        .reverse()
        .map((entry) => ({ entry, word: getWord(entry.wordId) }))
        .filter((row): row is { entry: NewWordSeen; word: VocabWord } => Boolean(row.word)),
    [history, getWord],
  )

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {/* No dimmed backdrop, by request: the page stays as it is behind the
          sheet, and a tap on it still closes the sheet. The sheet's own border
          and lifted shadow are what set it apart from the page. */}
      <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={onClose}>
        {/* Stops a tap inside the sheet from closing it — the backdrop is the
            dismiss target, and without this every row press dismisses too. */}
        <Pressable
          onPress={() => {}}
          style={{
            maxHeight: '80%',
            width: '100%',
            maxWidth: DASH_CONTENT_MAX,
            alignSelf: 'center',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: c.border,
            backgroundColor: c.card,
            ...dashShadowLifted,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.neutralTrack }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 22,
              paddingTop: 10,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <View>
              <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 21, lineHeight: 27, color: c.navy }}>Recent words</Text>
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14, lineHeight: 19, color: c.textMuted }}>
                Cards you've skipped or added
              </Text>
            </View>
            <PressFace onPress={onClose} face={{ padding: 6 }} accessibilityLabel="Close">
              <X size={24} color={c.textSecondary} strokeWidth={2.2} />
            </PressFace>
          </View>

          {rows.length === 0 ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 28, paddingVertical: 48 }}>
              <Text style={{ textAlign: 'center', fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 21, color: c.textSecondary }}>
                Nothing yet. Words you skip or add will show up here so you can go back to them.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              {rows.map(({ entry, word }) => (
                <View
                  key={entry.wordId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text style={{ fontFamily: serif(script), fontSize: 24, lineHeight: 32, color: c.navy }}>
                        {displayWord(word, script)}
                      </Text>
                      <Text style={{ fontFamily: 'NunitoBold', fontSize: 15, lineHeight: 20, color: c.textSecondary }}>
                        {displayPinyin(word, phoneticScript)}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: 'NunitoSemiBold', fontSize: 14.5, lineHeight: 20, color: c.textSecondary }}
                    >
                      {shortGloss(word)}
                    </Text>
                  </View>

                  {entry.outcome === 'added' ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: c.greenSoft,
                      }}
                    >
                      <Check size={14} color={c.greenDark} strokeWidth={2.6} />
                      <Text style={{ fontFamily: 'NunitoBold', fontSize: 13, lineHeight: 17, color: c.greenDark }}>Added</Text>
                    </View>
                  ) : (
                    /* The only action here. An added word is already in the deck
                       and has its own home in My Words; a skipped one is the case
                       with nowhere else to go. */
                    <PressFace
                      onPress={() => {
                        tickHaptic()
                        onUnskip(entry.wordId)
                      }}
                      accessibilityLabel={`Put ${displayWord(word, script)} back in the queue`}
                      face={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: c.border,
                        backgroundColor: c.background,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <RotateCcw size={14} color={c.textSecondary} strokeWidth={2.4} />
                      <Text style={{ fontFamily: 'NunitoBold', fontSize: 13, lineHeight: 17, color: c.textSecondary }}>Unskip</Text>
                    </PressFace>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
