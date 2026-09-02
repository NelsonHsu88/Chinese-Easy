import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Check, X, HelpCircle } from 'lucide-react-native'
import {
  onbColors as c,
  onbSpacing as s,
  onbType as t,
  onbShadow,
  onbCta,
  onbRadius,
  onbMotion,
  onbVerdict,
  type VerdictKind,
} from './tokens'
import { tickHaptic } from '../../lib/haptics'
import { hanziFont } from '../../lib/hanzi'
import type { ScriptMode } from '../../types'

/*
 * The onboarding building blocks.
 *
 * Two standing rules of this codebase apply to everything animated here: React
 * Native's own `Animated` rather than Reanimated (whose loop does not drive on
 * this web target), and plain styles on an `Animated.View` with the Tailwind
 * classes moved to a plain `View` inside it, because NativeWind drops
 * `className` on an animated view.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** The design viewport. Wider screens centre the column rather than stretch it. */
export const ONB_CONTENT_MAX = 430

/**
 * The two curves the flow moves on.
 *
 * `ARRIVE` is a long-tailed decelerate — it covers most of its distance early
 * and then eases the last few points home, which is what stops a staggered
 * cascade of six elements looking like six separate slides. `DEPART`
 * accelerates instead: a page that leaves at a constant speed reads as being
 * dragged, one that gathers pace reads as having gone.
 */
const ARRIVE = Easing.bezier(0.22, 1, 0.36, 1)
const DEPART = Easing.in(Easing.cubic)

/**
 * The welcome screen's original curve, kept as its own constant rather than
 * built inline at the default — `easing` is an effect dependency, so a fresh
 * function every render would restart the animation on every render.
 */
const SETTLE = Easing.out(Easing.cubic)

// --- Entrance -----------------------------------------------------------------

export type SlideFrom = 'left' | 'right' | 'bottom'

/**
 * Slides its children in from one edge while fading up from nothing.
 *
 * Used to assemble the welcome screen a piece at a time — branch from the
 * left, mountains from the right, mascot and buttons up from the bottom. One
 * shared easing (`Easing.out(Easing.cubic)`) gives every piece the same
 * decelerating arrival, which is what makes a staggered entrance read as one
 * movement rather than several unrelated ones.
 *
 * `fill` puts the wrapper on `position: absolute; inset: 0` so it can carry
 * absolutely-positioned scenery: translating the wrapper moves the art inside
 * it without either of them needing to know the other's coordinates.
 *
 * It plays once, on mount. Nothing here loops.
 */
