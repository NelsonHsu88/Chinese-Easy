import { useEffect, useRef, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { ArrowLeft, Check, ShieldCheck, X, type LucideIcon } from 'lucide-react-native'
import { PressableScale, LiftedFace } from '../dashboard/parts'
import { subArt } from './art'
import {
  subColors as c,
  subSpacing as s,
  subType as t,
  subRadius,
  subShadow,
  subShadowBubble,
  subHero,
  subMotion,
} from './tokens'

/*
 * The pieces the subscription screen is built from.
 *
 * The split that matters here is the one the whole composition rests on:
 * **functional content is laid out with flexbox, decoration is positioned
 * absolutely.** The headline, the benefit rows, the plan cards, the button and
 * the footer are a plain column that any device height can stretch or scroll;
 * the mountains, the pagoda, the branch, the petals and Shifu himself are all
 * out of flow inside the hero, layered back to front. Put the artwork in the
 * column as normal children and it stops being a scene and becomes a stack of
 * pictures — and every one of them starts costing layout height.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/**
 * A piece of the scene.
 *
 * Absolutely positioned and `pointerEvents="none"` throughout: decoration must
 * cost no layout height, and it must never swallow a tap meant for the button
 * underneath it. The height comes from the asset's ratio because React Native
 * lays out an `Image` given only a width at zero height, and the artwork then
 * silently disappears.
 */
function SceneArt({
  source,
  ratio,
  width,
  style,
  opacity = 1,
  mirrored = false,
}: {
  source: number
  ratio: number
  width: number
  style: StyleProp<ViewStyle>
  opacity?: number
  /** Drawn flipped, so one asset can face either way. */
  mirrored?: boolean
}) {
  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', width, height: width / ratio, opacity }, style]}
    >
      <Image
        source={source}
        style={{ width: '100%', height: '100%', transform: mirrored ? [{ scaleX: -1 }] : undefined }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}

/** A loose petal. Three of them, and no more — this is a hint of drift, not weather. */
function Petal({ left, top, size, rotate }: { left: number; top: number; size: number; rotate: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size * 1.25,
        borderRadius: size,
        backgroundColor: c.sakura,
        opacity: 0.55,
        transform: [{ rotate }],
      }}
    />
  )
}

/**
 * What Shifu is saying.
 *
 * A bubble, not a dialog: it is his line of encouragement, and at any larger
 * size it starts competing with the headline for the job of telling the learner
 * what this screen is. The tail is a rotated square tucked under the right edge
 * rather than a triangle asset, so it inherits the bubble's own fill and can
 * never drift out of colour with it.
 */
export function SpeechBubble({
  lines,
  width,
  style,
}: {
  lines: string
  width: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ position: 'absolute', width }, style]} pointerEvents="none">
      <View
        style={{
          backgroundColor: c.card,
          borderRadius: subRadius.bubble,
          paddingHorizontal: 15,
          paddingVertical: 13,
          ...subShadowBubble,
        }}
      >
        <Text className="font-nunito-semibold" style={{ ...t.bubble, color: c.body }}>
          {lines}
        </Text>
      </View>
      {/* Points toward Shifu, who always stands to the bubble's right. */}
      <View
        style={{
          position: 'absolute',
          right: -5,
          bottom: 15,
          width: 16,
          height: 16,
          backgroundColor: c.card,
          transform: [{ rotate: '45deg' }],
          borderRadius: 3,
        }}
      />
    </View>
  )
}

/**
 * The scene: cream, then the range, then the pagoda, then the branch, then
 * Shifu, then his bubble — painted in that order because that is the order they
 * sit in depth.
 *
 * Everything is sized from the hero's own measured box rather than from the
 * window, so the composition holds together at the 430pt cap on a tablet
 * exactly as it does on a 360pt phone. The hero clips: the branch and the range
 * are drawn past its edges on purpose, and the clip is what turns that overhang
 * into artwork running off the page instead of a rectangle lying across the
 * headline.
 */
