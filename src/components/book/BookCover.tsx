import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, Image, Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BarChart3, BookOpen, ChevronRight } from 'lucide-react-native'
import { displayTitleReading, hanziFont } from '../../lib/hanzi'
import { forScript } from '../../lib/scriptConversion'
import { tapHaptic, thunkHaptic } from '../../lib/haptics'
import type { PhoneticScript, ScriptMode, Story } from '../../types'
import { StoryArt } from '../reading/StoryArt'
import { PressableScale, LiftedFace, DASH_LIFT } from '../dashboard/parts'
import { formatCount, levelBand } from '../reading/storyPresentation'
import { bookColors as c, bookMotion, BOOK_CONTENT_MAX, ROOM } from './tokens'
import { BackArrow } from '../BackArrow'

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/**
 * The cover's arrival: a single opacity fade on a soft ease-in-out bezier. It
 * waits for the room image to load, and starts anyway after `waitAtMost` ms.
 */
const ARRIVE = { duration: 640, easing: Easing.bezier(0.4, 0, 0.2, 1), waitAtMost: 1500, waitForCover: 4000 } as const
/** A swipe to the left this far, or this fast (px/ms), opens the book as Start Reading does. */
const OPEN_SWIPE = { distance: 48, speed: 0.3 } as const

/** The desk scene, with the mockup's own type and button painted out (`processLibraryArt.mjs`). */
const ROOM_IMAGE = require('../../assets/images/library/book-room.jpg')

/**
 * The cover a story opens on, built to `SS103 Book Entry UI Redesign.png`: the
 * book standing on a scholar's desk in late sun, its title above it, and one
 * button below.
 *
 * The room is the mockup itself, scaled to cover the column. Everything live is
 * placed in the room's own pixel coordinates (`ROOM`), so the title, the stats
 * and the button land where the mockup's were painted out of, on any screen —
 * and the book that opens is laid exactly over the painted one, which it hides.
 *
 * "Start Reading" swings the front cover open about its spine, in perspective,
 * onto the title page behind it; then the whole screen fades away onto the
 * reader, which has been mounted underneath all along so there is nothing left
 * to load when it is uncovered.
 */
