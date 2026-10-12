import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react'
import { View, Pressable, Animated, Easing, PanResponder, Platform, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { thunkHaptic } from '../../lib/haptics'
import { bookColors as c, bookMotion, bookSize } from './tokens'

/*
 * Turning the pages of a book.
 *
 * The page on screen is the right-hand page of an open book whose spine is the
 * left edge. Turning forward lifts that page off the one beneath and swings it
 * over the spine — a rotation about the left edge, in perspective, so the free
 * edge comes up towards the reader and passes overhead. Turning back is the
 * previous page swinging back in over the current one.
 *
 * **The free edge follows the finger.** A rotation of θ puts the page's right
 * edge at `width · cos θ` from the spine, so a drag is converted to an angle
 * through `acos` rather than scaled linearly. Linear felt like steering the
 * page from somewhere else; this feels like holding its corner.
 *
 * **Every page owns its own turn value, bound once and never rebound.** 0 is
 * the page lying flat on the right, 1 turned over onto the left. Pages are
 * stacked like a real book — an earlier page always above a later one — so at
 * rest the page on screen sits on top of the next one, and the previous one
 * lies turned over where it can't be seen. A turn is nothing but one page's
 * value moving; no style is swapped, nothing re-renders, and nothing is hidden
 * when it lands.
 *
 * That is the fix for a flash, not a style choice. The previous design moved a
 * single shared value between "leaf" and "flat" roles, so when a turn landed
 * the page just turned away lost its animated transform and opacity — and on
 * Android the native animation module restores a detached prop to its default
 * (flat, fully opaque) a frame before React's hiding style arrives. The old
 * page flashed back over the new one, every turn. With bindings that never
 * detach there is nothing to restore.
 *
 * The previous, current and next pages are always mounted, so a turn never
 * waits on building a page: mounting one at the moment of an arrow press put a
 * page of word segmentation into the animation's first frame, and on a phone
 * the turn had finished before anything was drawn.
 *
 * Front and back are swapped by opacity at edge-on rather than with
 * `backfaceVisibility`, which Android has honoured unreliably. Built on React
 * Native's own `Animated` and `PanResponder`: Reanimated's loop does not drive
 * on this project's web target (CLAUDE.md, Animation).
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'
/** Far enough that the edge coming overhead swells, not so near it distorts. */
const PERSPECTIVE = 2200
/** A drag shorter than this, or more vertical than horizontal, is left to whatever is under the finger. */
const DRAG_SLOP = 8
/** How much more horizontal than vertical a drag must be to count as a swipe. */
const HORIZONTAL_BIAS = 1.15
/**
 * A swipe turns the page once it has travelled this share of the page's width,
 * or been flicked at `FLICK` (px/ms) — whichever comes first. Half the width,
 * which a page-follows-finger model would ask for, was far more than anyone
 * swipes: most turns fell back.
 */
const TURN_DISTANCE = 0.15
const FLICK = 0.2
/** A page's swing to rest: quick off the mark, settling gently — the curve a sheet of paper falls on. */
const TURN_EASING = Easing.bezier(0.22, 0.61, 0.36, 1)

type Direction = 'next' | 'prev'

export interface PageFlipHandle {
  /** Turns one page with the full animation, as if the arrow were pressed. False if a turn was already under way, or there is no page that way. */
  turn: (direction: Direction) => boolean
}

interface Props {
  index: number
  count: number
  width: number
  height: number
  /** Draws one whole sheet of paper, content and all. Called for the page on screen and the ones either side. */
  renderPage: (index: number) => ReactNode
  /** A turn has finished and the book is open at `index`. */
  onTurn: (index: number) => void
}

export const PageFlip = forwardRef<PageFlipHandle, Props>(function PageFlip(
  { index, count, width, height, renderPage, onTurn },
  ref,
) {
  /* One value per page, created on first use at its resting place for the page now open. */
  const values = useRef(new Map<number, Animated.Value>()).current
  const valueFor = (page: number) => {
    let v = values.get(page)
    if (!v) {
      v = new Animated.Value(page < live.current.index ? 1 : 0)
      values.set(page, v)
    }
    return v
  }

  /*
   * The gesture handlers are created once, so everything they read lives in a
   * ref: a closure over props or state would answer with the first render's.
   */
  const live = useRef({ index, count, width, onTurn })
  live.current = { ...live.current, count, width, onTurn }
  /** The page whose value is moving, and which way, while a turn is under way. */
  const turnRef = useRef<{ direction: Direction; page: number } | null>(null)
  /** Set while a release or an arrow is animating the page home. */
  const settlingRef = useRef(false)
  /** Finishes the settle in flight at once — for a swipe that arrives before the last turn has landed. */
  const finishRef = useRef<(() => void) | null>(null)
  /** Where the moving page was last put. Tracked here because a natively driven value can't be read back synchronously. */
  const lastValue = useRef(0)

  /*
   * The book was opened somewhere new without a turn — the cover's "Continue",
   * the scrubber, a resize. Lay every page where it belongs for that page. A
   * completed turn lands here too, and finds every value already in place.
   */
  if (index !== live.current.index && !turnRef.current) live.current.index = index
  useEffect(() => {
    if (turnRef.current) return
    live.current.index = index
    for (const [page, v] of values) v.setValue(page < index ? 1 : 0)
  }, [index, values])

  const begin = (direction: Direction): boolean => {
    /* A new swipe never waits for the last turn's animation: that turn lands
       now, and this one starts from the page it landed on. Ignoring swipes
       made mid-turn is what made quick reading feel unresponsive. */
    if (settlingRef.current) finishRef.current?.()
    if (turnRef.current) return false
    const { index: at, count: total } = live.current
    if (direction === 'next' ? at >= total - 1 : at <= 0) return false
    turnRef.current = { direction, page: direction === 'next' ? at : at - 1 }
    lastValue.current = direction === 'next' ? 0 : 1
    return true
  }

  /** Animates the page home — over (`complete`) or back where it came from — and commits. */
  const settle = (complete: boolean) => {
    const turn = turnRef.current
    if (!turn) return
    settlingRef.current = true
    const v = valueFor(turn.page)
    const target = (turn.direction === 'next') === complete ? 1 : 0
    const duration = Math.max(200, Math.abs(target - lastValue.current) * bookMotion.turn)

    /*
     * Committed on whichever of the animation's callback and a timer arrives
     * first. Off the native driver this runs on requestAnimationFrame, which a
     * browser stops for a hidden tab — and the page change itself lives in the
     * callback, so without the timer the book would simply stop turning
     * (CLAUDE.md, Animation, trap 6).
     */
    let done = false
    const finish = () => {
      if (done) return
      done = true
      finishRef.current = null
      v.stopAnimation()
      v.setValue(target)
      turnRef.current = null
      settlingRef.current = false
      if (complete) {
        thunkHaptic()
        const at = live.current.index
        const next = turn.direction === 'next' ? at + 1 : at - 1
        /* Recorded here as well as by the parent's re-render, because a swipe
           can begin before that render lands, and must count from this page. */
        live.current.index = next
        live.current.onTurn(next)
      }
    }
    finishRef.current = finish
    Animated.timing(v, { toValue: target, duration, easing: TURN_EASING, useNativeDriver: USE_NATIVE_DRIVER }).start(finish)
    setTimeout(finish, duration + 140)
  }

  /** A whole turn, as the arrows and the narrator ask for it. */
  const turnWhole = (direction: Direction): boolean => {
    // The arrows and the narrator wait their turn; only a finger cuts one short.
    if (settlingRef.current || turnRef.current || !begin(direction)) return false
    settle(true)
    return true
  }

  useImperativeHandle(ref, () => ({ turn: turnWhole }))

  /** Where the page's free edge would be for a drag of `dx`, as its value. */
  const progressFor = (direction: Direction, dx: number) => {
    const w = live.current.width
    const edge = (direction === 'next' ? w : -w) + dx
    return Math.acos(Math.max(-1, Math.min(1, edge / w))) / Math.PI
  }
  /*
   * How far the finger had already travelled when the drag was recognised as a
   * swipe. PanResponder zeroes `dx` at the grant, so the grant cannot tell
   * which way the swipe is going — reading the direction there turned every
   * swipe into a turn *back*, which did nothing at all on the title page — and
   * every later `dx` is short by this much.
   */
  const claimedDx = useRef(0)

  const pan = useMemo(() => {
    const isSwipe = (g: { dx: number; dy: number }) =>
      Math.abs(g.dx) > DRAG_SLOP && Math.abs(g.dx) > Math.abs(g.dy) * HORIZONTAL_BIAS
    const claim = (g: { dx: number; dy: number }) => {
      if (!isSwipe(g)) return false
      claimedDx.current = g.dx
      return true
    }
    return PanResponder.create({
      /*
       * Claimed in the capture phase, so a horizontal drag that starts on a
       * word still turns the page — but only once it is plainly horizontal,
       * so a tap on that word, or a vertical scroll, still reaches it. The
       * bubble phase asks the same question, for a drag that starts on bare
       * paper where nothing underneath wanted the touch.
       */
      onMoveShouldSetPanResponderCapture: (_, g) => claim(g),
      onMoveShouldSetPanResponder: (_, g) => claim(g),
      onPanResponderGrant: () => {
        begin(claimedDx.current < 0 ? 'next' : 'prev')
      },
      onPanResponderMove: (_, g) => {
        const turn = turnRef.current
        if (!turn || settlingRef.current) return
        lastValue.current = progressFor(turn.direction, g.dx + claimedDx.current)
        valueFor(turn.page).setValue(lastValue.current)
      },
      onPanResponderRelease: (_, g) => {
        const turn = turnRef.current
        if (!turn || settlingRef.current) return
        const dx = g.dx + claimedDx.current
        /* Any real swipe the right way turns the page: far enough, or fast
           enough. Only a drag that was pulled back, or barely moved, returns. */
        const reach = live.current.width * TURN_DISTANCE
        const complete =
          turn.direction === 'next'
            ? (dx < -reach && g.vx < FLICK) || g.vx < -FLICK
            : (dx > reach && g.vx > -FLICK) || g.vx > FLICK
        settle(complete)
      },
      onPanResponderTerminate: () => settle(false),
      onPanResponderTerminationRequest: () => false,
    })
    // Everything the handlers touch is a ref, so one responder serves the screen's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mounted = [index - 1, index, index + 1].filter((i) => i >= 0 && i < count)
  const arrowTop = height / 2 - bookSize.arrow / 2

  return (
    <View
      /* On web, the browser must leave horizontal drags to the page: left to
         pan, it takes the touch and cancels the turn. Vertical stays its own,
         for the rare page that has to scroll. */
      style={[{ width, height }, Platform.OS === 'web' ? ({ userSelect: 'none', touchAction: 'pan-y' } as object) : null]}
      {...pan.panHandlers}
    >
      {mounted.map((page) => (
        <Leaf
          key={page}
          value={valueFor(page)}
          /* The page before this one, whose shadow falls across it as it swings over. */
          above={page > 0 ? valueFor(page - 1) : null}
          width={width}
          /* Earlier pages lie on top, as in a book: the open page covers the next, and the turned one covers nothing. */
          zIndex={count - page}
          interactive={page === index}
        >
          {renderPage(page)}
        </Leaf>
      ))}

      {/* The arrows, at the middle of the page, for anyone who would rather tap than swipe. */}
      {index > 0 && <TurnArrow side="left" top={arrowTop} onPress={() => turnWhole('prev')} />}
      {index < count - 1 && <TurnArrow side="right" top={arrowTop} onPress={() => turnWhole('next')} />}
    </View>
  )
})

/**
 * One sheet of the book, hinged at the spine and driven by its own value.
 * Every animated binding here is made once, when the page mounts, and kept
 * until it unmounts — see the file header for why that matters.
 */
function Leaf({
  value,
  above,
  width,
  zIndex,
  interactive,
  children,
}: {
  value: Animated.Value
  above: Animated.Value | null
  width: number
  zIndex: number
  interactive: boolean
  children: ReactNode
}) {
  const anim = useMemo(
    () => ({
      /* Rotating about the left edge: shift the pivot there, rotate, shift back. */
      transform: [
        { perspective: PERSPECTIVE },
        { translateX: -width / 2 },
        { rotateY: value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] }) },
        { translateX: width / 2 },
      ],
      front: value.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] }),
      /* The back shows past edge-on, and fades as it settles on the left — it has nowhere on screen to lie. */
      back: value.interpolate({ inputRange: [0, 0.5, 0.501, 0.9, 1], outputRange: [0, 0, 1, 1, 0] }),
      /* Light falling off the page as it lifts towards the reader. */
      lift: value.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' }),
      backShade: value.interpolate({ inputRange: [0.5, 1], outputRange: [1, 0.25], extrapolate: 'clamp' }),
      /* The shadow the page before this one throws across it as it swings over. */
      cast: above ? above.interpolate({ inputRange: [0, 0.12, 0.6, 1], outputRange: [0, 0.32, 0.14, 0] }) : null,
    }),
    [value, above, width],
  )

  return (
    <Animated.View pointerEvents={interactive ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { zIndex, transform: anim.transform }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim.front }]}>
        {children}
        {/* The lifting page darkens away from the spine, and catches a highlight along its free edge where it bends. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: anim.lift }]}>
          <LinearGradient
            colors={['rgba(40,28,14,0)', 'rgba(40,28,14,0.22)', 'rgba(255,250,240,0.35)', 'rgba(40,28,14,0.18)']}
            locations={[0, 0.82, 0.93, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {anim.cast && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: anim.cast }]}>
            <LinearGradient
              colors={['rgba(40,28,14,0.55)', 'rgba(40,28,14,0.12)', 'rgba(40,28,14,0)']}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* The back of the page: plain paper, darkest just after it passes edge-on. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: anim.back }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.paperBack, borderRadius: bookSize.radius.outer }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim.backShade }]}>
          <LinearGradient
            colors={['rgba(40,28,14,0.26)', 'rgba(40,28,14,0.06)', 'rgba(40,28,14,0.14)']}
            locations={[0, 0.6, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { borderRadius: bookSize.radius.outer }]}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  )
}

/**
 * A round paper button straddling the page's edge, half on the page and half
 * off it, so it never sits over a word.
 */
function TurnArrow({ side, top, onPress }: { side: 'left' | 'right'; top: number; onPress: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  const offset = -bookSize.arrow / 2 + 4
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? 'Previous page' : 'Next page'}
      hitSlop={8}
      style={{ position: 'absolute', top, zIndex: 1000, ...(side === 'left' ? { left: offset } : { right: offset }) }}
    >
      <View
        style={{
          width: bookSize.arrow,
          height: bookSize.arrow,
          borderRadius: bookSize.arrow / 2,
          backgroundColor: 'rgba(255,253,248,0.92)',
          borderWidth: 1,
          borderColor: c.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: c.ink,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          shadowOpacity: 0.12,
          elevation: 3,
        }}
      >
        <Icon size={22} color={c.teal} strokeWidth={2.4} />
      </View>
    </Pressable>
  )
}
