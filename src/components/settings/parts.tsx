import { useMemo, useRef, type ComponentType, type ReactNode } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Image,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import { ArrowLeft, ChevronRight, Check } from 'lucide-react-native'
import { useScreenTransition, LeaveProvider } from './transition'
import { ShadowRevealProvider, ShadowSurface, useRevealedShadow } from '../shadowReveal'
import {
  setColors as c,
  setSpacing as s,
  setType as t,
  setRadius,
  setShadow,
  setRow,
  setMotion,
  SET_CONTENT_MAX,
} from './tokens'
import { tapHaptic, tickHaptic } from '../../lib/haptics'
import { playTints, type PlayHue } from '../dashboard/tokens'
import { useScrollToTopOnFocus } from '../useScrollToTopOnFocus'
import { TourScrollContext } from '../tour/targets'

/*
 * The Settings screen's building blocks.
 *
 * Two standing rules of this codebase apply to everything animated here:
 * React Native's own `Animated` rather than Reanimated (whose update loop does
 * not drive on this project's web target), and plain styles on an
 * `Animated.View` with Tailwind classes moved to a plain `View` inside it,
 * because NativeWind drops `className` on an animated view.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** Cropped from the SS104 reference by `scripts/processSettingsArt.mjs`. */
export const SETTINGS_ART = {
  sakura: { source: require('../../assets/images/settings/sakura.png'), ratio: 301 / 222 },
  foot: { source: require('../../assets/images/settings/foot.png'), ratio: 941 / 220 },
} as const

// --- Press response -----------------------------------------------------------

/**
 * The screen's one press behaviour: a very small dip and a spring back.
 *
 * Half the depth of the Dashboard's, on purpose. A card offering an activity
 * can afford to feel springy; a settings row is a door, and a door that
 * flinches reads as unstable rather than responsive.
 */