export function SubscriptionHero({
  width,
  height,
  pose,
  says,
  children,
}: {
  width: number
  height: number
  pose: 'thumbsUp' | 'gratitude'
  says: string
  /** The top bar, drawn over the scene rather than above it. */
  children?: ReactNode
}) {
  const art = pose === 'thumbsUp' ? subArt.shifuThumbsUp : subArt.shifuGratitude
  const shifuHeight = height * (pose === 'thumbsUp' ? subHero.shifuShare : subHero.shifuShareActive)
  const shifuWidth = shifuHeight * art.ratio

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {/*
        The range, mirrored so the pagoda stands to the *right* of the peaks as
        the reference has it. Anchored near the right edge rather than bled off
        it, because the pagoda is the right-hand end of this asset and pushing
        it past the edge is how the whole point of the backdrop gets cropped
        away. It sits high: the peaks belong above Shifu's shoulder, not level
        with his hem.
      */}
      <SceneArt
        source={subArt.pagodaRange.source}
        ratio={subArt.pagodaRange.ratio}
        width={width * 0.7}
        opacity={0.85}
        mirrored
        style={{ right: -width * 0.02, top: height * 0.13 }}
      />

      {/* The branch, entering from the top-left corner and bleeding off it. */}
      <SceneArt
        source={subArt.sakura.source}
        ratio={subArt.sakura.ratio}
        width={width * 0.56}
        style={{ left: -width * 0.08, top: height * 0.02 }}
      />
      <Petal left={width * 0.12} top={height * 0.56} size={7} rotate="18deg" />
      <Petal left={width * 0.21} top={height * 0.7} size={6} rotate="-24deg" />
      <Petal left={width * 0.35} top={height * 0.46} size={5} rotate="40deg" />

      {/*
        Shifu, standing on the hero's own floor.

        The bowing pose stands further in from the right than the thumbs-up one,
        as the reference has it — he is narrower there, and at the same offset
        he covered the pagoda entirely, which is the one piece of the backdrop
        that has to stay legible.
      */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: width * (pose === 'thumbsUp' ? 0.11 : 0.24),
          bottom: 0,
          width: shifuWidth,
          height: shifuHeight,
        }}
      >
        <Image
          source={art.source}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      {/*
        Level with Shifu's chest rather than up by his head, which is where the
        reference puts it and where the tail can point at him rather than past
        him. It also keeps the bubble clear of the branch — two soft shapes
        overlapping in the top-left corner is the one place this composition
        turns to mush.
      */}
      <SpeechBubble
        lines={says}
        width={Math.min(148, width * 0.37)}
        style={{ left: width * 0.13, top: height * 0.42 }}
      />

      {children}
    </View>
  )
}

/**
 * The one control in the top bar.
 *
 * Which one it is says something true about how the learner got here. Opened
 * from Settings there is a screen behind this one, so it is a back arrow.
 * Raised by the app itself, there is nothing behind it and nothing was asked
 * for — so it is a close, because the only honest thing an unrequested offer
 * can offer is a way out of it.
 */
export function TopBar({ mode, onPress }: { mode: 'back' | 'close'; onPress: () => void }) {
  const Icon = mode === 'back' ? ArrowLeft : X
  return (
    <View style={{ position: 'absolute', left: s.screen - 10, top: 4 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={mode === 'back' ? 'Go back' : 'Close'}
        hitSlop={10}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={24} color={c.ink} strokeWidth={2.2} />
      </Pressable>
    </View>
  )
}

/** One promise, with its own small jade disc. Rows, not cards — this list is airy. */
export function BenefitRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: c.jadeDisc,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={c.onJade} strokeWidth={2} />
      </View>
      <Text className="font-nunito-semibold" style={{ ...t.benefit, color: c.body, flex: 1 }}>
        {label}
      </Text>
    </View>
  )
}

