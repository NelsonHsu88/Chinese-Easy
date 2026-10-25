import { useId, type ComponentType, type ReactNode } from 'react'
import Svg, { Circle, Defs, Ellipse, LinearGradient, Polygon, RadialGradient, Stop } from 'react-native-svg'
import { View, Text, Image, Pressable, ScrollView, Animated, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, Stack, type Href } from 'expo-router'
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ChartNoAxesColumnIncreasing,
  Brush,
  Check,
  ChevronRight,
  Flame,
  GraduationCap,
  Headphones,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trophy,
} from 'lucide-react-native'
import { PressableScale, LiftedFace, RaisedButton } from '../dashboard/parts'
import { useReveal } from '../dashboard/entrance'
import { useApp } from '../../context/AppContext'
import { hanziFont } from '../../lib/hanzi'
import { MAX_PINNED, achievementTier, type AchievementCategory, type AchievementDefinition, type AchievementTier } from '../../lib/progression/achievements'
import { GARDEN_SLOTS, type GardenItemId, type GardenSlotId } from '../../lib/progression/gardenItems'
import { profArt, GARDEN_ART, GARDEN_SLOT_POSITION, FIRE_RATIO } from './art'
import {
  profColors as c,
  profSpacing as s,
  profType as t,
  profRadius,
  profAvatar,
  profHero,
  profileInk,
  medalMetals,
  profShadow,
  profEntrance,
  PROF_ART_RATIO,
  PROF_CONTENT_MAX,
  type ProfileInk,
} from './tokens'
import { ShadowSurface } from '../shadowReveal'
import { playTints } from '../dashboard/tokens'
import { RefHero, refY } from '../refScene'

/** Where the profile card starts in "SS1017 New APP DesIGN UI (3)" (its pixels). */
const PROFILE_CARD_TOP_REF = 328

/*
 * The Profile family's building blocks, built to the Beta 2.1 reference.
 *
 * Nested presses go through the Dashboard's `PressableScale`, whose
 * `PressClaim` stops an inner button also firing the card around it on web.
 */

// --- Cosmetics ----------------------------------------------------------------

/**
 * What the learner is wearing, read in one place. Every profile component
 * that honours a cosmetic takes it from here, and nothing outside the profile
 * screens calls this — the rewards change this page and no other.
 */
export function useProfileCosmetics(): { ink: ProfileInk; misty: boolean; sakura: boolean } {
  const { progression } = useApp()
  const equipped = progression.profileRewards.equipped
  return {
    ink: equipped.includes('jade_ink') ? profileInk.jade : profileInk.plain,
    misty: equipped.includes('misty_mountain_background'),
    sakura: equipped.includes('sakura_frame'),
  }
}

// --- Hero ---------------------------------------------------------------------

/** "Profile", its subtitle, and the sun-range-pagoda-sakura painting behind them. */
export function ProfileHero({ column, run }: { column: number; run: number }) {
  const artWidth = profHero.artWidth * (column / PROF_CONTENT_MAX)
  const art = useReveal({ from: 'right', at: profEntrance.at, duration: profEntrance.for, run, distance: profEntrance.slideX })
  const text = useReveal({ from: 'bottom', at: profEntrance.at, duration: profEntrance.for, run, distance: profEntrance.slideY })
  /* Shifu rises a beat after the scenery settles, as on Home. */
  const shifu = useReveal({ from: 'bottom', at: profEntrance.at + 180, duration: profEntrance.for, run, distance: 18 })
  void art
  void artWidth

  /*
   * "SS1017 New APP DesIGN UI (3)": the landscape and Shifu with his fan, laid
   * across the column. The profile card that follows is drawn over its foot,
   * as in the reference, so Shifu stands behind the card rather than ending in
   * a cut. The hero's own height is the mockup's distance to that card.
   */
  return (
    <View style={{ minHeight: refY(PROFILE_CARD_TOP_REF, column) }}>
      <RefHero source={profArt.appHero} ratio={760 / 266} column={column} left={-s.screen} animatedStyle={shifu} />
      <Animated.View style={[text, { paddingTop: s.md, paddingBottom: s.lg }]}>
        <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ ...t.title, color: c.navy }}>
          Profile
        </Text>
        <Text className="font-nunito-semibold" style={{ ...t.subtitle, fontSize: 14, lineHeight: 19.5, color: c.slate, marginTop: s.xs, maxWidth: column * 0.46 }}>
          Track your growth and{'\n'}celebrate your learning.
        </Text>
      </Animated.View>
    </View>
  )
}

