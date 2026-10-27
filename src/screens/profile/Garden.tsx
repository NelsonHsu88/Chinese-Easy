import { useState } from 'react'
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native'
import { useApp } from '../../context/AppContext'
import { getLevelFromXp } from '../../lib/progression/levels'
import {
  GARDEN_ITEMS,
  GARDEN_SLOTS,
  GARDEN_SLOT_NAMES,
  gardenItemById,
  type GardenItemId,
  type GardenSlotId,
} from '../../lib/progression/gardenItems'
import { slotOf } from '../../lib/progression/state'
import { ProfileSubpage, GardenScene, DecorationThumb, Tag, ProfileButton } from '../../components/profile/parts'
import {
  profColors as c,
  profSpacing as s,
  profType as t,
  profRadius,
  profShadow,
  decorationShadow,
  PROF_ART_RATIO,
} from '../../components/profile/tokens'
import { playTints } from '../../components/dashboard/tokens'
import { PlayWash } from '../../components/dashboard/playWash'
import { tickHaptic, tapHaptic } from '../../lib/haptics'

/*
 * Scholar's Garden — the long view of a learner's journey.
 *
 * A fixed scene with four places to put things, not a building game: pick a
 * decoration from the tray, place it, and it takes the first free place. When
 * all four are taken, the screen asks which one to swap out rather than
 * guessing. Decorations unlock by level and never go away.
 *
 * The page is pinned to the screen (no scrolling): the painting takes the
 * height the tray and the panel under it leave, and the "which place makes
 * way?" choice opens over the bottom of the page rather than growing it.
 */

/** The tray's row: a 96pt card, the shadow's room above and below it. */
const TRAY_H = 186
/** The panel under the tray, at rest: "How your garden grows", or the selected decoration. */
const PANEL_H = 148
/** Everything else under the painting: its caption and the tray's heading, with their gaps. */
const BETWEEN_H = 28 + 50 + 12
/** The title block above the children (`ProfileSubpage`): back row, title, two subtitle lines, gap. */
const HEADER_H = 48 + 40 + 4 + 42 + 24
/** The painting never shrinks below this; under it the panel's guide gives way instead. */
const SCENE_MIN_H = 96