export function SlideIn({
  from,
  delay = 0,
  fill = false,
  distance = onbMotion.enterSlide,
  duration = onbMotion.enter,
  easing = SETTLE,
  style,
  children,
}: {
  from: SlideFrom
  delay?: number
  fill?: boolean
  distance?: number
  duration?: number
  easing?: (value: number) => number
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    animation.start()

    /*
     * A backstop, and not a theoretical one. Without the native driver this
     * animation runs on requestAnimationFrame, which a browser stops dead for a
     * hidden tab — so opening the app in a background tab (or switching away
     * during the splash) leaves every entering piece parked at opacity 0,
     * off-screen, forever. The learner comes back to a blank cream page with a
     * heading floating on it.
     *
     * `setTimeout` keeps running when rAF does not, so this lands the value
     * even if the animation never got a frame. Same defence as the claim
     * animation in `Challenges.tsx`, for the same reason.
     */
    const settle = setTimeout(() => progress.setValue(1), duration + delay + 80)

    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [progress, delay, duration, easing])

  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from === 'left' ? -distance : distance, 0],
  })

  return (
    <Animated.View
      pointerEvents={fill ? 'none' : 'auto'}
      style={[
        fill ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } : null,
        {
          opacity: progress,
          transform: [from === 'bottom' ? { translateY: offset } : { translateX: offset }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

/** Both pages fill the frame, so neither is ever laid out against the other. */
const PAGE_SLOT = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const

/**
 * Hands one onboarding page over to the next.
 *
 * **The arriving page mounts first, and the page being left goes out over the
 * top of it.** It slides off the way the learner is travelling — left on the
 * way forward, right on the way Back — gathering pace and fading as it goes,
 * uncovering the next page already building itself back up out of its own
 * rising pieces (see `OnbRise`).
 *
 * That order is the whole point, and it is not cosmetic. The two halves used to
 * be strictly sequential: empty the screen, *then* mount the next page. Every
 * millisecond that mount cost — a page of cards, icons and artwork, on a phone,
 * in a dev build — was therefore spent looking at bare cream paper, because a
 * page whose every element is inside an entrance wrapper starts at opacity 0
 * and has nothing static to hold the screen. On a slow device that reads as the
 * app having hung. Mounting underneath means the mount happens while the old
 * page is still there, and the exit is driven natively, so it keeps moving
 * smoothly even while the JS thread is busy building what is behind it.
 *
 * The exit is started from an effect *after* the commit that mounts the
 * arriving page, so however long that mount takes, the learner is never looking
 * at nothing: a slow page reads as a beat of delay before the change, rather
 * than as a blank screen in the middle of it.
 *
 * Keeping both pages alive for those few hundred milliseconds needs **two fixed
 * slots** rather than one that swaps its contents. Each page stays in the slot
 * it arrived in, so when the change ends nothing moves position in the tree and
 * nothing remounts — a remount would replay the leaving page's entrance as it
 * slid away, and re-run its effects. The page being left is a stale snapshot
 * (`shown`): the parent's state has already advanced underneath it. Both slots
 * go inert for the duration, which stops a second tap landing on the arriving
 * page's button before the learner can see it.
 *
 * Each page is keyed, so React unmounts the old tree rather than reconciling
 * the two pages into each other. Without that key the pages share component
 * instances at matching tree positions and the entrance effects inside them
 * never re-run — the new page would simply be there.
 *
 * The **first** page deliberately does not animate: it mounts at rest. The
 * welcome screen has its own staged entrance, and playing a page transition
 * underneath it made the whole thing move twice.
 */
export function OnbPageTransition({
  pageKey,
  direction,
  children,
}: {
  pageKey: string
  direction: 'forward' | 'back'
  children: ReactNode
}) {
  const { width } = useWindowDimensions()
  const travel = Math.min(width, ONB_CONTENT_MAX) * onbMotion.exitSlide

  /** Which slot the learner's current page is in, and which page that is. */
  const [front, setFront] = useState<{ slot: 0 | 1; key: string }>({ slot: 0, key: pageKey })
  /** The page on its way out: the slot it stays in is the one `front` isn't. */
  const [leavingKey, setLeavingKey] = useState<string | null>(null)

  /*
   * The tree the front slot last rendered. Kept current while settled, so
   * in-page updates (the placement test's own question-to-question changes)
   * render immediately; frozen during a change, because by then it is the
   * outgoing page and the parent has already moved on.
   */
  const shown = useRef<ReactNode>(children)
  if (pageKey === front.key) shown.current = children
  const leavingNode = useRef<ReactNode>(null)

  const leaving = useRef(new Animated.Value(0)).current

  // The handover: freeze what is on screen, and mount the arriving page beside
  // it in the other slot. Nothing moves yet.
  useEffect(() => {
    if (pageKey === front.key) return
    /*
     * Reset before the commit that marks the slot as leaving, never after. The
     * value is still parked at 1 from the last change, and a slot rendered at
     * that value is a page that blinks out for a frame before it starts to go.
     */
    leaving.setValue(0)
    leavingNode.current = shown.current
    setLeavingKey(front.key)
    setFront({ slot: front.slot === 0 ? 1 : 0, key: pageKey })
  }, [pageKey, front, leaving])

  // ...and only then does the old page go. This effect runs after the commit
  // that mounted the new one, so the mount is already paid for.
  useEffect(() => {
    if (leavingKey === null) return

    const clear = () => {
      leavingNode.current = null
      setLeavingKey(null)
    }

    const animation = Animated.timing(leaving, {
      toValue: 1,
      duration: onbMotion.exit,
      easing: DEPART,
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    animation.start(({ finished }) => {
      if (finished) clear()
    })

    /*
     * Hidden-tab backstop — see `SlideIn`. Without a frame the exit never
     * finishes and its callback never fires, which would leave the page the
     * learner has already left sitting on top of the one they are on.
     */
    const settle = setTimeout(clear, onbMotion.exit + 80)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [leavingKey, leaving])

  const translateX = leaving.interpolate({
    inputRange: [0, 1],
    outputRange: [0, direction === 'back' ? travel : -travel],
  })

  /*
   * The fade is held back so the movement leads it. Fading in step with the
   * slide empties the page before it has visibly gone anywhere, which reads as
   * a dissolve rather than as one screen making way for another.
   */
  const opacity = leaving.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0.86, 0],
  })

  const changing = leavingKey !== null

  /*
   * The cream is laid down here and does not move. Sliding the page carries its
   * own background off with it, which opens a bare stripe down the side the
   * page is leaving towards — the flow reads as content stepping off the paper,
   * not as the paper being pulled away.
   */
  return (
    <View className="flex-1 overflow-hidden" style={{ backgroundColor: c.page }}>
      {([0, 1] as const).map((slot) => {
        const isFront = front.slot === slot
        const key = isFront ? front.key : leavingKey
        const node = isFront ? shown.current : leavingNode.current
        return (
          <Animated.View
            key={slot}
            /*
             * Only the front slot takes touches, and only once the change has
             * settled: the outgoing page is a stale snapshot, and the incoming
             * one is still too faint to aim at. The empty slot must be inert
             * too — an absolutely-filled View is a hit target in React Native
             * whether or not it has anything in it, so left on `auto` it lies
             * over the whole page and swallows every tap.
             */
            pointerEvents={isFront && !changing ? 'auto' : 'none'}
            accessibilityElementsHidden={!isFront}
            importantForAccessibility={isFront ? 'auto' : 'no-hide-descendants'}
            style={[
              PAGE_SLOT,
              // The page being left stays on top and uncovers the other one.
              // The spare slot is empty between changes and stays out of the way.
              isFront || key === null
                ? { zIndex: 0 }
                : { zIndex: 1, opacity, transform: [{ translateX }] },
            ]}
          >
            {key === null ? null : <Fragment key={key}>{node}</Fragment>}
          </Animated.View>
        )
      })}
    </View>
  )
}

// --- Page entrance ------------------------------------------------------------

/**
 * One element of an arriving page, rising into place as it fades up.
 *
 * The whole page is assembled from these: `index` is the element's place in the
 * cascade rather than a raw delay, so re-ordering a page's contents does not
 * mean re-deriving five magic numbers. They run on `ARRIVE`, whose long tail is
 * what makes a column of six staggered elements read as one movement settling
 * instead of six things arriving one after another.
 *
 * `distance={0}` gives a straight fade, which is what a top bar wants — a back
 * chevron sliding up from the bottom of the page draws the eye to the one
 * control the page is not about.
 */
export function OnbRise({
  index = 0,
  delay = 0,
  distance = onbMotion.riseSlide,
  style,
  children,
}: {
  index?: number
  delay?: number
  distance?: number
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  return (
    <SlideIn
      from="bottom"
      distance={distance}
      duration={onbMotion.rise}
      delay={delay + index * onbMotion.riseStagger}
      easing={ARRIVE}
      style={style}
    >
      {children}
    </SlideIn>
  )
}

/**
 * A page's scenery drifting in from the right behind its content.
 *
 * Separate from `OnbRise` because the artwork is not part of the cascade: it
 * comes from the side the page came from, takes longer over it, and is never
 * what the learner is waiting for.
 */
export function OnbArtEnter({
  delay = 0,
  distance = onbMotion.artSlide,
  children,
}: {
  delay?: number
  distance?: number
  children: ReactNode
}) {
  return (
    <SlideIn from="right" fill distance={distance} duration={onbMotion.art} delay={delay} easing={ARRIVE}>
      {children}
    </SlideIn>
  )
}

// --- Page shell ---------------------------------------------------------------

/**
 * The three-region page: a top bar, a flexible middle, and a stable footer.
 *
 * The middle region is the only one that grows, which is the whole point — it
 * absorbs the difference between a 667pt phone and an 844pt one so the call to
 * action sits at the same height on every screen in the flow and does not walk
 * up and down the page as the learner advances.
 *
 * Content lives in a `ScrollView` with `flexGrow: 1` so it fills a tall screen
 * and still scrolls on a short one, rather than collapsing to the height of
 * whatever happens to be on the page.
 */
export function OnbShell({
  top,
  children,
  footer,
  art,
  scroll = true,
}: {
  top?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Decorative layer, drawn behind everything. See `PageArt`. */
  art?: ReactNode
  /**
   * Set false for a page whose middle must not scroll under any circumstance
   * (the placement test, where the card is sized to the space it is given).
   */
  scroll?: boolean
}) {
  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, ONB_CONTENT_MAX)

  const body = (
    <View className="flex-1" style={{ paddingHorizontal: s.screen }}>
      {children}
    </View>
  )

  return (
    <View className="flex-1" style={{ backgroundColor: c.page }}>
      <View className="flex-1 self-center overflow-hidden" style={{ width: columnWidth }}>
        {art}
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          {top ? <View style={{ paddingHorizontal: s.screen }}>{top}</View> : null}

          {scroll ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {body}
            </ScrollView>
          ) : (
            body
          )}

          {footer ? (
            <View style={{ paddingHorizontal: s.screen, paddingBottom: s.md, paddingTop: s.md }}>{footer}</View>
          ) : null}
        </SafeAreaView>
      </View>
    </View>
  )
}

/** Back chevron and an optional right-hand action, on one 44pt row. */
export function OnbTopBar({
  onBack,
  right,
}: {
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <View className="flex-row items-center justify-between" style={{ height: 44 }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={14}
          className="active:opacity-60"
        >
          <ChevronLeft size={26} color={c.navy} strokeWidth={2.4} />
        </Pressable>
      ) : (
        <View />
      )}
      {right ?? <View />}
    </View>
  )
}

/** The "Skip" affordance in the top-right. */
export function OnbSkip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={14} className="active:opacity-60">
      <Text className="font-nunito-bold" style={{ ...t.link, color: c.blue }}>
        Skip
      </Text>
    </Pressable>
  )
}