// --- Avatar -------------------------------------------------------------------

/**
 * The learner's picture — their own photo once they have chosen one in Edit
 * Profile, otherwise their initial on a sage disc (a stock face would not be
 * theirs). With the Sakura Frame equipped a blossom wreath rings it.
 *
 * `badge` puts a small jade pencil at its lower right. The edit popup uses it
 * for "change photo"; the profile card does not, because there the whole card
 * is the target and a second pencil beside the picture would promise a
 * different action from the same tap.
 */
export function Avatar({
  name,
  photo,
  sakura,
  size = profAvatar.size,
  badge,
}: {
  name: string
  photo?: string
  sakura: boolean
  size?: number
  badge?: { onPress: () => void; accessibilityLabel: string }
}) {
  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?'
  const frame = size * profAvatar.frameScale
  const badgeSize = Math.round(Math.max(30, size * 0.3))
  return (
    <View style={{ width: frame, height: frame, alignItems: 'center', justifyContent: 'center' }}>
      <View
        className="items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.sage,
          borderWidth: 3,
          borderColor: c.card,
          overflow: 'hidden',
        }}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Text className="font-nunito-extrabold" style={{ fontSize: size * 0.46, lineHeight: size * 0.58, color: c.onJade }}>
            {initial}
          </Text>
        )}
      </View>
      {sakura && (
        <View pointerEvents="none" style={{ position: 'absolute', width: frame, height: frame }}>
          <Image source={profArt.sakuraWreath} style={{ width: frame, height: frame }} resizeMode="contain" />
        </View>
      )}
      {badge && (
        <View style={{ position: 'absolute', right: frame * 0.08, bottom: frame * 0.08 }}>
          <PressableScale onPress={badge.onPress} accessibilityLabel={badge.accessibilityLabel}>
            <View
              className="items-center justify-center"
              style={{ width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: c.jade, borderWidth: 2, borderColor: c.card }}
            >
              <Pencil size={badgeSize * 0.46} color={c.onJade} strokeWidth={2.2} />
            </View>
          </PressableScale>
        </View>
      )}
    </View>
  )
}

// --- Profile card -------------------------------------------------------------

