import { DICT_BG } from './shadows'
import { RaisedButton } from '../dashboard/parts'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type PanResponderGestureState,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react-native'
import { tapHaptic } from '../../lib/haptics'
import { useReduceMotion } from '../tour/useReduceMotion'
import { TourTarget } from '../tour/targets'
import { ICON_GREEN, ICON_STROKE } from './DictionaryControls'
import { sheetColors } from './sheetTokens'
import { BackArrow } from '../BackArrow'

/*
 * The draggable "Explore this word" sheet on the dictionary detail pages.
 *
 * Two resting places only, collapsed and expanded. In between it follows the
 * finger; on release, a flick or the distance travelled picks one, and a spring
 * carries it there from wherever it was let go.
 *
 * Position is one Animated value (a translateY) — nothing re-renders while
 * dragging. React state changes only once per settle (`expanded`), for the
 * scroll lock and accessibility.
 */

/** Well damped (ratio ≈ 0.87): a hint of settle, no wobble. */
export const SHEET_SPRING = { stiffness: 260, damping: 28, mass: 1 } as const
/** Release speed that decides on its own, in px/ms (700 px/s). */
export const SHEET_FLICK = 0.7
/** Share of the travel a slow drag must cover to change state. */
export const SHEET_DISTANCE = 0.3
/** How far the sheet's surface runs past the bottom edge, so an overpull never shows a gap. */
const OVERPULL_ROOM = 72
/** Forces the end state if the animation never reports back (hidden tabs stop rAF). */
const SETTLE_BACKSTOP_MS = 1000
/*
 * The nudge: while the sheet sits closed and untouched, it hops up a little now
 * and then, a hint that it can be pulled. A few times per visit at most, and
 * never again once it has been opened or grabbed.
 */
const NUDGE_FIRST_MS = 1800
const NUDGE_GAP_MS = [6000, 9000] as const
const NUDGE_MAX = 4
/** The collapsed tab's height above any bottom inset. */
export const SHEET_PEEK = 82

const NATIVE = Platform.OS !== 'web'

/** Corner radius of the sheet's top edge. */
const SHEET_RADIUS = 64
/** The closed tab is white; it warms to the sheet's paper as it opens. */
const TAB_WHITE = '#FFFFFF'

const SHEET_SURFACE = {
  backgroundColor: sheetColors.paper,
  borderTopLeftRadius: SHEET_RADIUS,
  borderTopRightRadius: SHEET_RADIUS,
  borderTopWidth: 1,
  borderColor: '#EDE7DB',
  shadowColor: '#18263A',
  shadowOffset: { width: 0, height: -4 },
  shadowRadius: 14,
  shadowOpacity: 0.07,
  elevation: 10,
} as const

/** Soft limits past either end: a quarter of the overpull, capped. */
export interface SheetTab {
  key: string
  label: string
  icon: LucideIcon
  render: () => ReactNode
}

const MOUNTAINS = { source: require('../../assets/images/decor/mountains-wide.png'), ratio: 468 / 137 }

function resist(raw: number, travel: number): number {
  if (raw < 0) return -Math.min(OVERPULL_ROOM * 0.6, -raw * 0.25)
  if (raw > travel) return travel + Math.min(36, (raw - travel) * 0.25)
  return raw
}