/** A benefit the learner already has. The tick is filled, because it is done. */
export function CheckBenefit({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <View
        style={{
          width: 27,
          height: 27,
          borderRadius: 14,
          backgroundColor: c.jadeDisc,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={16} color={c.onJade} strokeWidth={3} />
      </View>
      <Text className="font-nunito-semibold" style={{ ...t.benefit, color: c.body, flex: 1 }}>
        {label}
      </Text>
    </View>
  )
}

/**
 * One of the two plans.
 *
 * Selection is drawn as a second face fading in over the first rather than as
 * animated border and background colours. Two reasons, and the second is the
 * one that decides it: a colour interpolation cannot run on the native driver,
 * and the tick, the tint and the heavier border are one state — crossfading a
 * single layer keeps them exactly in step instead of leaving three animations
 * to agree with each other.
 *
 * Selection is *not* purchase. Tapping here changes what the button below will
 * buy and nothing else; a card that charged money on a tap would be a trap.
 */
export function PlanCard({
  title,
  price,
  unit,
  savings,
  selected,
  disabled,
  onSelect,
  accessibilityLabel,
}: {
  title: string
  /** Store-formatted, e.g. "$36" or "¥3,800" — split for display, never parsed. */
  price: string
  unit: string
  savings?: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  accessibilityLabel: string
}) {
  const on = useRef(new Animated.Value(selected ? 1 : 0)).current

  useEffect(() => {
    const animation = Animated.timing(on, {
      toValue: selected ? 1 : 0,
      duration: subMotion.select,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    animation.start()
    /* Without the native driver this runs on requestAnimationFrame, which a
       browser stops dead for a hidden tab — so the selected face would never
       arrive and the card would sit unselected with the button offering to buy
       it. Same backstop every animation in this app carries. */
    const settle = setTimeout(() => on.setValue(selected ? 1 : 0), subMotion.select + 90)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [selected, on])

  /* The currency mark rides at the top of the figure, as the reference sets it:
     "$" small and raised, the number carrying the weight. Only a leading symbol
     is lifted — a trailing one (kr, zł) stays inline where it belongs. */
  const leadingMark = /^[^\d\s]+/.exec(price)?.[0] ?? ''
  const amount = price.slice(leadingMark.length)

  return (
    <PressableScale
      onPress={disabled ? undefined : onSelect}
      wrapperStyle={{ flex: 1 }}
      scaleTo={0.985}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={{
          height: 154,
          borderRadius: subRadius.plan,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          opacity: disabled ? 0.5 : 1,
          ...subShadow,
        }}
      >
        {/* The selected face. Same box, drawn over the top, faded in. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: subRadius.plan,
            backgroundColor: c.jadeFaint,
            borderWidth: 2,
            borderColor: c.jade,
            opacity: on,
          }}
        />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
          <Text className="font-nunito-bold" style={{ ...t.planTitle, color: c.ink }}>
            {title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }}>
            {leadingMark ? (
              <Text
                className="font-nunito-semibold"
                style={{ ...t.priceMark, color: c.ink, marginTop: 6 }}
              >
                {leadingMark}
              </Text>
            ) : null}
            <Text
              className="font-nunito-semibold"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ ...t.price, color: c.ink }}
            >
              {amount}
            </Text>
          </View>

          <Text className="font-nunito-semibold" style={{ ...t.priceUnit, color: c.muted, marginTop: 2 }}>
            / {unit}
          </Text>

          {savings ? (
            <Animated.View
              style={{
                marginTop: 8,
                paddingHorizontal: 11,
                paddingVertical: 4,
                borderRadius: subRadius.pill,
                backgroundColor: c.jadeSoft,
                opacity: on.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
              }}
            >
              <Text className="font-nunito-bold" style={{ ...t.savings, color: c.jadeDark }}>
                {savings}
              </Text>
            </Animated.View>
          ) : null}
        </View>

        {/*
          The tick, in the corner. It is not decoration on top of the border: a
          border colour alone is the kind of state a colour-blind learner cannot
          read, so the selected plan says so twice, in colour and in shape.
        */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: c.jadeDisc,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: on,
            transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        >
          <Check size={15} color={c.onJade} strokeWidth={3.2} />
        </Animated.View>
      </View>
    </PressableScale>
  )
}

/**
 * The primary call to action.
 *
 * `LiftedFace` from the Dashboard, not a new button: the app already has a
 * button drawn as a physical object — a face standing on a darker shoulder,
 * sinking onto it by exactly the height of the lift when pressed — and the
 * reference's raised jade pill *is* that object. A second implementation would
 * be a second set of press mechanics to keep in step with the first.
 */
export function PrimaryCta({
  label,
  busy,
  onPress,
  accessibilityLabel,
}: {
  label: string
  busy?: boolean
  onPress: () => void
  accessibilityLabel?: string
}) {
  return (
    <PressableScale
      onPress={busy ? undefined : onPress}
      wrapperStyle={{ width: '100%' }}
      scaleTo={0.975}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <LiftedFace height={56} fill={c.jadeFace} shoulder={c.jadeDark}>
        {/*
          The indicator sits *beside* the label rather than replacing it, and the
          label keeps a fixed height either way: a button that swaps its contents
          for a spinner changes size at the exact moment the learner is watching
          it to see whether their payment is going through.
        */}
        {busy ? <ActivityIndicator size="small" color={c.onJade} /> : null}
        <Text className="font-nunito-extrabold" style={{ ...t.button, color: c.onJade }}>
          {busy ? 'Processing…' : label}
        </Text>
      </LiftedFace>
    </PressableScale>
  )
}

/** The quiet outlined twin — "Manage subscription", which leads out to the store. */
export function OutlineButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  accessibilityLabel?: string
}) {
  return (
    <PressableScale
      onPress={onPress}
      wrapperStyle={{ width: '100%' }}
      scaleTo={0.985}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View
        style={{
          height: 52,
          borderRadius: 26,
          borderWidth: 1.8,
          borderColor: c.jade,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <Text className="font-nunito-bold" style={{ fontSize: 16.5, color: c.jadeDark }}>
          {label}
        </Text>
      </View>
    </PressableScale>
  )
}

/** A text link that reads as a link — jade, underlined, and a real touch target. */
export function QuietLink({
  label,
  busy,
  onPress,
}: {
  label: string
  busy?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={12}
      style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
    >
      {busy ? <ActivityIndicator size="small" color={c.jade} /> : null}
      <Text
        className="font-nunito-semibold"
        style={{ ...t.link, color: c.jadeDark, textDecorationLine: 'underline' }}
      >
        {busy ? 'Restoring…' : label}
      </Text>
    </Pressable>
  )
}

/**
 * Anything the screen has to say back to the learner.
 *
 * Inline and in the flow rather than an alert, and calm rather than alarming:
 * a cancelled purchase is not an error, and the one thing a payment screen must
 * never do is make somebody feel they have broken something.
 */
export function Notice({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: c.jadeFaint,
        borderRadius: subRadius.pill,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}
    >
      <Text
        className="font-nunito-semibold"
        style={{ fontSize: 13, lineHeight: 18, color: c.body, textAlign: 'center' }}
      >
        {text}
      </Text>
    </View>
  )
}

/**
 * The subscribed state's status card: what they have, when it renews, and how
 * to get out of it — in that order, because that is the order the questions
 * arrive in.
 */
export function StatusCard({
  title,
  renewal,
  note,
}: {
  title: string
  renewal: string | null
  note: string
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: c.card,
        borderRadius: subRadius.card,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 17,
        paddingVertical: 17,
        ...subShadow,
      }}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: c.jadeSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/*
          Filled rather than outlined, and the only filled icon on the screen.
          Everything else here is a promise; this one is a statement of fact
          about the learner's account, and a solid badge is what says so.
        */}
        <ShieldCheck size={31} color={c.onJade} fill={c.jadeDisc} strokeWidth={1.8} />
      </View>

      <View style={{ flex: 1 }}>
        <Text className="font-nunito-bold" style={{ ...t.statusTitle, color: c.ink }}>
          {title}
        </Text>
        {renewal ? (
          <Text className="font-nunito-semibold" style={{ ...t.statusDate, color: c.jade, marginTop: 1 }}>
            {renewal}
          </Text>
        ) : null}
        <Text className="font-nunito-semibold" style={{ ...t.statusNote, color: c.muted, marginTop: 3 }}>
          {note}
        </Text>
      </View>
    </View>
  )
}