/** A slim bar in the profile's ink. */
export function ProgressBar({ fraction, color, height = 8 }: { fraction: number; color: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.track, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

export function ProfileCard({
  name,
  level,
  title,
  xpInto,
  xpNeeded,
  photo,
  streak,
  badges,
  stats,
  onEdit,
  onBadges,
}: {
  /** The reference's second and third readings beside the streak. When given, they replace the badge shelf. */
  stats?: { due: number; weak: number }
  name: string
  photo?: string
  level: number
  title: string
  xpInto: number
  xpNeeded: number
  streak: number
  /** The achievements chosen for display, in order — up to `MAX_PINNED`. */
  badges: AchievementDefinition[]
  onEdit: () => void
  /** The badge holders' own target: where the learner picks what goes in them. */
  onBadges: () => void
}) {
  const { ink, misty, sakura } = useProfileCosmetics()
  /*
   * Two targets, side by side and never nested: the top of the card (photo,
   * name, level) opens Edit Profile, and the badge holders below open
   * Achievements. A pressable inside a pressable renders as a <button> inside
   * a <button> on web, which is invalid HTML. The pencil is a plain View that
   * says what the top half does.
   */
  return (
    <ShadowSurface shadow={profShadow} style={{ backgroundColor: c.card, borderRadius: profRadius.large, borderWidth: 1, borderColor: c.border,  }}>
      <View style={{ borderRadius: profRadius.large - 1, overflow: 'hidden' }}>
        {misty && (
          <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0 }}>
            <Image
              source={profArt.cardMountains}
              resizeMode="contain"
              style={{ width: 190, height: 190 / PROF_ART_RATIO.cardMountains }}
            />
          </View>
        )}

        <PressableScale onPress={onEdit} scaleTo={0.985} accessibilityLabel={`${name || 'Learner'}, level ${level}. Edit profile`}>
        <View className="flex-row items-center" style={{ paddingLeft: s.sm, paddingRight: s.lg, paddingTop: s.md, paddingBottom: s.md }}>
          <Avatar name={name} photo={photo} sakura={sakura} />
          <View style={{ flex: 1, marginLeft: s.xs }}>
            <View className="flex-row items-center" style={{ gap: s.sm, paddingRight: EDIT_MARK }}>
              <Text className="font-nunito-extrabold" numberOfLines={1} style={{ ...t.name, color: c.navy, flexShrink: 1 }}>
                {name || 'Learner'}
              </Text>
              {/* Jade Ink's calligraphic touch: a small seal beside the name. */}
              {ink.seal && (
                <View
                  className="items-center justify-center"
                  style={{ width: 24, height: 24, borderRadius: 5, borderWidth: 1.5, borderColor: ink.seal }}
                >
                  <Text className="font-hanzi-tc-semibold" style={{ fontSize: 14, lineHeight: 18, color: ink.seal }}>
                    學
                  </Text>
                </View>
              )}
            </View>
            <View
              className="flex-row items-center self-start"
              style={{ marginTop: s.sm, gap: 6, backgroundColor: ink.pill, borderRadius: profRadius.pill, paddingHorizontal: s.md, paddingVertical: 5 }}
            >
              <GraduationCap size={17} color={ink.pillInk} strokeWidth={2} />
              <Text className="font-nunito-semibold" style={{ ...t.pill, color: ink.pillInk }}>
                Level {level} {title}
              </Text>
            </View>
            <Text className="font-nunito-semibold" style={{ ...t.xp, color: c.slate, marginTop: s.sm }}>
              <Text style={{ color: c.navy }}>{xpInto}</Text> / {xpNeeded} XP to Level {level + 1}
            </Text>
            <View style={{ marginTop: 6 }}>
              <ProgressBar fraction={xpInto / xpNeeded} color={ink.bar} />
            </View>
          </View>
          <View
            pointerEvents="none"
            className="items-center justify-center"
            style={{
              position: 'absolute',
              top: s.md,
              right: s.md,
              width: EDIT_MARK,
              height: EDIT_MARK,
              borderRadius: EDIT_MARK / 2,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Pencil size={15} color={c.jadeDark} strokeWidth={2.1} />
          </View>
        </View>
        </PressableScale>

        <View className="flex-row" style={{ borderTopWidth: 1, borderColor: c.border, paddingVertical: s.md }}>
          <Stat
            value={streak}
            label="day streak"
            disc={c.fireDisc}
            icon={<Image source={profArt.fire} style={{ width: 18 * FIRE_RATIO, height: 18 }} resizeMode="contain" />}
          />
          <Divider />
          {stats ? (
            <>
              <Stat value={stats.due} label="Due today" disc={playTints.jade.soft} icon={<CalendarCheck size={17} color={playTints.jade.ink} strokeWidth={2.2} />} />
              <Divider />
              <Stat value={stats.weak} label="Weak words" disc={playTints.sky.soft} icon={<ChartNoAxesColumnIncreasing size={17} color={playTints.sky.ink} strokeWidth={2.6} />} />
            </>
          ) : (
          <>
          {/*
            The badge shelf: one holder per displayable achievement, a medal in
            each filled one and a dashed place in each still free. It opens
            Achievements, where badges are chosen.
          */}
          <PressableScale
            onPress={onBadges}
            scaleTo={0.97}
            wrapperStyle={{ flex: 1.6 }}
            accessibilityLabel={
              badges.length > 0
                ? `Displayed achievements: ${badges.map((b) => b.name).join(', ')}. Choose achievements`
                : 'No achievements displayed. Choose achievements'
            }
          >
            <View className="flex-row items-center justify-evenly">
              {Array.from({ length: MAX_PINNED }, (_, i) => {
                const def = badges[i]
                return def ? (
                  <Medal key={i} category={def.category} tier={achievementTier(def)} earned size={BADGE_HOLDER} ink={ink.seal ? ink : undefined} />
                ) : (
                  <MedalSlot key={i} size={BADGE_HOLDER} />
                )
              })}
            </View>
          </PressableScale>
          </>
          )}
        </View>

      </View>
    </ShadowSurface>
  )
}

/** The pencil disc in the profile card's top right. */
const EDIT_MARK = 32
/** A badge holder's coin size in the profile card's bottom row. */
const BADGE_HOLDER = 34

function Divider() {
  return <View style={{ width: 1, marginVertical: 4, backgroundColor: c.border }} />
}

function Stat({ value, label, disc, icon }: { value: number; label: string; disc: string; icon: ReactNode }) {
  return (
    <View className="flex-1 flex-row items-center justify-center" style={{ gap: 6 }} accessible accessibilityLabel={`${value} ${label}`}>
      <View className="items-center justify-center" style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: disc }}>
        {icon}
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text className="font-nunito-extrabold" style={{ ...t.statValue, color: c.navy }}>
          {value}
        </Text>
        <Text className="font-nunito-semibold" numberOfLines={1} style={{ ...t.statLabel, color: c.slate }}>
          {label}
        </Text>
      </View>
    </View>
  )
}