export function PressRow({
  onPress,
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  onPress?: () => void
  children: ReactNode
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  accessibilityHint?: string
}) {
  const press = useRef(new Animated.Value(0)).current
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, setMotion.pressScale] })

  if (!onPress) return <View style={style}>{children}</View>

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          tapHaptic()
          onPress()
        }}
        onPressIn={() =>
          Animated.timing(press, {
            toValue: 1,
            duration: setMotion.press,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(press, {
            toValue: 0,
            damping: 15,
            stiffness: 300,
            mass: 0.6,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start()
        }
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

// --- Page shells --------------------------------------------------------------

/**
 * The ivory page the Settings hub sits on.
 *
 * The column is capped at the design width and centred, matching `ReadingShell`
 * and the Dashboard — uncapped, a desktop browser stretches a settings row until
 * its value chip is half a metre from the label it belongs to.
 *
 * The hub scrolls. It used to squeeze its rows to fit one screen, which on a
 * phone left everything cramped; now every row and gap keeps its designed size
 * and the page simply scrolls when it is taller than the viewport. `foot` is
 * laid out in flow after the content, behind a flexible spacer, so on a tall
 * screen it still lands at the bottom of the page rather than mid-way down.
 */
export function SettingsShell({
  children,
  transitionStyle,
  shadow,
  foot,
}: {
  children: ReactNode
  /**
   * The transition style from `useScreenTransition`, applied to the content
   * only. The ivory page and the tab bar stay put — that is what makes opening
   * a category read as this screen rearranging rather than as a page turn.
   */
  transitionStyle?: Animated.WithAnimatedObject<ViewStyle>
  /** `useScreenTransition`'s shadow value — the cards' shadows settle in on it. */
  shadow?: Animated.Value
  /** Decoration that ends the page (the foot range), pushed to the bottom on a tall screen. */
  foot?: ReactNode
}) {
  const { width } = useWindowDimensions()
  const column = Math.min(width, SET_CONTENT_MAX)

  /* This screen stays mounted behind every category pushed on top of it, so
     without this a learner comes back from Reminders to wherever their last
     scroll ended rather than to the top of Settings. */
  const scroll = useScrollToTopOnFocus()

  /* Shifu's Settings guide points at the lower cards, which start below the
     fold on a short phone — so it can ask for a scroll. Tracked, not read back. */
  const scrollY = useRef(0)
  const tourScrollBy = useMemo(
    () => (dy: number) => scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: true }),
    [scroll],
  )

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scroll}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        /* iOS bounces a vertical ScrollView even when its content fits, which
           makes a page that fits feel like one that scrolls. */
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
      >
        {/* Plain styles on the animated view, content in a plain View inside it
            — NativeWind drops `className` on an `Animated.View` entirely.
            `needsOffscreenAlphaCompositing`: the cards inside carry their own
            `elevation` shadow (`setShadow`), and without this Android fades
            each one's shadow and its fill as separate overlapping layers —
            the shadow reads as arriving before the card. See the same fix on
            Dictionary's `FadeSection` and the Dashboard's `Reveal`. */}
        <Animated.View style={[{ width: column, flexGrow: 1 }, transitionStyle]} needsOffscreenAlphaCompositing>
          <ShadowRevealProvider value={shadow ?? null}>
            <TourScrollContext.Provider value={tourScrollBy}>
              <View style={{ flexGrow: 1 }}>
                {children}
                <View style={{ flexGrow: 1 }} />
                {foot}
              </View>
            </TourScrollContext.Provider>
          </ShadowRevealProvider>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * A detail screen: back arrow, its own title, then the controls.
 *
 * The back arrow is guarded rather than a bare `router.back()`. A screen reached
 * by deep link or as the first entry after a full web reload has nothing to pop,
 * and `back()` then silently does nothing — an arrow that looks fine and is
 * simply inert.
 */
const DETAIL_SAKURA_SHARE = 0.2

export function DetailShell({ title, children }: { title: string; children: ReactNode }) {
  const { width } = useWindowDimensions()
  const column = Math.min(width, SET_CONTENT_MAX)
  const { style, shadow, leave } = useScreenTransition()

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      {/*
        The navigator's own transition is switched off for these routes so this
        screen's animation is the only one playing. Left on, a native build
        would slide the whole page in from the right *and* run the content
        animation inside it — two transitions at different speeds, which reads
        as a stutter rather than as either one.
      */}
      <Stack.Screen options={{ animation: 'none' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: s.xxxl }}
      >
        {/* `needsOffscreenAlphaCompositing`: same reason as `SettingsShell`
            above — the cards this transition fades in carry their own
            `elevation` shadow. */}
        <Animated.View style={[{ width: column }, style]} needsOffscreenAlphaCompositing>
          <View style={{ paddingHorizontal: s.screen }}>
            {/* A small branch over the corner, so a detail screen belongs to
                the hub it came from rather than reading as a bare form. */}
            <SakuraCorner width={column * DETAIL_SAKURA_SHARE} />
            <View className="flex-row items-center" style={{ paddingTop: s.md, gap: s.md }}>
              <Pressable
                onPress={() =>
                  leave(() => (router.canGoBack() ? router.back() : router.replace('/settings')))
                }
                accessibilityRole="button"
                accessibilityLabel="Back to Settings"
                hitSlop={10}
                className="items-center justify-center rounded-full active:opacity-60"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: playTints.jade.fill,
                  borderWidth: 1,
                  borderColor: playTints.jade.border,
                }}
              >
                <ArrowLeft size={20} color={playTints.jade.text} strokeWidth={2.4} />
              </Pressable>
              <Text className="font-nunito-extrabold" style={{ ...t.detailTitle, color: c.navy }}>
                {title}
              </Text>
            </View>

            {/* Anything nested that navigates on further reaches the same exit
                through here, rather than cutting straight to the next screen. */}
            <LeaveProvider value={leave}>
              <ShadowRevealProvider value={shadow}>
                <View style={{ marginTop: s.xl, gap: s.xl }}>{children}</View>
              </ShadowRevealProvider>
            </LeaveProvider>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

// --- Decoration ---------------------------------------------------------------

/**
 * The sakura branch in the top-right corner, cropped from the reference.
 *
 * Absolutely positioned and `pointerEvents="none"`: decoration must cost no
 * layout height, or the title below it walks down the page, and it must never
 * swallow a tap meant for the card it overhangs. It bleeds off the column's
 * right edge, as the reference's does.
 *
 * Its height is derived from the source ratio. React Native does not size an
 * `Image` from its intrinsic dimensions the way a browser does — a width with
 * no height lays out at zero and the artwork silently vanishes.
 */
export function SakuraCorner({ width }: { width: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: -s.screen }}>
      <Image
        source={SETTINGS_ART.sakura.source}
        style={{ width, height: width / SETTINGS_ART.sakura.ratio }}
        resizeMode="contain"
      />
    </View>
  )
}

/** Height of the foot painting at a given column width. */
export function footHeight(column: number) {
  return column / SETTINGS_ART.foot.ratio
}

/**
 * The misty range and trees along the foot of the page, cropped from the
 * reference with the last card's edge faded out of it.
 *
 * In flow at the end of the page (`SettingsShell`'s `foot`), so it scrolls
 * with the content and can never sit underneath a card.
 */
