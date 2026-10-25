import { View, Text, type ViewStyle } from 'react-native'
import { Volume2, PencilLine, Plus, Check, Sparkles, Star, Trash2 } from 'lucide-react-native'
import { PressScale } from './PressScale'
import { PressableScale, LiftedFace, DASH_LIFT, RaisedButton } from '../dashboard/parts'
import { speak } from '../../lib/speech'
import { playPositiveChime } from '../../lib/sound'
import { tapHaptic, tickHaptic, successHaptic, sequence } from '../../lib/haptics'
import { LOOKUP_HSK_LEVEL } from '../../data/lookupWords'
import { DICT_BG } from './shadows'
import type { EntryState } from '../../lib/dictionary'

/*
 * The dictionary's shared controls.
 *
 * Two rules run through all of them, both from the design brief:
 *
 * 1. Haptics fire when an interaction *changes state*, on release — never on
 *    touch-down. A feel on press-in fires even when the finger slides off and
 *    nothing happens, which trains people to distrust it.
 * 2. Sound is reserved for the deck. Navigating, filtering, scrolling and
 *    opening an entry are silent; adding a word is the one moment worth hearing.
 */

/** Lucide strokes across the dictionary. Slightly heavier than the default 2. */
export const ICON_STROKE = 2

/*
 * Lucide takes a colour prop rather than a class, so these three shadow the
 * `dict-muted` / `dict-green` / `dict-green-dark` entries in the Tailwind
 * config. They are the only place in the dictionary a raw hex belongs, and they
 * have to be changed in step with it — two sources for one palette is exactly
 * how a screen ends up with two nearly-identical greens.
 */
export const ICON_MUTED = '#8290A6'
export const ICON_GREEN = '#4AA54B'
export const ICON_GREEN_DARK = '#3E9845'
/** A favourite's star — the same gold My Words uses (`mwColors.star`). */
export const ICON_STAR = '#E3A93A'

// --- Small pieces -------------------------------------------------------------

/** Pale green HSK pill sitting beside a headword. */
/**
 * A word's graded level, or "Rare" for one that has none.
 *
 * Tier-2 entries (the CC-CEDICT lookup tail) carry `LOOKUP_HSK_LEVEL` because
 * `VocabWord` requires a number, not because anyone graded them — so printing
 * "HSK 7" would invent a level that does not exist, on top of naming a band the
 * HSK scale stops short of. "Rare" is the true statement: this word is outside
 * the graded vocabulary, which is also the useful thing for a learner deciding
 * whether to add it.
 */
export function HskBadge({ level }: { level: number }) {
  const graded = level < LOOKUP_HSK_LEVEL
  return (
    <View className={graded ? 'rounded-full bg-dict-green-pale px-2.5 py-1' : 'rounded-full bg-dict-line px-2.5 py-1'}>
      <Text
        className={
          graded
            ? 'font-nunito-bold text-[12px] leading-[15px] text-dict-green-dark'
            : 'font-nunito-bold text-[12px] leading-[15px] text-dict-muted'
        }
      >
        {graded ? `HSK ${level}` : 'Rare'}
      </Text>
    </View>
  )
}

/** A filter chip's face height: the old flat chip's (10pt padding either side of an 18pt line). */
const CHIP_HEIGHT = 38

/** Filter chip — the HSK row and the All/Hanzi/Pinyin/English row. */
export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  /*
   * Raised, like the filter row's pills and the Add button: `LiftedFace` on a
   * shoulder, sinking onto it when pressed. Selected is the solid green of
   * Add; the rest stand on the pills' soft grey. Compact, so all six HSK
   * levels reach the edge of a 390pt screen rather than trailing off it — the
   * row scrolls, but a level the learner cannot see is a level they will not
   * think to pick.
   */
  return (
    <PressableScale
      onPress={() => {
        // A filter change is a state change, so it gets a tick — and no sound.
        tickHaptic()
        onPress()
      }}
      scaleTo={1}
      haptic={false}
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
    >
      <LiftedFace
        height={CHIP_HEIGHT}
        fill={selected ? DICT_BG.green : DICT_BG.card}
        border={selected ? undefined : DICT_BG.pillBorder}
        shoulder={selected ? DICT_BG.greenShoulder : DICT_BG.pillShoulder}
        shadow={false}
      >
        <Text
          style={{
            paddingHorizontal: 16,
            fontFamily: 'NunitoBold',
            fontSize: 14,
            lineHeight: 18,
            color: selected ? '#ffffff' : '#42526B',
          }}
        >
          {label}
        </Text>
      </LiftedFace>
    </PressableScale>
  )
}