// --- Section card -------------------------------------------------------------

/** A titled panel with an optional "View All ›" link at the right. */
export function SectionCard({
  title,
  action,
  scene,
  children,
}: {
  title: string
  action?: { label: ReactNode; onPress: () => void; accessibilityLabel: string }
  /** A painting laid into the card's top-right corner, behind its content. */
  scene?: ReactNode
  children: ReactNode
}) {
  return (
    <ShadowSurface shadow={profShadow} style={{ backgroundColor: c.card, borderRadius: profRadius.large, borderWidth: 1, borderColor: c.border, padding: s.md,  }}>
      {scene && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, right: 0, borderTopRightRadius: profRadius.large - 1, overflow: 'hidden' }}
        >
          {scene}
        </View>
      )}
      <View className="flex-row items-center justify-between" style={{ marginBottom: s.md, paddingLeft: 4 }}>
        <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ ...t.section, color: c.navy, flexShrink: 1 }}>
          {title}
        </Text>
        {action && (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            hitSlop={10}
            className="flex-row items-center active:opacity-60"
            style={{ gap: 2 }}
          >
            {typeof action.label === 'string' ? (
              <Text className="font-nunito-semibold" style={{ ...t.link, color: c.slate }}>
                {action.label}
              </Text>
            ) : (
              action.label
            )}
            <ChevronRight size={18} color={c.slate} strokeWidth={1.8} />
          </Pressable>
        )}
      </View>
      {children}
    </ShadowSurface>
  )
}