export function Garden() {
  const { xp, progression, placeGardenItem, removeGardenItem } = useApp()
  const level = getLevelFromXp(xp)
  const [selected, setSelected] = useState<GardenItemId | null>(null)
  /** True while the learner is choosing which full slot the selection replaces. */
  const [choosing, setChoosing] = useState(false)
  const { height: winH } = useWindowDimensions()

  const slots = progression.garden.slots
  const placedCount = GARDEN_SLOTS.filter((slot) => slots[slot]).length
  const selectedSlot = selected ? slotOf(progression, selected) : undefined
  const nextItem = GARDEN_ITEMS.find((i) => !progression.garden.unlockedItemIds.includes(i.id))

  const select = (item: GardenItemId) => {
    tickHaptic()
    setChoosing(false)
    setSelected((current) => (current === item ? null : item))
  }

  return (
    <ProfileSubpage fixed title="Scholar’s Garden" subtitle="Decorate your garden with rewards from your journey.">
      {(width) => {
        /*
         * The body's height, estimated from the window (onLayout can't be relied
         * on to fire on web): what the title block, the tray and the panel leave
         * is the painting's. On a short phone the guide card steps aside first.
         */
        const body = winH - HEADER_H - 60
        const roomWithGuide = body - BETWEEN_H - TRAY_H - PANEL_H
        const showGuide = roomWithGuide >= SCENE_MIN_H || !!selected
        const sceneRoom = showGuide ? roomWithGuide : body - BETWEEN_H - TRAY_H
        const sceneW = Math.round(Math.max(SCENE_MIN_H * PROF_ART_RATIO.garden, Math.min(width - 2, sceneRoom * PROF_ART_RATIO.garden)))
        return (
          <View style={{ flex: 1 }}>
            <View
              style={{
                alignSelf: 'center',
                backgroundColor: c.tile,
                borderRadius: profRadius.large,
                borderWidth: 1,
                borderColor: c.border,
                overflow: 'hidden',
                ...profShadow,
              }}
            >
              <GardenScene width={sceneW} slots={slots} emptySlots />
            </View>
            <Text numberOfLines={1} className="font-nunito-semibold" style={{ ...t.tag, color: c.slate, marginTop: s.sm, textAlign: 'center' }}>
              {placedCount} of {GARDEN_SLOTS.length} places decorated
              {nextItem ? ` · Next: ${nextItem.name} at Level ${nextItem.unlockLevel}` : ' · Collection complete'}
            </Text>

            <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ ...t.section, fontSize: 20, color: c.navy, marginTop: s.lg }}>
              Your Decorations
            </Text>
            {/* The tray still swipes sideways; only the page is pinned. Padding top and bottom so the cards' shadows aren't clipped. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: s.md, paddingTop: 8, paddingBottom: 14 }}
              style={{ marginHorizontal: -s.screen, flexGrow: 0 }}
            >
              <View style={{ width: s.screen - s.md }} />
              {GARDEN_ITEMS.map((def) => {
                const unlocked = progression.garden.unlockedItemIds.includes(def.id)
                const placed = !!slotOf(progression, def.id)
                const active = selected === def.id
                return (
                  <Pressable
                    key={def.id}
                    onPress={unlocked ? () => select(def.id) : undefined}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: !unlocked }}
                    accessibilityLabel={`${def.name}. ${unlocked ? (placed ? 'In your garden.' : 'Not placed.') : `Unlocks at level ${def.unlockLevel}.`}`}
                  >
                    {/* Every decoration on the same white card, lifted by its shadow; a picked one gets the jade rim. */}
                    <View
                      style={{
                        width: 96,
                        alignItems: 'center',
                        paddingVertical: s.sm,
                        borderRadius: profRadius.medium,
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? c.jade : c.border,
                        backgroundColor: c.decoration,
                        ...decorationShadow,
                      }}
                    >
                      <DecorationThumb item={def.id} size={60} dim={!unlocked} />
                      {/* Two lines, centred: "Hanging Lantern" truncated to "Hanging Lant…" on one. */}
                      <Text
                        className="font-nunito-semibold"
                        numberOfLines={2}
                        style={{ ...t.tileTitle, fontSize: 13, lineHeight: 16, color: c.navy, marginTop: 6, textAlign: 'center', minHeight: 32, paddingHorizontal: 4 }}
                      >
                        {def.name}
                      </Text>
                      <View style={{ marginTop: 4 }}>
                        {!unlocked ? <Tag tone="locked">Level {def.unlockLevel}</Tag> : placed ? <Tag tone="on">Placed</Tag> : <Tag tone="off">Ready</Tag>}
                      </View>
                    </View>
                  </Pressable>
                )
              })}
              <View style={{ width: s.screen - s.md }} />
            </ScrollView>

            {/* The panel: how the garden grows, or what to do with the decoration picked. */}
            {!selected && showGuide && (
              <View
                style={{
                  marginTop: s.sm,
                  borderRadius: profRadius.large,
                  borderWidth: 1,
                  borderColor: playTints.honey.border,
                  backgroundColor: playTints.honey.fill,
                  padding: s.md,
                  gap: s.sm,
                }}
              >
                <PlayWash tint={playTints.honey} radius={profRadius.large - 1} />
                <Text className="font-nunito-extrabold" style={{ fontSize: 17, lineHeight: 22, color: c.navy }}>
                  {progression.garden.unlockedItemIds.length === 0
                    ? `First decoration at Level ${GARDEN_ITEMS[0].unlockLevel} · you are Level ${level}`
                    : 'How your garden grows'}
                </Text>
                {[
                  { hue: 'jade', n: '1', line: 'Learn and review words to earn XP.' },
                  { hue: 'sky', n: '2', line: 'Each new level unlocks a decoration.' },
                  { hue: 'blossom', n: '3', line: 'Tap a decoration, then place it.' },
                ].map((step) => {
                  const tint = playTints[step.hue as 'jade' | 'sky' | 'blossom']
                  return (
                    <View key={step.n} style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: tint.badge, alignItems: 'center', justifyContent: 'center' }}>
                        <Text className="font-nunito-extrabold" style={{ fontSize: 13, lineHeight: 17, color: c.background }}>
                          {step.n}
                        </Text>
                      </View>
                      <Text className="font-nunito-semibold" numberOfLines={1} style={{ ...t.body, flex: 1, color: c.navy }}>
                        {step.line}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}

            {selected && (
              <View style={{ marginTop: s.sm, backgroundColor: c.card, borderRadius: profRadius.large, borderWidth: 1, borderColor: c.border, padding: s.md, ...profShadow }}>
                <Text className="font-nunito-extrabold" style={{ fontSize: 17, lineHeight: 22, color: c.navy }}>
                  {gardenItemById(selected).name}
                </Text>
                <Text className="font-nunito-semibold" style={{ ...t.body, color: c.slate, marginTop: 2 }}>
                  {selectedSlot ? `In your garden · ${GARDEN_SLOT_NAMES[selectedSlot]}` : 'In your collection'}
                </Text>
                <View className="flex-row" style={{ gap: s.sm, marginTop: s.md }}>
                  {!selectedSlot ? (
                    <ProfileButton
                      label="Place in Garden"
                      tone="primary"
                      onPress={() => {
                        tapHaptic()
                        if (!placeGardenItem(selected)) setChoosing(true)
                      }}
                    />
                  ) : (
                    <ProfileButton
                      label="Remove from Garden"
                      tone="quiet"
                      onPress={() => {
                        tapHaptic()
                        removeGardenItem(selected)
                      }}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Every place taken: the choice opens over the bottom of the page, two by two, rather than pushing the page past the screen. */}
            {selected && choosing && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: c.card,
                  borderRadius: profRadius.large,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: s.md,
                  ...decorationShadow,
                }}
              >
                <Text className="font-nunito-extrabold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
                  Every place is taken. Which should make way?
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginTop: s.sm }}>
                  {GARDEN_SLOTS.map((slot: GardenSlotId) => {
                    const occupant = slots[slot]
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => {
                          tapHaptic()
                          placeGardenItem(selected, slot)
                          setChoosing(false)
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Replace ${occupant ? gardenItemById(occupant).name : 'nothing'} at ${GARDEN_SLOT_NAMES[slot]}`}
                        style={{ width: (width - s.md * 2 - 2 - s.sm) / 2 }}
                      >
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, borderRadius: profRadius.medium, borderWidth: 1, borderColor: c.border, backgroundColor: c.decoration, padding: s.sm }}
                        >
                          {occupant && <DecorationThumb item={occupant} size={32} />}
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} className="font-nunito-extrabold" style={{ fontSize: 13.5, color: c.navy }}>
                              {GARDEN_SLOT_NAMES[slot]}
                            </Text>
                            <Text numberOfLines={1} className="font-nunito-semibold" style={{ ...t.tag, color: c.slate }}>
                              {occupant ? gardenItemById(occupant).name : 'Empty'}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
                <Pressable onPress={() => setChoosing(false)} accessibilityRole="button" style={{ alignItems: 'center', paddingTop: s.sm }}>
                  <Text className="font-nunito-semibold" style={{ ...t.link, color: c.slate }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )
      }}
    </ProfileSubpage>
  )
}
