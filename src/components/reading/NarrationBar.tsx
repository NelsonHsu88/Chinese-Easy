import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform, PanResponder, useWindowDimensions } from 'react-native'
import { Play, Pause, RotateCcw, RotateCw, X } from 'lucide-react-native'
import type { Story } from '../../types'
import { SKIP_SECONDS } from '../../lib/narration'
import { StoryArt } from './StoryArt'
import { useApp } from '../../context/AppContext'
import { hanziFont } from '../../lib/hanzi'
import { forScript } from '../../lib/scriptConversion'

/*
 * The audiobook transport, risen from the foot of the Story Reader.
 *
 * Light-only, like the rest of the reading screens — the design rests on cream
 * paper, and a dark repaint would be a different design rather than a recolour.
 */

/*
 * Fixed rather than measured. `onLayout` does not fire for every view under
 * react-native-web, so gating the entrance on a measured height leaves the bar
 * parked off-screen in a browser — this is the distance it travels.
 */
const BAR_HEIGHT = 330

/** The reading design's content cap, matching `ReadingShell`. */
const CONTENT_WIDTH = 430
/** `px-6` on the sheet, both sides. */
const SIDE_PADDING = 24

/** Matches the word sheet's motion, so the two rise from the same place the same way. */
const RISE = { damping: 22, stiffness: 210, mass: 0.85 } as const
const FALL = { duration: 210, easing: Easing.in(Easing.cubic) } as const

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

const TRACK_HEIGHT = 5
const KNOB = 16

interface Props {
  visible: boolean
  playing: boolean
  story: Story
  /** How far through the whole story the narrator is, 0 to 1. */
  progress: number
  onTogglePlay: () => void
  /** Signed seconds — negative rewinds. */
  onSkip: (seconds: number) => void
  /** Fraction of the whole story to jump to. */
  onSeek: (fraction: number) => void
  onClose: () => void
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

/** A circular-arrow skip button with its step size sitting inside the arrow. */
function SkipButton({ direction, onPress }: { direction: 'back' | 'forward'; onPress: () => void }) {
  const Icon = direction === 'back' ? RotateCcw : RotateCw
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        direction === 'back' ? `Back ${SKIP_SECONDS} seconds` : `Forward ${SKIP_SECONDS} seconds`
      }
      className="items-center justify-center rounded-full active:opacity-60"
      style={{ width: 56, height: 56 }}
    >
      <Icon size={34} color="#292936" strokeWidth={1.8} />
      {/* Centred inside the arrow's hollow, the way a podcast player reads. */}
      <View className="absolute inset-0 items-center justify-center">
        <Text className="font-inter-semibold text-[11px]" style={{ color: '#292936' }}>
          {SKIP_SECONDS}
        </Text>
      </View>
    </Pressable>
  )
}