/** A small rounded tag: "Equipped", "Unlocked", "Level 10". */
export function Tag({ tone, children }: { tone: 'on' | 'off' | 'locked'; children: ReactNode }) {
  const fill = tone === 'on' ? c.mint : tone === 'off' ? c.card : c.locked
  const ink = tone === 'on' ? c.jadeDark : tone === 'off' ? c.slate : c.lockedInk
  return (
    <View
      className="flex-row items-center self-start"
      style={{
        gap: 4,
        backgroundColor: fill,
        borderRadius: profRadius.pill,
        borderWidth: tone === 'off' ? 1 : 0,
        borderColor: c.border,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      {tone === 'locked' && <Lock size={11} color={ink} strokeWidth={2.2} />}
      {tone === 'on' && <Check size={12} color={ink} strokeWidth={2.6} />}
      <Text className="font-nunito-semibold" style={{ ...t.tag, color: ink }}>
        {children}
      </Text>
    </View>
  )
}

// --- Medals -------------------------------------------------------------------

type EmblemIcon = ComponentType<{ size: number; color: string; strokeWidth: number; fill?: string }>

/**
 * Each category's emblem, struck into the coin's face (SS1012 New Achievements):
 * a brush for writing, an open book for reading, headphones, a flame for the
 * habit, circling arrows for review, a trophy for challenges. Vocabulary is
 * the exception — its emblem is a seal plaque bearing 詞/词, drawn in `Medal`.
 * `filled` decides whether the emblem's shapes take the raised metal: closed
 * shapes (a book, a flame) do; open strokes (the arrows) would fill into blobs.
 */
const CATEGORY_EMBLEM: Record<Exclude<AchievementCategory, 'vocabulary'>, { Icon: EmblemIcon; filled: boolean }> = {
  writing: { Icon: Brush, filled: true },
  reading: { Icon: BookOpen, filled: true },
  listening: { Icon: Headphones, filled: true },
  streak: { Icon: Flame, filled: true },
  review: { Icon: RefreshCw, filled: false },
  challenges: { Icon: Trophy, filled: true },
}

/** Beads around the rim, as in the reference's ornate edge. */
const MEDAL_BEADS = 24

/**
 * A medal, struck in its tier's metal (SS1012 New Achievements): a bevelled rim
 * ringed with beads, a dark groove, a domed face with an engraved ring, the
 * category's emblem standing proud of it, and a laurel sprig over two red
 * ribbon tails. With Jade Ink on the profile, an earned medal's metal is drawn
 * in the ink instead: the "selected achievement accents" that reward promises,
 * and on the profile only.
 *
 * Every medal shows its metal, earned or not — the row it sits in is what marks
 * it earned. The tails hang `MEDAL_RIBBON` below the coin, inside the medal's
 * own box, so a caller lays out a medal as `size` wide and
 * `size * (1 + MEDAL_RIBBON)` tall. Gradient ids are per instance — two medals
 * sharing one id would both paint with whichever definition the document found
 * first.
 */
export function Medal({
  category,
  tier,
  earned,
  size = 48,
  ink,
}: {
  category: AchievementCategory
  /** Which metal it is struck in. Drawn in full colour whether earned or not. */
  tier: AchievementTier
  earned: boolean
  size?: number
  ink?: ProfileInk
}) {
  const { settings } = useApp()
  // `useId` returns ":r3:"; colons are not safe inside an SVG `url(#…)`.
  const id = 'medal' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const jade = earned && !!ink?.seal
  const metal = medalMetals[tier]
  const light = jade ? c.jadeLight : metal.light
  const face = jade ? c.mint : metal.face
  const deep = jade ? ink!.seal! : metal.deep
  const ring = jade ? ink!.seal! : metal.ring
  const emblemInk = jade ? ink!.seal! : metal.ink
  const near = jade ? ink!.seal! : c.ribbon
  const far = jade ? c.jadeDark : c.ribbonDeep

  const s = size
  const r = s / 2
  const h = s * (1 + MEDAL_RIBBON)

  /* One tail, as x-fractions of the width: a band leaning outwards from under
     the coin to a swallowtail notch at the foot. The other is its mirror. */
  const tail = (mirror: boolean) =>
    [
      [0.3, 0.6],
      [0.52, 0.72],
      [0.42, h / s],
      [0.33, h / s - 0.09],
      [0.2, h / s],
    ]
      .map(([x, y]) => `${(mirror ? 1 - x : x) * s},${y * s}`)
      .join(' ')

  /* The laurel: three leaves a side, fanning up from the foot of the coin and
     tucked over the bottom of the rim (the face covers their inner ends).
     Angles in degrees from straight down. */
  const leaves = [22, 44, 66].flatMap((deg, i) =>
    [-1, 1].map((side) => {
      const a = ((deg * side + 90) * Math.PI) / 180
      const d = r * (0.9 - i * 0.015)
      const cx = r + Math.cos(a) * d
      const cy = r + Math.sin(a) * d
      const tilt = deg * side + (side < 0 ? 180 : 0) + 90
      return { key: `${side}-${deg}`, cx, cy, tilt }
    }),
  )

  const beads = Array.from({ length: MEDAL_BEADS }, (_, i) => {
    const a = (i / MEDAL_BEADS) * Math.PI * 2
    return { cx: r + Math.cos(a) * r * 0.885, cy: r + Math.sin(a) * r * 0.885 }
  })

  const emblemSize = s * 0.42
  const relief = Math.max(0.6, s * 0.022)
  const emblem = category === 'vocabulary' ? null : CATEGORY_EMBLEM[category]
  const sealGlyph = settings.script === 'simplified' ? '词' : '詞'

  return (
    <View style={{ width: s, height: h }}>
      <Svg width={s} height={h}>
        <Defs>
          <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.45" stopColor={face} />
            <Stop offset="1" stopColor={deep} />
          </LinearGradient>
          <RadialGradient id={`${id}face`} cx="38%" cy="30%" r="78%">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.55" stopColor={face} />
            <Stop offset="1" stopColor={deep} />
          </RadialGradient>
        </Defs>

        <Polygon points={tail(true)} fill={far} />
        <Polygon points={tail(false)} fill={near} />

        {/* The rim: lit from above, with its ring of beads. */}
        <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#${id}rim)`} stroke={deep} strokeWidth={0.8} />
        {beads.map((b, i) => (
          <Circle key={i} cx={b.cx} cy={b.cy} r={s * 0.019} fill={light} opacity={0.75} />
        ))}
        {leaves.map((l) => (
          <Ellipse
            key={l.key}
            cx={l.cx}
            cy={l.cy}
            rx={s * 0.095}
            ry={s * 0.04}
            fill={light}
            stroke={deep}
            strokeWidth={0.8}
            transform={`rotate(${l.tilt} ${l.cx} ${l.cy})`}
          />
        ))}
        {/* The groove between rim and face, then the domed face. */}
        <Circle cx={r} cy={r} r={r * 0.79} fill={deep} />
        <Circle cx={r} cy={r} r={r * 0.75} fill={`url(#${id}face)`} />
        {/* An engraved ring: a dark cut with its lit lip just inside it. */}
        <Circle cx={r} cy={r} r={r * 0.65} fill="none" stroke={deep} strokeWidth={1} strokeOpacity={0.5} />
        <Circle cx={r} cy={r} r={r * 0.625} fill="none" stroke={light} strokeWidth={0.8} strokeOpacity={0.6} />
        <Ellipse
          cx={r * 0.74}
          cy={r * 0.52}
          rx={r * 0.36}
          ry={r * 0.15}
          fill={c.glint}
          opacity={0.38}
          transform={`rotate(-30 ${r * 0.74} ${r * 0.52})`}
        />
      </Svg>

      {/* The emblem, standing proud: a dark copy a hair lower is its shadow,
          and the raised face takes the metal's light. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        {emblem ? (
          <View style={{ width: emblemSize, height: emblemSize }}>
            <View style={{ position: 'absolute', top: relief, left: relief * 0.5, opacity: 0.4 }}>
              <emblem.Icon size={emblemSize} color={emblemInk} strokeWidth={2.1} fill={emblem.filled ? emblemInk : 'none'} />
            </View>
            <emblem.Icon size={emblemSize} color={emblemInk} strokeWidth={1.9} fill={emblem.filled ? light : 'none'} />
          </View>
        ) : (
          <View style={{ width: s * 0.4, height: s * 0.4 }}>
            <View
              style={{
                position: 'absolute',
                top: relief,
                left: relief * 0.5,
                width: s * 0.4,
                height: s * 0.4,
                borderRadius: s * 0.07,
                backgroundColor: emblemInk,
                opacity: 0.4,
              }}
            />
            <View
              style={{
                width: s * 0.4,
                height: s * 0.4,
                borderRadius: s * 0.07,
                backgroundColor: light,
                borderWidth: Math.max(1, s * 0.028),
                borderColor: emblemInk,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                className={hanziFont(settings.script, 'semibold')}
                style={{ fontSize: s * 0.24, lineHeight: s * 0.3, color: emblemInk, includeFontPadding: false }}
              >
                {sealGlyph}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

/** How far a medal's ribbon tails hang below the coin, as a share of its size. */
export const MEDAL_RIBBON = 0.24

/** An empty place on the profile's badge shelf: a dashed ring the size of a medal. */
export function MedalSlot({ size = 48 }: { size?: number }) {
  /* As tall as a medal with its ribbon, ring at the top, so the names under a
     row of medals and empty places share one line. */
  return (
    <View style={{ width: size, height: size * (1 + MEDAL_RIBBON) }}>
      <View
        className="items-center justify-center"
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.pewterRing }}
      >
        <Plus size={size * 0.34} color={c.pewterInk} strokeWidth={1.8} />
      </View>
    </View>
  )
}

// --- Garden -------------------------------------------------------------------

/**
 * The garden: the fixed base painting with whatever sits in each slot drawn
 * over it, back row first. `emptySlots` marks the unfilled places, for the
 * Garden screen, where the learner is deciding what to put where.
 */
export function GardenScene({
  width,
  slots,
  emptySlots = false,
  highlight,
}: {
  width: number
  slots: Partial<Record<GardenSlotId, GardenItemId>>
  emptySlots?: boolean
  highlight?: GardenSlotId
}) {
  const height = width / PROF_ART_RATIO.garden
  const order = [...GARDEN_SLOTS].sort((a, b) => GARDEN_SLOT_POSITION[a].depth - GARDEN_SLOT_POSITION[b].depth)
  return (
    <View style={{ width, height }} pointerEvents="none">
      <Image source={profArt.garden} style={{ width, height }} resizeMode="contain" />
      {order.map((slot) => {
        const pos = GARDEN_SLOT_POSITION[slot]
        const item = slots[slot]
        if (!item) {
          if (!emptySlots) return null
          const d = Math.max(26, Math.round(width * 0.075))
          return (
            <View
              key={slot}
              className="items-center justify-center"
              style={{
                position: 'absolute',
                left: pos.x * width - d / 2,
                top: pos.ground * height - d - 4,
                width: d,
                height: d,
                borderRadius: d / 2,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: highlight === slot ? c.jade : c.goldRing,
                backgroundColor: highlight === slot ? c.mint : c.card,
                opacity: 0.92,
              }}
            >
              <Plus size={d * 0.5} color={highlight === slot ? c.jade : c.goldDeep} strokeWidth={2} />
            </View>
          )
        }
        const art = GARDEN_ART[item]
        const h = art.height * height
        const w = h * art.ratio
        return (
          <Image
            key={slot}
            source={art.source}
            resizeMode="contain"
            style={{ position: 'absolute', left: pos.x * width - w / 2, top: pos.ground * height - h, width: w, height: h }}
          />
        )
      })}
    </View>
  )
}

/** A decoration on a small tile — the tray on the Garden screen and the preview row. */
export function DecorationThumb({ item, size = 52, dim = false }: { item: GardenItemId; size?: number; dim?: boolean }) {
  const art = GARDEN_ART[item]
  const h = size * 0.82
  const w = Math.min(size * 0.86, h * art.ratio)
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: profRadius.small, backgroundColor: c.tile, borderWidth: 1, borderColor: c.border }}
    >
      <Image source={art.source} resizeMode="contain" style={{ width: w, height: w / art.ratio > h ? h : w / art.ratio, opacity: dim ? 0.35 : 1 }} />
    </View>
  )
}