// --- Type ---------------------------------------------------------------------

/** The page title. Centred on every screen in the reference. */
export function OnbTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="text-center font-nunito-extrabold" style={{ ...t.title, color: c.navy }}>
      {children}
    </Text>
  )
}

/** The supporting line under a title. */
export function OnbBody({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Text
      className="text-center font-nunito-semibold"
      style={[{ ...t.body, color: c.textSecondary }, style as never]}
    >
      {children}
    </Text>
  )
}

// --- Primary call to action ---------------------------------------------------

/**
 * Full-width green pill, in the footer of every screen that has one.
 *
 * The press dip is a scale to 0.975 and a spring back, per the spec — small
 * enough to feel like the button gave way under a finger rather than like it
 * moved.
 */
export function OnbButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string
  icon?: ReactNode
  onPress: () => void
  disabled?: boolean
}) {
  const press = useRef(new Animated.Value(0)).current
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] })

  const down = () =>
    Animated.timing(press, {
      toValue: 1,
      duration: onbMotion.press,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()

  const up = () =>
    Animated.spring(press, {
      toValue: 0,
      damping: 14,
      stiffness: 320,
      mass: 0.6,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.45 : 1 }}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : down}
        onPressOut={disabled ? undefined : up}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        className="flex-row items-center justify-center"
        style={{
          height: onbCta.height,
          borderRadius: onbCta.radius,
          backgroundColor: c.green,
          gap: s.sm,
        }}
      >
        <Text className="font-nunito-extrabold text-white" style={{ fontSize: t.button.fontSize }}>
          {label}
        </Text>
        {icon}
      </Pressable>
    </Animated.View>
  )
}