/** Round outlined icon chip — the speaker and practice buttons on an entry card. */
export function IconChip({
  icon,
  onPress,
  label,
  tint = 'green',
  size = 40,
}: {
  icon: 'speaker' | 'practice'
  onPress: () => void
  label: string
  tint?: 'green' | 'muted'
  size?: number
}) {
  const color = tint === 'green' ? ICON_GREEN : ICON_MUTED
  const Icon = icon === 'speaker' ? Volume2 : PencilLine
  return (
    <RaisedButton
      onPress={onPress}
      accessibilityLabel={label}
      height={size}
      width={size}
      radius={size / 2}
      fill={DICT_BG.card}
      border={DICT_BG.pillBorder}
      shoulder={DICT_BG.pillShoulder}
      scaleTo={0.9}
    >
      <Icon size={size * 0.45} color={color} strokeWidth={ICON_STROKE} />
    </RaisedButton>
  )
}

/** Speaker chip wired straight to Mandarin TTS. Playback, so no sound effect of its own. */
export function SpeakChip({ text, size = 40 }: { text: string; size?: number }) {
  return (
    <IconChip
      icon="speaker"
      size={size}
      label={`Play pronunciation of ${text}`}
      onPress={() => {
        tapHaptic()
        speak(text)
      }}
    />
  )
}

// --- Deck state ---------------------------------------------------------------

/*
 * Plain style objects rather than classes, deliberately. This is the control
 * whose state flips when a word is added, and on native that flip was taking
 * NativeWind-applied styles on the word screen down with it (see the comment
 * over `DetailHero`'s button row). A state-dependent style here is just a
 * different object, which React Native applies directly.
 */
const STATE_STYLES: Record<EntryState, { label: string; box: ViewStyle; text: string }> = {
  add: { label: 'Add', box: { backgroundColor: DICT_BG.green }, text: '#ffffff' },
  'in-deck': {
    label: 'In Deck',
    box: { backgroundColor: DICT_BG.card, borderWidth: 1, borderColor: DICT_BG.green },
    text: DICT_BG.greenDark,
  },
  learning: { label: 'Learning', box: { backgroundColor: '#dbeafe' }, text: '#1d4ed8' },
  'new-from-story': { label: 'New from story', box: { backgroundColor: DICT_BG.greenPale }, text: DICT_BG.greenDark },
}

const PILL: ViewStyle = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999 }

/**
 * The trailing control on a result row: adds the word, or reports where it
 * already sits in the deck.
 *
 * Only `add` is interactive. The other three are status, and dressing status up
 * as a button invites taps that can't do anything.
 */
export function DeckStateButton({
  state,
  onAdd,
  compact = false,
}: {
  state: EntryState
  onAdd: () => void
  compact?: boolean
}) {
  const meta = STATE_STYLES[state]
  const faceHeight = compact ? 36 : 44
  const paddingHorizontal = compact ? 14 : 24

  /*
   * A status sits where a pressed Add would have landed — flush on the page,
   * `DASH_LIFT` lower than a raised face — so adding a word reads as the
   * button going down and staying down rather than being swapped for a label.
   */
  if (state !== 'add') {
    return (
      <View style={[PILL, { height: faceHeight, marginTop: DASH_LIFT, paddingHorizontal }, meta.box]}>
        {state === 'in-deck' && <Check size={16} color={ICON_GREEN_DARK} strokeWidth={ICON_STROKE} />}
        {state === 'new-from-story' && <Sparkles size={14} color={ICON_GREEN_DARK} strokeWidth={ICON_STROKE} />}
        <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14, lineHeight: 18, color: meta.text }}>
          {meta.label}
        </Text>
      </View>
    )
  }

  /*
   * Raised: the Dashboard's `LiftedFace`, standing on a darker shoulder and
   * sinking flush onto it on press — the same 3D object as Start Review.
   */
  return (
    <PressableScale
      onPress={() => {
        /*
         * The one place in the dictionary that makes a sound. Adding a word is
         * the screen's whole purpose, and the success feel plus the existing
         * positive chime is the app's established "that worked" pairing.
         */
        sequence([
          { at: 0, fire: tapHaptic },
          { at: 90, fire: successHaptic },
        ])
        playPositiveChime()
        onAdd()
      }}
      scaleTo={1}
      haptic={false}
      accessibilityLabel="Add to deck"
    >
      <LiftedFace height={faceHeight} fill={DICT_BG.green} shoulder={DICT_BG.greenShoulder}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal }}>
          {compact && <Plus size={16} color="#ffffff" strokeWidth={ICON_STROKE} />}
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 15, lineHeight: 19, color: meta.text }}>{meta.label}</Text>
        </View>
      </LiftedFace>
    </PressableScale>
  )
}