// --- Buttons ------------------------------------------------------------------

/**
 * The profile's buttons: the Dashboard's raised `LiftedFace`, filled jade for
 * the primary action and outlined for the quiet one, as the reference draws
 * them. Sized to share a row.
 */
export function ProfileButton({
  label,
  icon: Icon,
  tone,
  onPress,
  trailing,
}: {
  label: string
  icon?: ComponentType<{ size: number; color: string; strokeWidth: number }>
  tone: 'primary' | 'quiet'
  onPress: () => void
  trailing?: boolean
}) {
  const primary = tone === 'primary'
  const ink = primary ? c.onJade : c.navy
  return (
    <PressableScale onPress={onPress} scaleTo={1} accessibilityLabel={label} wrapperStyle={{ flex: 1 }}>
      <LiftedFace
        height={50}
        fill={primary ? c.jade : c.card}
        shoulder={primary ? c.jadeDark : c.quietShoulder}
        border={primary ? undefined : c.quietShoulder}
        shadow={primary}
      >
        <View className="flex-row items-center" style={{ gap: s.sm, paddingHorizontal: s.md }}>
          {Icon && <Icon size={19} color={primary ? c.onJade : c.slate} strokeWidth={2} />}
          <Text className="font-nunito-semibold" numberOfLines={1} style={{ ...t.button, color: ink }}>
            {label}
          </Text>
          {trailing && <ChevronRight size={18} color={ink} strokeWidth={2} />}
        </View>
      </LiftedFace>
    </PressableScale>
  )
}