export function FootRange() {
  const { width } = useWindowDimensions()
  const column = Math.min(width, SET_CONTENT_MAX)

  return (
    <View pointerEvents="none" style={{ width: column, height: footHeight(column) }}>
      <Image source={SETTINGS_ART.foot.source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </View>
  )
}

// --- Type ---------------------------------------------------------------------

/** "Study", "Account & App". Aligned to the same margin as the cards under it. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <Text className="font-lora-bold" accessibilityRole="header" style={{ ...t.section, fontFamily: 'LoraBold', color: c.navy }}>
      {children}
    </Text>
  )
}

/** The explanation under a control on a detail screen. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <Text className="font-nunito-semibold" style={{ ...t.hint, color: c.textMuted }}>
      {children}
    </Text>
  )
}

// --- Cards --------------------------------------------------------------------

/**
 * The warm-white surface everything on this screen is built from.
 *
 * A fill plus a hairline border rather than a fill plus a shadow: the border is
 * what separates warm white from warm ivory, which a shadow at this weight
 * cannot do on its own.
 */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  /* Settles in on the shell's transition — see `useScreenTransition`'s `shadow`.
     An `Animated.View` so it can carry the interpolated values. */
  const shadow = useRevealedShadow(setShadow)
  return (
    <Animated.View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: setRadius.card,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
          ...shadow,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

/**
 * A group of rows that belong to one card.
 *
 * The separators are drawn here rather than by each row, so the last row cannot
 * end up with a trailing line under it — the single most common way a grouped
 * list ends up looking almost right. They start at the rows' text margin and
 * run to the card's edge, as the reference draws them.
 */
export function GroupCard({ children }: { children: ReactNode }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : [children]

  return (
    <Card>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 && (
            <View
              style={{
                height: 1,
                marginLeft: HUB_ROW_PADDING,
                backgroundColor: c.separator,
              }}
            />
          )}
          {row}
        </View>
      ))}
    </Card>
  )
}

/** A row's tinted circular icon. One icon family throughout — Lucide. */
export function IconCircle({
  icon: Icon,
  tint,
  color,
  size = setRow.icon,
}: {
  icon: ComponentType<{ color: string; size: number; strokeWidth: number }>
  tint: string
  color: string
  size?: number
}) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: tint }}
    >
      <Icon color={color} size={Math.round(size * 0.47)} strokeWidth={2.1} />
    </View>
  )
}

/** A hub row's horizontal padding: 44 of the reference's 941px. */
export const HUB_ROW_PADDING = 20
/**
 * On a phone narrower than 400pt the full padding leaves "Script, phonetics and
 * study options" no room beside its "Pinyin" summary and it ends in an
 * ellipsis; there the padding and the description step down a little instead.
 */
const HUB_NARROW_BELOW = 400
const HUB_ROW_PADDING_NARROW = 16

/**
 * One navigation row on the hub: title over description, an optional summary
 * of the current state, and a chevron. No icon — the reference dropped them, and
 * the serif titles carry the row on their own.
 *
 * The summary is the reason this screen can be this quiet. A row that says
 * "Reminders · Notifications are off · Off" has already answered the question
 * most people opened Settings to ask, so the detail screen behind it is for
 * changing the answer rather than for finding it.
 *
 * `height` is the hub's fixed row height.
 */
