import { View, Text } from 'react-native'
import { Volume2, PencilLine, Plus, Check, Sparkles } from 'lucide-react-native'
import { PressScale } from './PressScale'
import { speak } from '../../lib/speech'
import { playPositiveChime } from '../../lib/sound'
import { tapHaptic, tickHaptic, successHaptic, sequence } from '../../lib/haptics'
import { LOOKUP_HSK_LEVEL } from '../../data/lookupWords'
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
            ? 'font-dict-bold text-[12px] leading-[15px] text-dict-green-dark'
            : 'font-dict-bold text-[12px] leading-[15px] text-dict-muted'
        }
      >
        {graded ? `HSK ${level}` : 'Rare'}
      </Text>
    </View>
  )
}

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
  return (
    <PressScale
      onPress={() => {
        // A filter change is a state change, so it gets a tick — and no sound.
        tickHaptic()
        onPress()
      }}
      accessibilityLabel={label}
      /* Compact, so all six HSK levels reach the edge of a 390pt screen rather
         than trailing off it — the row scrolls, but a level the learner cannot
         see is a level they will not think to pick. */
      className={`items-center justify-center rounded-full px-4 py-2.5 ${
        selected ? 'bg-dict-green' : 'border border-dict-line bg-dict-card'
      }`}
    >
      <Text className={`font-dict-bold text-[14px] leading-[18px] ${selected ? 'text-white' : 'text-dict-body'}`}>
        {label}
      </Text>
    </PressScale>
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
    <PressScale
      onPress={onPress}
      accessibilityLabel={label}
      style={{ width: size, height: size }}
      className="h-full w-full items-center justify-center rounded-full border border-dict-line bg-dict-card"
    >
      <Icon size={size * 0.45} color={color} strokeWidth={ICON_STROKE} />
    </PressScale>
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

const STATE_STYLES: Record<EntryState, { label: string; className: string; textClass: string }> = {
  add: { label: 'Add', className: 'bg-dict-green', textClass: 'text-white' },
  'in-deck': {
    label: 'In Deck',
    className: 'border border-dict-green bg-dict-card',
    textClass: 'text-dict-green-dark',
  },
  learning: { label: 'Learning', className: 'bg-[#dbeafe]', textClass: 'text-[#1d4ed8]' },
  'new-from-story': { label: 'New from story', className: 'bg-dict-green-pale', textClass: 'text-dict-green-dark' },
}

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
  const padding = compact ? 'px-3.5 py-2' : 'px-6 py-3'

  if (state !== 'add') {
    return (
      <View className={`flex-row items-center gap-1.5 rounded-full ${padding} ${meta.className}`}>
        {state === 'in-deck' && <Check size={16} color={ICON_GREEN_DARK} strokeWidth={ICON_STROKE} />}
        {state === 'new-from-story' && <Sparkles size={14} color={ICON_GREEN_DARK} strokeWidth={ICON_STROKE} />}
        <Text className={`font-dict-semibold text-[14px] leading-[18px] ${meta.textClass}`}>{meta.label}</Text>
      </View>
    )
  }

  return (
    <PressScale
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
      accessibilityLabel="Add to deck"
      className={`flex-row items-center justify-center gap-1.5 rounded-full ${padding} ${meta.className}`}
    >
      {compact && <Plus size={16} color="#ffffff" strokeWidth={ICON_STROKE} />}
      <Text className={`font-dict-bold text-[15px] leading-[19px] ${meta.textClass}`}>{meta.label}</Text>
    </PressScale>
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
    <PressScale
      onPress={() => {
        sequence([
          { at: 0, fire: tapHaptic },
          { at: 90, fire: successHaptic },
        ])
        playPositiveChime()
        onAdd()
      }}
      accessibilityLabel="Add to deck"
      style={{ width: 28, height: 28 }}
      className="h-full w-full items-center justify-center rounded-full border-2 border-dict-green bg-dict-card"
    >
      <Plus size={15} color={ICON_GREEN} strokeWidth={2.5} />
    </PressScale>
  )
}
