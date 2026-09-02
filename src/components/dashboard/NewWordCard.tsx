import { View, Text } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { DashboardCard, CardArt, CardTitle, CardLink, CardIconBadge, DashButton, DashButtonQuiet } from './parts'
import { dashArt } from './art'
import {
  dashColors as c,
  dashSurfaces,
  dashShoulders,
  dashSpacing as s,
  dashType as t,
  dashHeights,
} from './tokens'
import type { VocabWord, PhoneticScript, ScriptMode } from '../../types'
import { displayWord, displayPinyin, hanziFont } from '../../lib/hanzi'
import { shortGloss } from '../../lib/definitions'

/*
 * The word on offer, shown rather than described.
 *
 * A named word is a far better hook than "learn something new", and it doubles
 * as a free peek at what is next — which is why this card shows the actual
 * candidate from the new-words pool instead of a generic invitation.
 *
 * This card is both one target and three, which the Dashboard could not do until
 * `PressClaim` existed. Pressing the body dips the whole card and opens New
 * Words — the same place "See all" goes, because that is what the card as a
 * whole is offering — while See all, Not now and Add this word keep their own
 * actions. What used to make that impossible was the web target firing the
 * card's handler *as well as* the button's; an inner press now claims itself
 * against its ancestors before the event finishes bubbling.
 */
export function NewWordCard({
  word,
  script,
  phoneticScript,
  onSeeAll,
  onDismiss,
  onAdd,
  added,
}: {
  word: VocabWord
  script: ScriptMode
  phoneticScript: PhoneticScript
  onSeeAll: () => void
  onDismiss: () => void
  onAdd: () => void
  /** Flips the green button to a confirmation once the word is in the deck. */
  added: boolean
}) {
  return (
    <DashboardCard
      fill={dashSurfaces.word.fill}
      border={dashSurfaces.word.border}
      minHeight={dashHeights.word}
      onPress={onSeeAll}
      accessibilityLabel={`Learn a new word: ${displayWord(word, script)}. See all new words.`}
    >
      {/*
        The range fills the lower right and fades into the card's own near-white.
        It stops short of the button row's right edge on purpose — the artwork
        may sit behind the buttons, but a green pill over a dark ridge line
        stops looking like a control.
      */}
      <CardArt
        source={dashArt.wordMountains.source}
        ratio={dashArt.wordMountains.ratio}
        width={214}
        opacity={0.95}
        style={{ right: -12, bottom: 48 }}
      />

      <View style={{ padding: 18, flex: 1 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <CardIconBadge tint={c.greenSoft}>
              <Sparkles size={17} color={c.greenDark} strokeWidth={2.4} />
            </CardIconBadge>
            <CardTitle small>Learn a new word</CardTitle>
          </View>
          <CardLink label="See all" onPress={onSeeAll} outlined color={c.greenDark} borderColor="#BFE3C7" />
        </View>

        {/*
          Word, reading and gloss share one left edge. They are three facts about
          the same thing, and staggering them turns a definition into a list.
        */}
        <View style={{ marginTop: 10, flex: 1 }}>
          <Text className={hanziFont(script, 'semibold')} style={{ ...t.hanzi, color: c.navy }}>
            {displayWord(word, script)}
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.pinyin, color: c.textMuted, marginTop: 1 }}>
            {displayPinyin(word, phoneticScript)}
          </Text>
          <Text
            className="font-nunito-bold"
            numberOfLines={1}
            style={{ ...t.gloss, color: c.navy, marginTop: 2 }}
          >
            {shortGloss(word)}
          </Text>
        </View>

        {/*
          Not an even split. The green action carries the longer label and is
          the one the card is asking for, so it takes the larger share — which
          is also what stops "Add this word" wrapping at small widths.
        */}
        <View className="flex-row" style={{ gap: 10, marginTop: s.md }}>
          <DashButtonQuiet label="Not now" onPress={onDismiss} height={46} flex={1} />
          <DashButton
            label={added ? 'Added ✓' : 'Add this word'}
            onPress={onAdd}
            fill={added ? c.greenDark : c.green}
            /* Confirmed, the face has already dropped to `greenDark`, so its
               side has to drop with it or the button loses its edge. */
            shoulder={added ? dashShoulders.greenDeep : dashShoulders.green}
            flex={1.45}
            height={46}
            accessibilityLabel={`Add ${displayWord(word, script)} to my deck`}
          />
        </View>
      </View>
    </DashboardCard>
  )
}