export function NarrationBar({
  visible,
  playing,
  story,
  progress,
  onTogglePlay,
  onSkip,
  onSeek,
  onClose,
}: Props) {
  /*
   * Kept mounted through the exit animation — unmounting on `visible` going
   * false would cut the bar off mid-slide instead of letting it leave.
   */
  const [rendered, setRendered] = useState(visible)
  const slide = useRef(new Animated.Value(visible ? 1 : 0)).current
  const script = useApp().settings.script

  const { width: windowWidth } = useWindowDimensions()
  /*
   * Derived, not measured. The sheet is capped at the reading design's content
   * width and padded by a known amount, so the track's width is already known —
   * and `onLayout` is not dependable enough on web to hang a drag gesture on.
   */
  const trackWidth = Math.max(80, Math.min(windowWidth, CONTENT_WIDTH) - SIDE_PADDING * 2)

  /** Set while a finger is down, so the knob follows the drag and not the voice. */
  const [dragFraction, setDragFraction] = useState<number | null>(null)
  const dragRef = useRef(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      Animated.spring(slide, { toValue: 1, ...RISE, useNativeDriver: USE_NATIVE_DRIVER }).start()
      return
    }
    Animated.timing(slide, { toValue: 0, ...FALL, useNativeDriver: USE_NATIVE_DRIVER }).start(
      ({ finished }) => {
        if (finished) setRendered(false)
      },
    )
  }, [visible, slide])

  /*
   * Dragging is tracked as a starting fraction plus the gesture's own dx rather
   * than from the touch's page coordinates. `locationX` is only dependable at
   * the moment the responder is granted, and page coordinates would need the
   * track's position on screen — another measurement to get wrong.
   */
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const at = clamp01((evt.nativeEvent.locationX ?? 0) / trackWidth)
          startRef.current = at
          dragRef.current = at
          setDragFraction(at)
        },
        onPanResponderMove: (_evt, gesture) => {
          const at = clamp01(startRef.current + gesture.dx / trackWidth)
          dragRef.current = at
          setDragFraction(at)
        },
        onPanResponderRelease: () => {
          onSeek(dragRef.current)
          setDragFraction(null)
        },
        onPanResponderTerminate: () => setDragFraction(null),
      }),
    [trackWidth, onSeek],
  )

  if (!rendered) return null

  const shown = clamp01(dragFraction ?? progress)
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [BAR_HEIGHT + 24, 0] })

  return (
    /*
     * Two layers on purpose: NativeWind drops `className` on an `Animated.View`
     * entirely, so the transform lives out here on plain styles and every
     * Tailwind class lives on the plain View inside.
     */
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        transform: [{ translateY }],
        opacity: slide,
      }}
      pointerEvents="box-none"
    >
      <View
        className="rounded-t-[26px] px-6 pb-8 pt-3 shadow-paper-sheet"
        style={{ backgroundColor: '#fffdf8', borderTopWidth: 1, borderColor: '#e9e4da' }}
      >
        {/* Sheet grabber — signals "this came up from the bottom and can go back down". */}
        <View className="items-center">
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: '#e4ded4' }} />
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Stop reading aloud"
          className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full active:opacity-60"
        >
          <X size={19} color="#8a8a99" strokeWidth={2.2} />
        </Pressable>

        {/*
          What's playing — the cover over the title, the way a player names its
          track. Stacked and centred rather than set in a row along the left
          edge, so the artwork, the title and the play button all share one
          centre line down the sheet.
        */}
        <View className="mt-2 items-center px-9">
          <View className="rounded-[10px] shadow-paper">
            <StoryArt story={story} width={54} height={81} radius={10} />
          </View>
          <Text
            numberOfLines={1}
            className={`mt-2.5 ${hanziFont(script, 'semibold')} text-[18px]`}
            style={{ color: '#1a1a2e' }}
          >
            {forScript(story.title, script)}
          </Text>
          <Text numberOfLines={1} className="font-lora text-[12.5px]" style={{ color: '#55545d' }}>
            {story.titleEnglish}
          </Text>
        </View>

        <View className="mt-4 flex-row items-center justify-center" style={{ gap: 30 }}>
          <SkipButton direction="back" onPress={() => onSkip(-SKIP_SECONDS)} />

          <Pressable
            onPress={onTogglePlay}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            className="items-center justify-center rounded-full shadow-glow-jade active:opacity-85"
            style={{ width: 66, height: 66, backgroundColor: '#45b887' }}
          >
            {playing ? (
              <Pause size={27} color="#ffffff" fill="#ffffff" strokeWidth={1.5} />
            ) : (
              // Nudged right so the triangle's mass, not its bounding box, sits centred.
              <Play size={27} color="#ffffff" fill="#ffffff" strokeWidth={1.5} style={{ marginLeft: 3 }} />
            )}
          </Pressable>

          <SkipButton direction="forward" onPress={() => onSkip(SKIP_SECONDS)} />
        </View>

        {/*
          The scrubber measures the *text*, not time. Speech has no timeline to
          seek, but the position in the story's characters is known exactly and
          can be restarted from anywhere — so this is a real control rather than
          a decorative one, and dragging it genuinely moves the narrator.

          The touch target is deliberately much taller than the 5px track: a
          hairline is impossible to grab with a thumb.
        */}
        <View
          className="mt-5 justify-center"
          style={{ height: 34 }}
          accessibilityRole="adjustable"
          accessibilityLabel="Reading position"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(shown * 100) }}
          {...pan.panHandlers}
        >
          <View
            style={{
              width: trackWidth,
              height: TRACK_HEIGHT,
              borderRadius: TRACK_HEIGHT / 2,
              backgroundColor: '#eee8df',
            }}
          >
            <View
              style={{
                width: trackWidth * shown,
                height: TRACK_HEIGHT,
                borderRadius: TRACK_HEIGHT / 2,
                backgroundColor: '#45b887',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: trackWidth * shown - KNOB / 2,
                top: TRACK_HEIGHT / 2 - KNOB / 2,
                width: KNOB,
                height: KNOB,
                borderRadius: KNOB / 2,
                backgroundColor: '#ffffff',
                borderWidth: 2.5,
                borderColor: '#45b887',
              }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  )
}