/**
 * The favourite star beside the deck button. A toggle, so it ticks rather than
 * chimes — sound in the dictionary is reserved for adding to the deck.
 */
export function FavoriteButton({ favorite, onToggle }: { favorite: boolean; onToggle: () => void }) {
  return (
    <RaisedButton
      onPress={() => {
        tickHaptic()
        onToggle()
      }}
      accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
      height={44}
      width={44}
      radius={22}
      fill={DICT_BG.card}
      border={DICT_BG.pillBorder}
      shoulder={DICT_BG.pillShoulder}
      scaleTo={0.9}
    >
      <Star
        size={22}
        color={favorite ? ICON_STAR : ICON_MUTED}
        fill={favorite ? ICON_STAR : 'transparent'}
        strokeWidth={ICON_STROKE}
      />
    </RaisedButton>
  )
}

/**
 * Taking a word back out of My Words, shown only when the card was opened from
 * My Words.
 *
 * Two steps rather than one: removing drops the card's whole review history,
 * so weeks of scheduling can go on a mis-tap — and a native `Alert` renders as a
 * blocking browser dialog on web. Arming in place costs one extra tap.
 */
export function RemoveFromDeckButton({
  armed,
  onArm,
  onCancel,
  onConfirm,
}: {
  armed: boolean
  onArm: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!armed) {
    return (
      <PressScale
        onPress={() => {
          tickHaptic()
          onArm()
        }}
        accessibilityLabel="Remove from My Words"
        style={{ borderRadius: 999 }}
        innerStyle={[PILL, { paddingVertical: 12 }]}
      >
        <Trash2 size={16} color={DICT_BG.coral} strokeWidth={ICON_STROKE} />
        <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 19, color: DICT_BG.coral }}>
          Remove from My Words
        </Text>
      </PressScale>
    )
  }

  return (
    <View style={{ borderRadius: 20, backgroundColor: DICT_BG.coralPale, padding: 14, gap: 10 }}>
      <Text
        style={{ fontFamily: 'Nunito', fontSize: 14, lineHeight: 19, color: DICT_BG.coral, textAlign: 'center' }}
      >
        Remove this word? Its review progress goes with it.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <RaisedButton
          onPress={() => {
            tickHaptic()
            onCancel()
          }}
          accessibilityLabel="Keep word"
          wrapperStyle={{ flex: 1 }}
          height={44}
          fill={DICT_BG.card}
          border={DICT_BG.pillBorder}
          shoulder={DICT_BG.pillShoulder}
        >
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 15, lineHeight: 19, color: ICON_MUTED }}>Keep</Text>
        </RaisedButton>
        <RaisedButton
          onPress={() => {
            tapHaptic()
            onConfirm()
          }}
          accessibilityLabel="Confirm remove"
          wrapperStyle={{ flex: 1 }}
          height={44}
          fill={DICT_BG.coral}
          shoulder={DICT_BG.coralShoulder}
        >
          <Trash2 size={16} color="#ffffff" strokeWidth={ICON_STROKE} />
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 15, lineHeight: 19, color: '#ffffff' }}>Remove</Text>
        </RaisedButton>
      </View>
    </View>
  )
}

/** Circular green "+" used in the compact starter-list rows. */
export function AddCircleButton({ onAdd, added }: { onAdd: () => void; added: boolean }) {
  if (added) {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-dict-green">
        <Check size={15} color="#ffffff" strokeWidth={2.5} />
      </View>
    )
  }
  return (
    <RaisedButton
      onPress={() => {
        sequence([
          { at: 0, fire: tapHaptic },
          { at: 90, fire: successHaptic },
        ])
        playPositiveChime()
        onAdd()
      }}
      accessibilityLabel="Add to deck"
      height={28}
      width={28}
      radius={14}
      fill={DICT_BG.card}
      border={DICT_BG.green}
      shoulder={DICT_BG.green}
      scaleTo={0.88}
      hitSlop={8}
    >
      <Plus size={15} color={ICON_GREEN} strokeWidth={2.5} />
    </RaisedButton>
  )
}