/**
 * A small pill action for inside a card — Equip / Unequip. The full
 * `ProfileButton` is a page-level object; at card scale its lifted shoulder
 * outweighed the thing it acts on.
 */
export function PillButton({ label, tone, onPress, accessibilityLabel }: { label: string; tone: 'primary' | 'quiet'; onPress: () => void; accessibilityLabel?: string }) {
  const primary = tone === 'primary'
  return (
    <RaisedButton
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      height={34}
      fill={primary ? c.jade : c.card}
      border={primary ? undefined : c.quietShoulder}
      shoulder={primary ? c.jadeDark : c.quietShoulder}
    >
      <Text className="font-nunito-semibold" style={{ ...t.tag, fontSize: 13.5, lineHeight: 17, color: primary ? c.onJade : c.navy, paddingHorizontal: s.lg }}>
        {label}
      </Text>
    </RaisedButton>
  )
}

// --- Sub-page shell -----------------------------------------------------------

/** The back-arrow row (48) plus the art's lift above it (`s.lg`), so the
 *  painting ends where the title begins. */
const SUBPAGE_ART_HEIGHT = 48 + s.lg

/**
 * The frame the Rewards, Achievements and Garden pages share: a back arrow
 * (guarded — never a bare `back()`), a serif title and subtitle, and a centred
 * scrolling column capped at the design width.
 */