export function InfoSheet({
  expandedHeight,
  bottomInset,
  label,
  hints,
  header,
  tabs,
  onBack,
  contentMaxWidth,
}: {
  /** Sheet height when open, measured from the bottom of the detail body. */
  expandedHeight: number
  /** Space under the sheet's tab that something else owns (home indicator), or 0. */
  bottomInset: number
  label: string
  /** The sections actually present, as short names ("Examples · Radical"). */
  hints: string[]
  /** The word block at the top of the open sheet. */
  header: ReactNode
  /** The open sheet's tabs; only the active one is rendered. */
  tabs: SheetTab[]
  /** Leaves the page (the open sheet covers the nav bar's back arrow). */
  onBack: () => void
  contentMaxWidth: number
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '')
  const current = tabs.find((t) => t.key === activeTab) ?? tabs[0]
  const peek = SHEET_PEEK + bottomInset
  const travel = Math.max(0, expandedHeight - peek)

  const y = useRef(new Animated.Value(travel)).current
  const pos = useRef(travel)
  const travelRef = useRef(travel)
  travelRef.current = travel

  const [expanded, setExpanded] = useState(false)
  const expandedRef = useRef(false)
  /** 'rest' | 'dragging' | 'settling' — a settle in flight is not yet the end state. */
  const phase = useRef<'rest' | 'dragging' | 'settling'>('rest')
  /** Bumped by every new settle or grab; a stale completion or backstop sees a different number and does nothing. */
  const token = useRef(0)
  const backstop = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragStart = useRef(0)
  /** Where the finger has put the sheet (before soft limits), and recent samples for release speed. */
  const lastRaw = useRef(0)
  const samples = useRef<{ t: number; raw: number }[]>([])
  const openAtGrab = useRef(false)

  /** Extra lift from the nudge, added on top of `y`. Zero except mid-hop. */
  const nudge = useRef(new Animated.Value(0)).current
  const translateY = useMemo(() => Animated.add(y, nudge), [y, nudge])
  /** The sheet has been opened or grabbed, so the hint has done its job. */
  const discovered = useRef(false)
  const stopNudge = useCallback(() => {
    nudge.stopAnimation()
    nudge.setValue(0)
  }, [nudge])

  const reduceMotion = useReduceMotion()
  const reduceRef = useRef(reduceMotion)
  reduceRef.current = reduceMotion

  useEffect(() => {
    const id = y.addListener(({ value }) => {
      pos.current = value
    })
    return () => y.removeListener(id)
  }, [y])

  /* Geometry changed (rotation, resize, first real measurement): re-seat a
     resting sheet at its new end. Moving sheets finish where they're going. */
  useEffect(() => {
    if (phase.current !== 'rest') return
    const target = expandedRef.current ? 0 : travel
    y.setValue(target)
    pos.current = target
  }, [travel, y])

  const clearBackstop = () => {
    if (backstop.current) clearTimeout(backstop.current)
    backstop.current = null
  }

  useEffect(
    () => () => {
      token.current += 1
      clearBackstop()
      y.stopAnimation()
    },
    [y],
  )

  const settle = useCallback(
    (open: boolean, velocity = 0) => {
      const target = open ? 0 : travelRef.current
      token.current += 1
      const mine = token.current
      clearBackstop()
      y.stopAnimation()
      phase.current = 'settling'
      if (open) discovered.current = true
      expandedRef.current = open
      setExpanded(open)

      const done = () => {
        if (token.current !== mine) return
        clearBackstop()
        phase.current = 'rest'
        y.setValue(target)
        pos.current = target
      }
      const animation = reduceRef.current
        ? Animated.timing(y, {
            toValue: target,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE,
            isInteraction: false,
          })
        : Animated.spring(y, {
            toValue: target,
            velocity: velocity,
            ...SHEET_SPRING,
            restDisplacementThreshold: 0.5,
            restSpeedThreshold: 2,
            useNativeDriver: NATIVE,
            isInteraction: false,
          })
      animation.start(done)
      backstop.current = setTimeout(done, reduceRef.current ? 400 : SETTLE_BACKSTOP_MS)
    },
    [y],
  )

  /** When the last drag ended. The browser follows a drag with a click on the tab, which must not toggle it. */
  const dragEndedAt = useRef(0)
  const toggle = useCallback(() => {
    if (phase.current === 'dragging' || Date.now() - dragEndedAt.current < 350) return
    settle(!expandedRef.current)
  }, [settle])

  const pan = useMemo(() => {
    const wantsVertical = (_: unknown, g: PanResponderGestureState) =>
      Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2

    /*
     * Decided from our own record of the drag, not the release's gesture
     * state: on the web that arrives with stale `dy`, so a long pull read as no
     * pull at all. Speed is measured over the last 100ms of movement, so a
     * finger that stops and then lets go is not a flick.
     */
    const release = () => {
      if (phase.current !== 'dragging') return
      dragEndedAt.current = Date.now()
      const t = travelRef.current
      const raw = lastRaw.current
      const now = Date.now()
      const recent = samples.current.filter((s) => now - s.t <= 100)
      const first = recent[0]
      const last = recent[recent.length - 1]
      const speed = first && last && last.t - first.t >= 8 ? (last.raw - first.raw) / (last.t - first.t) : 0
      let open: boolean
      if (speed < -SHEET_FLICK) open = true
      else if (speed > SHEET_FLICK) open = false
      else if (openAtGrab.current) open = raw < t * SHEET_DISTANCE
      else open = raw < t * (1 - SHEET_DISTANCE)
      // Animated.spring wants px/s.
      settle(open, speed * 1000)
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Capture, so a drag that starts on the tab's button still moves the sheet.
      onMoveShouldSetPanResponderCapture: wantsVertical,
      onMoveShouldSetPanResponder: wantsVertical,
      onPanResponderGrant: () => {
        discovered.current = true
        stopNudge()
        token.current += 1
        clearBackstop()
        y.stopAnimation()
        // `dy` is zeroed at grant, so start from wherever the sheet is now — no jump.
        dragStart.current = pos.current
        lastRaw.current = pos.current
        samples.current = [{ t: Date.now(), raw: pos.current }]
        openAtGrab.current = expandedRef.current
        phase.current = 'dragging'
      },
      onPanResponderMove: (_, g) => {
        const raw = dragStart.current + g.dy
        lastRaw.current = raw
        const now = Date.now()
        samples.current.push({ t: now, raw })
        if (samples.current.length > 12) samples.current.shift()
        y.setValue(resist(raw, travelRef.current))
      },
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
      onPanResponderTerminationRequest: () => false,
    })
  }, [settle, stopNudge, y])

  /* Android Back closes an open sheet before it leaves the page. */
  useFocusEffect(
    useCallback(() => {
      if (!expanded || Platform.OS !== 'android') return
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        settle(false)
        return true
      })
      return () => sub.remove()
    }, [expanded, settle]),
  )

  /* The nudge runs only while this page is in front, and not under reduced motion. */
  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) return
      let timer: ReturnType<typeof setTimeout> | null = null
      let backstopTimer: ReturnType<typeof setTimeout> | null = null
      let count = 0
      let live = true
      const hop = (toValue: number, duration: number, out: boolean) =>
        Animated.timing(nudge, {
          toValue,
          duration,
          easing: out ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
          useNativeDriver: NATIVE,
          isInteraction: false,
        })
      const next = () => {
        const [lo, hi] = NUDGE_GAP_MS
        timer = setTimeout(run, lo + Math.random() * (hi - lo))
      }
      const run = () => {
        if (!live || discovered.current || count >= NUDGE_MAX) return
        // Wait for a quiet moment: not while it's open, moving or held.
        if (phase.current !== 'rest' || expandedRef.current) return next()
        count += 1
        // Up, down, a smaller second hop: a bounce, not a slide.
        Animated.sequence([hop(-22, 230, true), hop(0, 170, false), hop(-9, 140, true), hop(0, 140, false)]).start()
        // Hidden browser tabs stop rAF; make sure the sheet lands back home.
        backstopTimer = setTimeout(() => {
          if (phase.current === 'rest') stopNudge()
        }, 1000)
        next()
      }
      timer = setTimeout(run, NUDGE_FIRST_MS)
      return () => {
        live = false
        if (timer) clearTimeout(timer)
        if (backstopTimer) clearTimeout(backstopTimer)
        stopNudge()
      }
    }, [reduceMotion, nudge, stopNudge]),
  )

  /* Escape closes it on the web. */
  useEffect(() => {
    if (!expanded || Platform.OS !== 'web' || typeof document === 'undefined') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded, settle])

  const safeTravel = Math.max(1, travel)
  const chevron = y.interpolate({ inputRange: [0, safeTravel], outputRange: ['180deg', '0deg'], extrapolate: 'clamp' })
  /* A crossfade over the travel: the pull tab in the lower half, the open sheet in the upper. */
  const openOpacity = y.interpolate({
    inputRange: [0, safeTravel * 0.5, safeTravel],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  })
  const peekOpacity = y.interpolate({
    inputRange: [0, safeTravel * 0.5, safeTravel],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  })
  /* White while closed, easing to the paper as it rises, so the open sheet's
     white cards still stand out against it. */
  const whiteOpacity = y.interpolate({ inputRange: [0, safeTravel], outputRange: [0, 1], extrapolate: 'clamp' })
  const scrimOpacity = y.interpolate({ inputRange: [0, safeTravel], outputRange: [1, 0], extrapolate: 'clamp' })

  const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none', touchAction: 'none' } as object) : null
  const C = sheetColors
  const washWidth = Math.min(contentMaxWidth + 60, 520)

  return (
    <>
      {/* A faint tint over the page while open; tapping it closes the sheet. */}
      <View pointerEvents={expanded ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Animated.View style={{ flex: 1, opacity: scrimOpacity, backgroundColor: 'rgba(24,38,58,0.07)' }}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => settle(false)}
            accessible={false}
            importantForAccessibility="no"
          />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          SHEET_SURFACE,
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -OVERPULL_ROOM,
            height: expandedHeight + OVERPULL_ROOM,
            transform: [{ translateY }],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: TAB_WHITE,
            borderTopLeftRadius: SHEET_RADIUS,
            borderTopRightRadius: SHEET_RADIUS,
            opacity: whiteOpacity,
          }}
        />
        {/* ---- Open: the word, the tabs, the active tab's cards ---- */}
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: expandedHeight, opacity: openOpacity }}
          pointerEvents={expanded ? 'auto' : 'none'}
          accessibilityElementsHidden={!expanded}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
          aria-hidden={!expanded}
        >
          <View
            {...pan.panHandlers}
            style={[
              {
                paddingTop: 10,
                paddingBottom: 12,
                overflow: 'hidden',
                borderTopLeftRadius: SHEET_RADIUS,
                borderTopRightRadius: SHEET_RADIUS,
              },
              webGrab,
            ]}
          >
            {/* An ink-wash range behind the word, as on the reading pages. */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -4, alignItems: 'center' }}>
              <Image
                source={MOUNTAINS.source}
                style={{ width: washWidth, height: washWidth / MOUNTAINS.ratio, opacity: 0.3 }}
                resizeMode="contain"
              />
            </View>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.handle }} />
            <View style={{ width: '100%', maxWidth: contentMaxWidth + 40, alignSelf: 'center', paddingHorizontal: 56, marginTop: 6 }}>
              {header}
              <BackArrow onPress={onBack} style={{ position: 'absolute', left: 8, top: 2 }} />
              <RaisedButton
                onPress={() => settle(false)}
                accessibilityLabel="Close details"
                wrapperStyle={{ position: 'absolute', right: 8, top: 4 }}
                height={40}
                width={40}
                radius={20}
                fill={C.card}
                border={DICT_BG.pillBorder}
                shoulder={DICT_BG.pillShoulder}
                scaleTo={0.9}
              >
                <ChevronDown size={22} color={C.heading} strokeWidth={ICON_STROKE} />
              </RaisedButton>
            </View>
          </View>

          <View style={{ borderBottomWidth: 1, borderColor: C.line }}>
            <View
              accessibilityRole="tablist"
              style={{ flexDirection: 'row', width: '100%', maxWidth: contentMaxWidth + 40, alignSelf: 'center', paddingHorizontal: 12 }}
            >
              {tabs.map((tab) => {
                const active = tab.key === current?.key
                const Icon = tab.icon
                const tint = active ? C.greenDark : C.muted
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      if (!active) tapHaptic()
                      setActiveTab(tab.key)
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={tab.label}
                    style={{ flex: 1, alignItems: 'center', paddingTop: 6 }}
                  >
                    <Icon size={20} color={tint} strokeWidth={active ? 2.2 : 1.8} />
                    <Text
                      style={{
                        marginTop: 3,
                        fontFamily: active ? 'NunitoBold' : 'Nunito',
                        fontSize: 13,
                        lineHeight: 18,
                        color: tint,
                      }}
                    >
                      {tab.label}
                    </Text>
                    <View
                      style={{
                        marginTop: 7,
                        height: 3,
                        width: '86%',
                        borderRadius: 2,
                        backgroundColor: active ? C.green : 'transparent',
                      }}
                    />
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Keyed on the tab, so a new tab starts at its top. */}
          <ScrollView
            key={current?.key}
            style={{ flex: 1 }}
            scrollEnabled={expanded}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: bottomInset + 24 }}
          >
            <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>{current?.render()}</View>
          </ScrollView>
        </Animated.View>

        {/* ---- Closed: the pull tab ---- */}
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: peekOpacity }}
          pointerEvents={expanded ? 'none' : 'auto'}
        >
          <TourTarget id="word-sheet" radius={SHEET_RADIUS}>
            <View {...pan.panHandlers} style={webGrab}>
              <Pressable
                onPress={toggle}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={`Shows ${hints.join(', ') || 'more details'}`}
                accessibilityState={{ expanded }}
                aria-expanded={expanded}
                style={{ height: SHEET_PEEK, alignItems: 'center', paddingTop: 10, paddingHorizontal: 20 }}
              >
                <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.handle }} />
                {/* The label and its hints, centred under the handle. */}
                <View style={{ marginTop: 12, alignItems: 'center', maxWidth: '100%' }}>
                  <View style={{ alignItems: 'center', maxWidth: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: C.heading, includeFontPadding: false }}>
                        {label}
                      </Text>
                      <Animated.View style={{ transform: [{ rotate: chevron }] }}>
                        <ChevronUp size={18} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
                      </Animated.View>
                    </View>
                    {hints.length > 0 && (
                      <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: 'Nunito', fontSize: 13, lineHeight: 18, color: C.muted, textAlign: 'center' }}>
                        {hints.join(' · ')}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            </View>
          </TourTarget>
        </Animated.View>
      </Animated.View>
    </>
  )
}