export function NavRow({
  title,
  subtitle,
  value,
  height,
  onPress,
  icon,
  hue,
}: {
  title: string
  subtitle: string
  value?: string
  height: number
  onPress: () => void
  /** SS1017's playful pass: a tinted icon disc leading the row. */
  icon?: ComponentType<{ color: string; size: number; strokeWidth: number }>
  hue?: PlayHue
}) {
  const tint = playTints[hue ?? 'jade']
  const { width } = useWindowDimensions()
  const narrow = Math.min(width, SET_CONTENT_MAX) < HUB_NARROW_BELOW
  return (
    <PressRow
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={value ? `${subtitle}. Currently ${value}` : subtitle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height,
        paddingHorizontal: narrow ? HUB_ROW_PADDING_NARROW : HUB_ROW_PADDING,
      }}
    >
      {icon && (
        <View style={{ marginRight: narrow ? s.md : s.lg }}>
          <IconCircle icon={icon} tint={tint.soft} color={tint.ink} size={narrow ? 36 : 40} />
        </View>
      )}
      {/* Families in the style objects as well as the classes: on Android
          NativeWind can drop a class-derived style from some rows and not
          others, and a row that loses it falls back to the system face — the
          hub's rows came out in visibly different fonts. A style object is
          applied by React Native itself. */}
      <View style={{ flex: 1, marginRight: s.sm }}>
        <Text
          className="font-lora-bold"
          numberOfLines={1}
          style={{ ...t.rowTitle, fontFamily: 'LoraBold', color: c.navy }}
        >
          {title}
        </Text>
        <Text
          className="font-nunito-semibold"
          numberOfLines={1}
          style={{
            ...t.rowSubtitle,
            ...(narrow ? { fontSize: 12.5 } : null),
            fontFamily: 'NunitoSemiBold',
            color: c.textSecondary,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      </View>

      {value ? (
        <Text
          className="font-nunito-bold"
          style={{ ...t.rowValue, fontFamily: 'NunitoBold', color: icon ? tint.text : c.greenDark, marginRight: narrow ? s.sm : s.md }}
        >
          {value}
        </Text>
      ) : null}
      <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
    </PressRow>
  )
}

// --- Controls (detail screens) ------------------------------------------------

/** A titled card of controls. The heading sits outside the card, like a section. */
/**
 * Which hue each control group wears (SS1017's playful pass). Keyed by title so
 * the detail screens need no change, and the same group always has the same
 * colour; anything unlisted is jade.
 */
const GROUP_HUES: Record<string, PlayHue> = {
  Feedback: 'honey',
  Help: 'sky',
  Appearance: 'lilac',
  Account: 'blossom',
  'Ad-free subscription': 'lilac',
  'Built with': 'sky',
  'Daily practice': 'honey',
  'Daily target': 'jade',
  "Why you're here": 'blossom',
  Level: 'sky',
  'Language & script': 'sky',
  'Review & study': 'jade',
  'Your deck': 'jade',
  'Level and XP': 'honey',
  'First run': 'sky',
  'Restore progress': 'blossom',
  'Simulated clock': 'lilac',
}

export function ControlGroup({ title, children, hue }: { title: string; children: ReactNode; hue?: PlayHue }) {
  const tint = playTints[hue ?? GROUP_HUES[title] ?? 'jade']
  return (
    <View style={{ gap: s.md }}>
      <View className="flex-row items-center" style={{ gap: s.sm }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint.ink }} />
        <Text
          className="font-nunito-extrabold"
          accessibilityRole="header"
          style={{ ...t.groupTitle, color: tint.text, textTransform: 'uppercase' }}
        >
          {title}
        </Text>
      </View>
      <Card style={{ padding: setRow.padding, gap: s.xl, borderColor: tint.border }}>{children}</Card>
    </View>
  )
}

/** A labelled control: name and optional explanation, then whatever it controls. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <View style={{ gap: s.sm }}>
      <Text className="font-nunito-bold" style={{ ...t.rowTitle, color: c.navy }}>
        {label}
      </Text>
      {hint ? <Hint>{hint}</Hint> : null}
      <View style={{ marginTop: s.xs }}>{children}</View>
    </View>
  )
}

/**
 * A vertical list of choices, one per line, with a tick on the chosen one.
 *
 * Chosen over a segmented control for anything with a real explanation to give.
 * A segment is a word wide, so "Recognition" and "Production" arrive as two
 * words the learner is expected to already understand; a row has space for the
 * sentence that tells them which one they want.
 */
