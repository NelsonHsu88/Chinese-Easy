import { useRef, type ComponentType, type ReactNode } from 'react'
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
import { useScrollToTopOnFocus } from '../useScrollToTopOnFocus'

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

export const SETTINGS_ART = {
  sakura: { source: require('../../assets/images/onboarding/sakura-branch.png'), ratio: 560 / 318 },
  mountains: { source: require('../../assets/images/onboarding/mountains-panorama.png'), ratio: 880 / 326 },
  bonsai: { source: require('../../assets/images/dashboard/bonsai.png'), ratio: 290 / 197 },
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
 * The ivory page every Settings screen sits on.
 *
 * The column is capped at the design width and centred, matching `ReadingShell`
 * and the Dashboard — uncapped, a desktop browser stretches a settings row until
 * its value chip is half a metre from the label it belongs to.
 */
export function SettingsShell({
  children,
  bottomInset = s.xxxl,
  transitionStyle,
}: {
  children: ReactNode
  /** Extra room under the last element, above the tab bar. */
  bottomInset?: number
  /**
   * The transition style from `useScreenTransition`, applied to the content
   * only. The ivory page and the tab bar stay put — that is what makes opening
   * a category read as this screen rearranging rather than as a page turn.
   */
  transitionStyle?: Animated.WithAnimatedObject<ViewStyle>
}) {
  const { width } = useWindowDimensions()
  const column = Math.min(width, SET_CONTENT_MAX)

  /* This screen stays mounted behind every category pushed on top of it, so
     without this a learner comes back from Reminders to wherever their last
     scroll ended rather than to the top of Settings. */
  const scroll = useScrollToTopOnFocus()

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: bottomInset }}
      >
        {/* Plain styles on the animated view, content in a plain View inside it
            — NativeWind drops `className` on an `Animated.View` entirely. */}
        <Animated.View style={[{ width: column }, transitionStyle]}>
          <View>{children}</View>
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
export function DetailShell({ title, children }: { title: string; children: ReactNode }) {
  const { width } = useWindowDimensions()
  const column = Math.min(width, SET_CONTENT_MAX)
  const { style, leave } = useScreenTransition()

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
        <Animated.View style={[{ width: column }, style]}>
          <View style={{ paddingHorizontal: s.screen }}>
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
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <ArrowLeft size={20} color={c.navy} strokeWidth={2.4} />
              </Pressable>
              <Text className="font-nunito-extrabold" style={{ ...t.detailTitle, color: c.navy }}>
                {title}
              </Text>
            </View>

            {/* Anything nested that navigates on further reaches the same exit
                through here, rather than cutting straight to the next screen. */}
            <LeaveProvider value={leave}>
              <View style={{ marginTop: s.xl, gap: s.xl }}>{children}</View>
            </LeaveProvider>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

// --- Decoration ---------------------------------------------------------------

/**
 * The sakura branch in the top-right corner.
 *
 * Absolutely positioned and `pointerEvents="none"`: decoration must cost no
 * layout height, or the title below it walks down the page, and it must never
 * swallow a tap meant for the card it overhangs. The render grows
 * left-to-right from a trunk at its bottom-left, so it is mirrored to put the
 * trunk at the screen edge rather than shipping a second copy of the asset.
 *
 * Its height is derived from the source ratio. React Native does not size an
 * `Image` from its intrinsic dimensions the way a browser does — a width with
 * no height lays out at zero and the artwork silently vanishes.
 */
export function SakuraCorner({ width = 152 }: { width?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -6, right: -26, transform: [{ scaleX: -1 }] }}
    >
      <Image
        source={SETTINGS_ART.sakura.source}
        style={{ width, height: width / SETTINGS_ART.sakura.ratio }}
        resizeMode="contain"
      />
    </View>
  )
}

/**
 * The ink-wash range along the foot of the page.
 *
 * In normal flow rather than absolutely positioned, which is the opposite of
 * every other piece of decoration here and is deliberate: this page scrolls, and
 * a range pinned to the bottom of the *viewport* would ride up over the cards on
 * the way past. In flow it stays where the reference puts it — under the last
 * card, above the tab bar — and can never cover a word.
 *
 * It bleeds past the page margin on both sides, because a mountain range that
 * stops 20pt short of the screen edge reads as a picture of one.
 */
export function FootRange({ opacity = 0.5 }: { opacity?: number }) {
  const { width } = useWindowDimensions()
  const column = Math.min(width, SET_CONTENT_MAX)

  return (
    <View pointerEvents="none" style={{ opacity, marginTop: s.xl }}>
      <Image
        source={SETTINGS_ART.mountains.source}
        style={{ width: column, height: column / SETTINGS_ART.mountains.ratio }}
        resizeMode="contain"
      />
    </View>
  )
}

// --- Type ---------------------------------------------------------------------

/** "Study", "Account & App". Aligned to the same margin as the cards under it. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <Text className="font-nunito-extrabold" style={{ ...t.section, color: c.navy }}>
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
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: setRadius.card,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
          ...setShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/**
 * A group of rows that belong to one card.
 *
 * The separators are drawn here rather than by each row, so the last row cannot
 * end up with a trailing line under it — the single most common way a grouped
 * list ends up looking almost right. They start after the icon column, which is
 * what stops the card reading as a table.
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
                marginLeft: setRow.padding + setRow.icon + setRow.iconGap,
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

/**
 * One navigation row: circle, title over description, an optional summary of
 * the current state, and a chevron.
 *
 * The summary is the reason this screen can be this quiet. A row that says
 * "Reminders · Daily at 7:00 PM · On" has already answered the question most
 * people opened Settings to ask, so the detail screen behind it is for changing
 * the answer rather than for finding it.
 */
export function NavRow({
  icon,
  tint,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
}: {
  icon: ComponentType<{ color: string; size: number; strokeWidth: number }>
  tint: string
  iconColor: string
  title: string
  subtitle: string
  value?: string
  onPress: () => void
}) {
  return (
    <PressRow
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={value ? `${subtitle}. Currently ${value}` : subtitle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: setRow.minHeight,
        paddingHorizontal: setRow.padding,
        paddingVertical: s.md,
      }}
    >
      <IconCircle icon={icon} tint={tint} color={iconColor} />

      <View style={{ flex: 1, marginLeft: setRow.iconGap, marginRight: s.sm }}>
        <Text className="font-nunito-bold" style={{ ...t.rowTitle, color: c.navy }}>
          {title}
        </Text>
        <Text
          className="font-nunito-semibold"
          numberOfLines={1}
          style={{ ...t.rowSubtitle, color: c.textSecondary, marginTop: 1 }}
        >
          {subtitle}
        </Text>
      </View>

      {value ? (
        <Text
          className="font-nunito-bold"
          style={{ ...t.rowValue, color: c.greenDark, marginRight: s.sm }}
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
export function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: s.md }}>
      <Text
        className="font-nunito-extrabold"
        style={{ ...t.groupTitle, color: c.textMuted, textTransform: 'uppercase' }}
      >
        {title}
      </Text>
      <Card style={{ padding: setRow.padding, gap: s.xl }}>{children}</Card>
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
      <View
        className="rounded-full"
        style={{
          width: 24,
          height: 24,
          backgroundColor: '#FFFFFF',
          marginLeft: value ? 20 : 0,
          ...setShadow,
        }}
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