export function BookCover({
  story,
  script,
  phoneticScript,
  resuming,
  onBack,
  onStart,
  onOpened,
}: {
  story: Story
  script: ScriptMode
  phoneticScript: PhoneticScript
  /** The learner has read some of this before; the button offers to continue. */
  resuming: boolean
  onBack: () => void
  /** "Start Reading" was pressed — the moment to put the reader on the right page, before it is uncovered. */
  onStart: () => void
  /** The cover has opened and faded; unmount it. */
  onOpened: () => void
}) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const column = Math.min(width, BOOK_CONTENT_MAX)

  /* The room covers the column: scaled to whichever of width and height needs more, centred. */
  const s = Math.max(column / ROOM.width, height / ROOM.height)
  const offX = (column - ROOM.width * s) / 2
  const offY = (height - ROOM.height * s) / 2
  const X = (px: number) => offX + px * s
  const Y = (py: number) => offY + py * s

  const bookW = ROOM.book.w * s
  const bookH = ROOM.book.h * s
  /* Type scales with the room, inside limits that keep it legible on a small phone and calm on a large one. */
  const k = Math.min(1.15, Math.max(0.82, s / 0.5))
  const band = levelBand(story.hskLevel)
  const titleSize = Math.min(40 * k, (column - 40) / (story.title.length * 1.12))
  const buttonW = Math.max(220, ROOM.button.w * s)
  const buttonH = Math.max(50, ROOM.button.h * s)
  /* The title never rides up under the back arrow, whatever the room's crop. */
  const titleTop = Math.max(insets.top + 44, Y(ROOM.titleTop))
  /* Nor the button down into the home indicator. */
  const lift = Math.max(0, Y(ROOM.button.y) + buttonH / 2 + 10 - (height - insets.bottom))

  const open = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current
  /*
   * The arrival: one fade, of everything together, once both pictures — the
   * room and the book's cover — have loaded.
   *
   * Fading at mount let whatever was ready first show first: on a phone the
   * flat live book appeared before the lit room behind it (2D, then 3D), and
   * the cream title page *inside* the book showed through before its cover
   * image arrived. Now nothing shows until everything can, the inside page
   * isn't even built until the cover starts to open, and the book can't be
   * opened until it is ready.
   */
  const shown = useRef(new Animated.Value(0)).current
  const loaded = useRef({ room: false, cover: false })
  const [ready, setReady] = useState(false)
  const arrived = useRef(false)
  const arrive = () => {
    if (arrived.current) return
    arrived.current = true
    setReady(true)
    Animated.timing(shown, { toValue: 1, duration: ARRIVE.duration, easing: ARRIVE.easing, useNativeDriver: USE_NATIVE_DRIVER }).start()
  }
  const onPictureLoad = (which: 'room' | 'cover') => () => {
    loaded.current[which] = true
    if (loaded.current.room && loaded.current.cover) arrive()
  }
  useEffect(() => {
    /*
     * A picture that never reports loading must not leave the cover blank, or
     * the book shut for good. The room may be given up on early, but the
     * story's own cover is waited for longer: the room has the general 讀
     * book painted into it, and arriving without the cover showed that book
     * for a moment before the story's own (slow in development, where every
     * image comes from the dev server).
     */
    const late = setTimeout(() => {
      if (loaded.current.cover) arrive()
    }, ARRIVE.waitAtMost)
    const latest = setTimeout(arrive, ARRIVE.waitForCover)
    // Backstop for the fade itself: off the native driver a hidden browser tab stalls it (CLAUDE.md, Animation).
    const backstop = setTimeout(() => shown.setValue(1), ARRIVE.waitForCover + ARRIVE.duration + 200)
    return () => {
      clearTimeout(late)
      clearTimeout(latest)
      clearTimeout(backstop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [opening, setOpening] = useState(false)

  /*
   * Two legs, each committed on its callback *or* a timer, whichever is first
   * — off the native driver a hidden browser tab stops requestAnimationFrame,
   * and a cover that never finished opening would hide the reader for good.
   */
  const start = () => {
    if (opening || !arrived.current) return
    setOpening(true)
    tapHaptic()
    onStart()
    let faded = false
    const fadeOut = () => {
      if (faded) return
      faded = true
      thunkHaptic()
      let done = false
      const finish = () => {
        if (done) return
        done = true
        onOpened()
      }
      Animated.timing(fade, { toValue: 0, duration: bookMotion.readerFade, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }).start(finish)
      setTimeout(finish, bookMotion.readerFade + 140)
    }
    Animated.timing(open, {
      toValue: 1,
      duration: bookMotion.coverOpen,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(fadeOut)
    setTimeout(fadeOut, bookMotion.coverOpen + 140)
  }

  /*
   * A swipe from right to left opens the book, as a reader would push the cover
   * aside. `start` is read through a ref: the responder is built once.
   */
  const startRef = useRef(start)
  startRef.current = start
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx < -12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -OPEN_SWIPE.distance || g.vx < -OPEN_SWIPE.speed) startRef.current()
        },
      }),
    [],
  )

  // A cover left mid-swing would otherwise keep its timers; nothing to clean but the values.
  useEffect(() => () => open.stopAnimation(), [open])

  const coverTransform = [
    { perspective: 1400 },
    { translateX: -bookW / 2 },
    { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-168deg'] }) },
    { translateX: bookW / 2 },
  ]
  /* The book comes forward a little as it opens, towards the page it becomes. */
  const bookScale = open.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] })
  const coverFront = open.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] })
  const coverBack = open.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [0, 0, 1, 1] })

  const shadow = { textShadowColor: c.roomTextShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, backgroundColor: c.night, zIndex: 20, alignItems: 'center' }]}>
      {/* The library's paper, which the room fades up out of — the screen the learner just left. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: c.library, opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
      />
      <Animated.View style={{ width: column, height, overflow: 'hidden', opacity: shown }} {...swipe.panHandlers}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={ROOM_IMAGE}
            onLoad={onPictureLoad('room')}
            fadeDuration={0}
            style={{ position: 'absolute', left: offX, top: offY, width: ROOM.width * s, height: ROOM.height * s }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          {/* A touch more shade at the top and foot, where the type sits. */}
          <LinearGradient
            colors={['rgba(27,18,10,0.28)', 'rgba(27,18,10,0)', 'rgba(27,18,10,0)', 'rgba(27,18,10,0.32)']}
            locations={[0, 0.26, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>

        {/* The same flat arrow as everywhere else, but cream: grey vanishes on the cover. */}
        <BackArrow
          onPress={onBack}
          accessibilityLabel="Back to library"
          color={c.cream}
          style={{ position: 'absolute', top: insets.top + 6, left: 16, zIndex: 2 }}
        />

        {/* Title, reading, a brass rule with a diamond, and the English. */}
        <View pointerEvents="none" style={{ position: 'absolute', top: titleTop, left: 20, right: 20, alignItems: 'center' }}>
          {/* Sized to fit one line: CJK glyphs are ~1em wide, and adjustsFontSizeToFit does nothing on Android. */}
          <Text
            numberOfLines={1}
            className={hanziFont(script, 'semibold')}
            style={{ fontSize: titleSize, lineHeight: titleSize * 1.3, color: c.cream, textAlign: 'center', letterSpacing: 3, ...shadow }}
          >
            {forScript(story.title, script)}
          </Text>
          <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 17 * k, lineHeight: 24 * k, color: c.cream, marginTop: 4, ...shadow }}>{displayTitleReading(story.titlePinyin, phoneticScript)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 * k }}>
            <View style={{ width: 44 * k, height: 1, backgroundColor: c.brass }} />
            <View style={{ width: 6, height: 6, borderWidth: 1, borderColor: c.brass, transform: [{ rotate: '45deg' }] }} />
            <View style={{ width: 44 * k, height: 1, backgroundColor: c.brass }} />
          </View>
          <Text style={{ fontFamily: 'NunitoSemiBoldItalic', fontSize: 18 * k, lineHeight: 25 * k, color: c.cream, textAlign: 'center', ...shadow }}>
            {story.titleEnglish}
          </Text>
        </View>

        {/* The book, laid over the painted one — which it hides, so the cover can swing open. */}
        <Animated.View
          style={{ position: 'absolute', left: X(ROOM.book.x), top: Y(ROOM.book.y) - lift, width: bookW, height: bookH, transform: [{ scale: bookScale }] }}
        >
          {/* The title page under the cover — built only as the cover starts to open, so it can never show first. */}
          {opening && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.paper, borderRadius: 3, alignItems: 'center', justifyContent: 'center', padding: 14 }]}>
            <Text className={hanziFont(script, 'semibold')} style={{ fontSize: Math.min(26, bookW / 6), color: c.ink, textAlign: 'center' }}>
              {forScript(story.title, script)}
            </Text>
            <View style={{ width: 28, height: 1, backgroundColor: c.hairline, marginVertical: 8 }} />
            <Text style={{ fontFamily: 'NunitoSemiBoldItalic', fontSize: 11, color: c.inkSoft, textAlign: 'center' }}>{story.titleEnglish}</Text>
            <LinearGradient
              colors={['rgba(92,66,34,0.22)', 'rgba(92,66,34,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 22 }}
            />
          </View>
          )}

          {/* The front cover, hinged at the spine. */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: coverTransform }]}>
            {/* A plain board under the cover image: should the image still be on its way, the painted 讀 book in the room never shows through. */}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: coverFront, backgroundColor: c.paperBack, borderRadius: 3 }]}>
              <StoryArt story={story} width={bookW} height={bookH} radius={3} onLoad={onPictureLoad('cover')} />
              {/* The low sun from the window, falling across the board from the left. */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,214,150,0.16)', 'rgba(255,214,150,0)', 'rgba(60,36,12,0.12)']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 0.9 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 3 }]}
              />
              {/* The spine: a fold of board, dark at the hinge with a highlight beside it. */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(0,0,0,0.22)', 'rgba(255,255,255,0.16)', 'rgba(0,0,0,0)']}
                locations={[0, 0.35, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14 }}
              />
            </Animated.View>
            {/* The inside of the cover, seen once it swings past edge-on. */}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: coverBack, backgroundColor: c.paperBack, borderRadius: 3 }]} />
          </Animated.View>
        </Animated.View>

        {/* Stats and blurb, centred on the lines the mockup set them on. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: Y(ROOM.stats) - lift - 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
        >
          <BookOpen size={16} color={c.cream} strokeWidth={2} />
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 14, lineHeight: 22, color: c.cream, marginLeft: 7, ...shadow }}>
            {formatCount(story.wordCount)} words
          </Text>
          <View style={{ width: 1, height: 16, backgroundColor: c.creamFaint, marginHorizontal: 16 }} />
          <BarChart3 size={16} color={c.cream} strokeWidth={2} />
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 14, lineHeight: 22, color: c.cream, marginLeft: 7, ...shadow }}>
            HSK {story.hskLevel} · {band.en}
          </Text>
        </View>
        <Text
          pointerEvents="none"
          numberOfLines={2}
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: Y(ROOM.blurb) - lift - 11,
            fontFamily: 'NunitoSemiBold',
            fontSize: 14.5,
            lineHeight: 21,
            color: c.cream,
            textAlign: 'center',
            ...shadow,
          }}
        >
          {story.description}
        </Text>

        {/* The button, between two brass brackets. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: Y(ROOM.button.y) - lift - buttonH / 2,
            height: buttonH + DASH_LIFT,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bracket side="left" size={buttonH} />
          {/*
            The app's raised button (`LiftedFace`): a face standing on a
            darker shoulder, sinking onto it when pressed — the same object as
            Start Review and Show Answer. No `onPress` until the cover has
            arrived, or while it is already opening.
          */}
          <PressableScale
            onPress={opening || !ready ? undefined : start}
            scaleTo={1}
            haptic={false}
            accessibilityLabel={resuming ? 'Continue reading' : 'Start reading'}
          >
            <LiftedFace
              height={buttonH}
              fill={c.roomButton}
              shoulder={c.roomButtonShoulder}
              border={c.roomButtonEdge}
              style={{ width: buttonW }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Text style={{ fontFamily: 'NunitoBold', fontSize: 18, color: c.cream, includeFontPadding: false }}>
                  {resuming ? 'Continue Reading' : 'Start Reading'}
                </Text>
                <ChevronRight size={20} color={c.cream} strokeWidth={2.4} />
              </View>
            </LiftedFace>
          </PressableScale>
          <Bracket side="right" size={buttonH} />
        </View>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

/** The small brass bracket either side of the button: a rule running in, and a short upright whose tabs open towards the button. */
function Bracket({ side, size }: { side: 'left' | 'right'; size: number }) {
  const upright = size * 0.42
  const tab = (top: boolean) => (
    <View
      style={{
        position: 'absolute',
        [top ? 'top' : 'bottom']: 0,
        [side === 'left' ? 'left' : 'right']: 0,
        width: 6,
        height: 1,
        backgroundColor: c.brass,
      }}
    />
  )
  const rule = <View style={{ width: 12, height: 1, backgroundColor: c.brass }} />
  const post = (
    <View style={{ width: 6, height: upright }}>
      <View style={{ position: 'absolute', [side === 'left' ? 'left' : 'right']: 0, top: 0, bottom: 0, width: 1, backgroundColor: c.brass }} />
      {tab(true)}
      {tab(false)}
    </View>
  )
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 }}>
      {side === 'left' ? (
        <>
          {rule}
          {post}
        </>
      ) : (
        <>
          {post}
          {rule}
        </>
      )}
    </View>
  )
}