export function ChoiceList<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; hint?: string }[]
}) {
  return (
    <View style={{ gap: s.sm }}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              tickHaptic()
              onChange(option.value)
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            className="flex-row items-center active:opacity-70"
            style={{
              paddingVertical: s.md,
              paddingHorizontal: s.lg,
              borderRadius: setRadius.inner,
              borderWidth: 1.5,
              borderColor: selected ? c.green : c.border,
              backgroundColor: selected ? c.greenSoft : c.background,
              gap: s.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                className={selected ? 'font-nunito-extrabold' : 'font-nunito-semibold'}
                style={{ fontSize: 15, lineHeight: 20, color: selected ? c.greenDark : c.navy }}
              >
                {option.label}
              </Text>
              {option.hint ? (
                <Text
                  className="font-nunito-semibold"
                  style={{ ...t.hint, color: c.textSecondary, marginTop: 2 }}
                >
                  {option.hint}
                </Text>
              ) : null}
            </View>
            {selected ? (
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 22, height: 22, backgroundColor: c.green }}
              >
                <Check size={13} color="#FFFFFF" strokeWidth={3.4} />
              </View>
            ) : (
              <View
                className="rounded-full"
                style={{ width: 22, height: 22, borderWidth: 1.5, borderColor: c.border }}
              />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

/** The switch. One shape for every boolean in the app's settings. */
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <Pressable
      onPress={() => {
        tickHaptic()
        onChange(!value)
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={8}
      className="justify-center rounded-full"
      style={{
        width: 50,
        height: 30,
        paddingHorizontal: 3,
        backgroundColor: value ? c.green : c.neutralTrack,
      }}
    >
      <ShadowSurface shadow={setShadow}
        style={[{ borderRadius: 9999 }, {
          width: 24,
          height: 24,
          backgroundColor: '#FFFFFF',
          marginLeft: value ? 20 : 0,
        }]}
      />
    </Pressable>
  )
}

/** A row whose control sits at the right — a toggle, a value, a small button. */
export function InlineRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <View className="flex-row items-center" style={{ gap: s.lg }}>
      <View style={{ flex: 1 }}>
        <Text className="font-nunito-bold" style={{ ...t.rowTitle, color: c.navy }}>
          {label}
        </Text>
        {hint ? <View style={{ marginTop: 2 }}><Hint>{hint}</Hint></View> : null}
      </View>
      {children}
    </View>
  )
}

/**
 * A number with a minus and a plus.
 *
 * Used everywhere a limit is set, in place of the sliders the old screen used.
 * A slider cannot be read back precisely and cannot be nudged by one — both of
 * which are exactly what someone setting "new words per day" is trying to do.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  label: string
}) {
  const button = (direction: -1 | 1, disabled: boolean, Glyph: ReactNode) => (
    <Pressable
      onPress={() => {
        tickHaptic()
        onChange(Math.max(min, Math.min(max, value + direction * step)))
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${direction < 0 ? 'Decrease' : 'Increase'} ${label}`}
      className="items-center justify-center rounded-full active:opacity-60"
      style={{
        width: 36,
        height: 36,
        backgroundColor: c.greenSoft,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {Glyph}
    </Pressable>
  )

  return (
    <View className="flex-row items-center justify-between">
      {button(
        -1,
        value <= min,
        <View style={{ width: 14, height: 2.4, borderRadius: 2, backgroundColor: c.greenDark }} />,
      )}
      <View className="flex-row items-baseline" style={{ gap: 5 }}>
        <Text className="font-nunito-extrabold" style={{ fontSize: 26, lineHeight: 32, color: c.navy }}>
          {value}
        </Text>
        {unit ? (
          <Text className="font-nunito-semibold" style={{ fontSize: 13.5, color: c.textSecondary }}>
            {unit}
          </Text>
        ) : null}
      </View>
      {button(
        1,
        value >= max,
        <View className="items-center justify-center" style={{ width: 14, height: 14 }}>
          <View
            style={{
              position: 'absolute',
              width: 14,
              height: 2.4,
              borderRadius: 2,
              backgroundColor: c.greenDark,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 2.4,
              height: 14,
              borderRadius: 2,
              backgroundColor: c.greenDark,
            }}
          />
        </View>,
      )}
    </View>
  )
}

/** A full-width action. The one button shape on these screens. */
export function ActionButton({
  label,
  onPress,
  icon: Icon,
  tone = 'quiet',
}: {
  label: string
  onPress: () => void
  icon?: ComponentType<{ color: string; size: number; strokeWidth: number }>
  tone?: 'quiet' | 'primary'
}) {
  const primary = tone === 'primary'
  const ink = primary ? '#FFFFFF' : c.textSecondary

  return (
    <Pressable
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center justify-center active:opacity-70"
      style={{
        height: 48,
        borderRadius: 24,
        gap: s.sm,
        backgroundColor: primary ? c.green : c.background,
        borderWidth: primary ? 0 : 1.5,
        borderColor: c.border,
      }}
    >
      {Icon ? <Icon color={ink} size={17} strokeWidth={2.4} /> : null}
      <Text
        className={primary ? 'font-nunito-extrabold' : 'font-nunito-bold'}
        style={{ fontSize: 15, color: ink }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * A setting the app holds but does not let you change, shown rather than
 * hidden.
 *
 * Script is the case this exists for: the app forces Traditional on hydrate, so
 * a picker would be a control that silently does nothing. Saying so is more
 * use to a learner wondering where Simplified went than an empty space is.
 */
export function LockedRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={{ gap: s.xs }}>
      <View className="flex-row items-center justify-between" style={{ gap: s.md }}>
        <Text className="font-nunito-bold" style={{ ...t.rowTitle, color: c.navy }}>
          {label}
        </Text>
        <View
          className="rounded-full"
          style={{ paddingHorizontal: 11, paddingVertical: 5, backgroundColor: c.greenSoft }}
        >
          <Text className="font-nunito-bold" style={{ fontSize: 13, color: c.greenDark }}>
            {value}
          </Text>
        </View>
      </View>
      <Hint>{hint}</Hint>
    </View>
  )
}