export function ProfileSubpage({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: (column: number) => ReactNode
  footer?: ReactNode
}) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const column = Math.min(width, PROF_CONTENT_MAX)
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ animation: 'slide_from_right' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: Math.max(s.xxl, insets.bottom + s.md) }}
      >
        <View style={{ width: column, paddingHorizontal: s.screen }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile-tab' as Href))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            className="items-center justify-center active:opacity-60"
            style={{ width: 40, height: 48, marginLeft: -6 }}
          >
            <ArrowLeft size={26} color={c.jadeDark} strokeWidth={2} />
          </Pressable>
          {/* The hero's range and pagoda, smaller, so the sub-pages read as rooms
              of the same house rather than as bare lists. Out of flow, never a
              tap target, and sized by height to the back-arrow row alone: sized
              by width it reached down into the title and sat across the end of
              "Scholar's Garden". */}
          <View pointerEvents="none" style={{ position: 'absolute', right: -s.sm, top: -s.lg }}>
            <Image
              source={profArt.hero}
              resizeMode="contain"
              style={{ width: SUBPAGE_ART_HEIGHT * profHero.artRatio, height: SUBPAGE_ART_HEIGHT, opacity: 0.9 }}
            />
          </View>
          <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 40, color: c.navy }}>
            {title}
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.subtitle, color: c.slate, marginTop: s.xs, marginBottom: s.xl, maxWidth: '78%' }}>
            {subtitle}
          </Text>
          {children(column - s.screen * 2)}
        </View>
      </ScrollView>
      {footer}
    </SafeAreaView>
  )
}