/** The quieter action under a primary CTA ("Maybe later", "Log in"). */
export function OnbTextButton({
  label,
  onPress,
  tone = 'green',
}: {
  label: string
  onPress: () => void
  tone?: 'green' | 'muted'
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={10} className="items-center active:opacity-60">
      <Text
        className="font-nunito-bold"
        style={{ fontSize: 15, color: tone === 'green' ? c.greenDark : c.textMuted }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// --- Text input ---------------------------------------------------------------

/**
 * A labelled field, for the details the account step collects.
 *
 * The label sits above the box rather than inside it as a placeholder: a
 * placeholder disappears the moment someone starts typing, which is exactly
 * when they are most likely to want to check what was being asked for. The
 * placeholder is left for an *example* of the answer.
 *
 * The border greens on focus and nothing else moves — the box does not grow,
 * shift, or gain a shadow, so a two-field form does not jump every time the
 * learner moves between them.
 */
export function OnbTextField({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  autoComplete,
  maxLength,
  hint,
}: {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  autoCapitalize?: 'none' | 'sentences' | 'words'
  keyboardType?: 'default' | 'email-address'
  autoComplete?: 'username' | 'email'
  maxLength?: number
  /** A quiet note under the box — why the field is being asked for. */
  hint?: string
}) {
  const [focused, setFocused] = useState(false)

  return (
    <View>
      <Text
        className="font-nunito-bold"
        style={{ fontSize: 13, color: c.textSecondary, marginBottom: 6, marginLeft: 2 }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        maxLength={maxLength}
        accessibilityLabel={label}
        className="font-nunito-semibold"
        style={{
          height: 52,
          borderRadius: onbRadius.card,
          borderWidth: 1.5,
          borderColor: focused ? c.green : c.border,
          backgroundColor: c.card,
          paddingHorizontal: s.lg,
          fontSize: 15.5,
          color: c.navy,
          // Web only, and worth setting explicitly: react-native-web maps a
          // focused TextInput onto the browser's default focus ring, which is a
          // blue halo from another design system entirely.
          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
        }}
      />
      {hint ? (
        <Text
          className="font-nunito-semibold"
          style={{ ...t.footnote, color: c.textMuted, marginTop: 5, marginLeft: 2 }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

// --- Cards --------------------------------------------------------------------

/** A plain surface: card fill, thin border, the one soft shadow. */
export function OnbCard({
  children,
  style,
  radius = onbRadius.cardLarge,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  radius?: number
}) {
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius,
          ...onbShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export type OnbTone = 'green' | 'coral' | 'blue' | 'gold'

const TONE: Record<OnbTone, { solid: string; soft: string }> = {
  green: { solid: c.green, soft: c.greenSoft },
  coral: { solid: c.coral, soft: c.coralSoft },
  blue: { solid: c.blue, soft: c.blueSoft },
  gold: { solid: c.gold, soft: c.goldSoft },
}

export function toneColors(tone: OnbTone) {
  return TONE[tone]
}

/**
 * A selectable option — the goal screen's four cards.
 *
 * The selected state crossfades over 180ms rather than switching instantly: at
 * this size an abrupt fill change reads as a glitch. The fill is animated as an
 * overlay rather than by interpolating `backgroundColor`, so the card keeps its
 * border and shadow underneath.
 */
export function OnbChoiceCard({
  title,
  body,
  icon,
  tone,
  selected,
  onPress,
  height = 90,
}: {
  title: string
  body: string
  icon: ReactNode
  tone: OnbTone
  selected: boolean
  onPress: () => void
  height?: number
}) {
  const fill = useRef(new Animated.Value(selected ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(fill, {
      toValue: selected ? 1 : 0,
      duration: onbMotion.select,
      // The border colour below can't run on the native driver, and both halves
      // must share a driver or they desynchronise.
      useNativeDriver: false,
    }).start()
  }, [selected, fill])

  const borderColor = fill.interpolate({ inputRange: [0, 1], outputRange: [c.border, c.green] })

  return (
    <Animated.View
      style={{
        borderRadius: onbRadius.card,
        borderWidth: 1.5,
        borderColor: borderColor as unknown as string,
        backgroundColor: c.card,
        overflow: 'hidden',
        ...onbShadow,
      }}
    >
      <Animated.View
        style={{ position: 'absolute', inset: 0, backgroundColor: c.greenSoft, opacity: fill }}
      />
      <Pressable
        onPress={() => {
          tickHaptic()
          onPress()
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={title}
        className="flex-row items-center active:opacity-90"
        style={{ height, paddingHorizontal: s.lg, gap: s.md }}
      >
        <View
          className="items-center justify-center"
          style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: TONE[tone].soft }}
        >
          {icon}
        </View>
        <View className="flex-1">
          <Text className="font-nunito-bold" style={{ ...t.cardTitle, color: c.navy }}>
            {title}
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.textSecondary, marginTop: 2 }}>
            {body}
          </Text>
        </View>
        <Radio selected={selected} />
      </Pressable>
    </Animated.View>
  )
}

/**
 * One of the two script tiles on the Character Script page.
 *
 * A different shape from `OnbChoiceCard` — a tall tile with the glyph as its
 * subject rather than a row with an icon beside a label — because the character
 * *is* the question here. Someone who cannot yet read either script decides this
 * by looking at 學 next to 学, so the two glyphs need to be big, adjacent and
 * directly comparable.
 *
 * The selected/unselected treatment is the same animation the choice cards use
 * (a mint fill and a jade border crossfading on one non-native driver, since
 * border colour cannot run on the native one and the two halves must not
 * desynchronise), so both selections feel like the same control.
 */
export function OnbScriptCard({
  glyph,
  script,
  label,
  body,
  selected,
  onPress,
}: {
  glyph: string
  /** Which face draws `glyph`. 學 must not be drawn through the SC font, or vice versa. */
  script: ScriptMode
  label: string
  body: string
  selected: boolean
  onPress: () => void
}) {
  const fill = useRef(new Animated.Value(selected ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(fill, {
      toValue: selected ? 1 : 0,
      duration: onbMotion.select,
      useNativeDriver: false,
    }).start()
  }, [selected, fill])

  const borderColor = fill.interpolate({ inputRange: [0, 1], outputRange: [c.border, c.green] })

  return (
    <Animated.View
      style={{
        flex: 1,
        borderRadius: onbRadius.cardLarge,
        borderWidth: 1.5,
        borderColor: borderColor as unknown as string,
        backgroundColor: c.card,
        overflow: 'hidden',
        ...onbShadow,
      }}
    >
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: c.greenSoft, opacity: fill }} />
      <Pressable
        onPress={() => {
          // Only on a real change. Re-tapping the selected card is a no-op, and
          // a tick for nothing teaches people to distrust the feel.
          if (!selected) tickHaptic()
          onPress()
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label} Chinese, ${selected ? 'selected' : 'not selected'}`}
        accessibilityHint={body}
        className="active:opacity-90"
        style={{ paddingHorizontal: s.md, paddingTop: s.lg, paddingBottom: s.md }}
      >
        {/*
          The glyph. Sized in the component rather than by the tile so the two
          cards' characters share a baseline whatever their labels do — 學 and 学
          have very different stroke counts and the eye reads any mismatch as one
          card being bigger than the other.
        */}
        <Text
          className={hanziFont(script)}
          style={{ fontSize: 62, lineHeight: 78, color: c.navy, textAlign: 'center' }}
        >
          {glyph}
        </Text>

        <Text
          className="font-nunito-bold"
          style={{ ...t.cardTitle, color: selected ? c.greenDark : c.navy, textAlign: 'center', marginTop: s.sm }}
        >
          {label}
        </Text>
        <Text
          className="font-nunito-semibold"
          style={{ ...t.cardBody, color: c.textSecondary, textAlign: 'center', marginTop: 4 }}
        >
          {body}
        </Text>

        {/* Bottom-right, as drawn. A tick rather than the `Radio` dot: this is a
            choice you commit to, and a filled tick reads as done. */}
        <View className="mt-2 flex-row justify-end">
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 26,
              height: 26,
              borderWidth: selected ? 0 : 2,
              borderColor: c.dotInactive,
              backgroundColor: selected ? c.green : 'transparent',
            }}
          >
            {selected && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

/** The filled-ring selection indicator used by choice cards and quiz answers. */
export function Radio({ selected, size = 22 }: { selected: boolean; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        borderColor: selected ? c.green : c.dotInactive,
      }}
    >
      {selected && (
        <View
          className="rounded-full"
          style={{ width: size * 0.45, height: size * 0.45, backgroundColor: c.green }}
        />
      )}
    </View>
  )
}

// --- Result toast -------------------------------------------------------------

const VERDICT_COPY: Record<VerdictKind, string> = {
  correct: 'Correct',
  incorrect: 'Incorrect',
  unsure: "No problem — we'll come back to it",
}

/**
 * The verdict on a confirmed placement answer.
 *
 * Rises into place under the question rather than appearing, so the eye is
 * carried to it instead of having to find it. It is keyed by verdict in the
 * screen, which remounts it per answer — that is what re-runs the entrance on
 * every question instead of only the first.
 *
 * The wording for `unsure` is deliberately not "Wrong". The learner pressed a
 * button that said they didn't know, and answering that honestly is worth
 * more to the placement estimate than a lucky guess; telling them off for it
 * teaches them to guess next time.
 */
export function ResultToast({ verdict, detail }: { verdict: VerdictKind; detail?: string }) {
  const tone = onbVerdict[verdict]
  const rise = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.timing(rise, {
      toValue: 1,
      duration: onbMotion.toast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    animation.start()
    // Same hidden-tab backstop as `SlideIn` — a verdict the learner cannot see
    // is worse here than a missed animation, since the Next button beside it
    // implies something was said.
    const settle = setTimeout(() => rise.setValue(1), onbMotion.toast + 80)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [rise])

  const Icon = verdict === 'correct' ? Check : verdict === 'incorrect' ? X : HelpCircle

  return (
    <Animated.View
      style={{
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <View
        className="flex-row items-center"
        style={{
          backgroundColor: tone.fill,
          borderColor: tone.border,
          borderWidth: 1,
          borderRadius: onbRadius.card,
          paddingHorizontal: s.lg,
          paddingVertical: s.md,
          gap: s.md,
        }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 26, height: 26, backgroundColor: tone.accent }}
        >
          <Icon size={15} color="#ffffff" strokeWidth={3} />
        </View>
        <View className="flex-1">
          <Text className="font-nunito-extrabold" style={{ fontSize: 14.5, color: tone.text }}>
            {VERDICT_COPY[verdict]}
          </Text>
          {detail ? (
            <Text className="font-nunito-semibold" style={{ fontSize: 12.5, color: tone.text, marginTop: 1 }}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  )
}

/**
 * "I don't know" — an out, so an unknown word costs a guess rather than
 * inviting one. A guessed-right answer tells the placement estimate the
 * learner knows a word they don't, which starts them above their level.
 */
export function DontKnowButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="I don't know this word"
      className="flex-row items-center justify-center active:opacity-70"
      style={{
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
        gap: s.sm,
      }}
    >
      <HelpCircle size={17} color={c.textMuted} strokeWidth={2.3} />
      <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.textSecondary }}>
        I don't know
      </Text>
    </Pressable>
  )
}

// --- Progress -----------------------------------------------------------------

/** The dots at the foot of the welcome and goal screens. */
export function OnbDots({ index, total }: { index: number; total: number }) {
  return (
    <View className="flex-row items-center justify-center" style={{ gap: s.sm }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className="rounded-full"
          style={{
            width: i === index ? 9 : 7,
            height: i === index ? 9 : 7,
            backgroundColor: i === index ? c.green : c.dotInactive,
          }}
        />
      ))}
    </View>
  )
}

