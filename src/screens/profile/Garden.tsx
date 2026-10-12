import { useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
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
import { profColors as c, profSpacing as s, profType as t, profRadius, profShadow } from '../../components/profile/tokens'
import { tickHaptic, tapHaptic } from '../../lib/haptics'

/*
 * Scholar's Garden — the long view of a learner's journey.
 *
 * A fixed scene with four places to put things, not a building game: pick a
 * decoration from the tray, place it, and it takes the first free place. When
 * all four are taken, the screen asks which one to swap out rather than
 * guessing. Decorations unlock by level and never go away.
 */
export function Garden() {
  const { xp, progression, placeGardenItem, removeGardenItem } = useApp()
  const level = getLevelFromXp(xp)
  const [selected, setSelected] = useState<GardenItemId | null>(null)
  /** True while the learner is choosing which full slot the selection replaces. */
  const [choosing, setChoosing] = useState(false)

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
    <ProfileSubpage title="Scholar’s Garden" subtitle="Decorate your garden with rewards from your journey.">
      {(width) => (
        <View>
          <View style={{ backgroundColor: c.tile, borderRadius: profRadius.large, borderWidth: 1, borderColor: c.border, overflow: 'hidden', ...profShadow }}>
            <GardenScene width={width - 2} slots={slots} emptySlots />
          </View>
          <Text className="font-lora" style={{ ...t.tag, color: c.slate, marginTop: s.sm, textAlign: 'center' }}>
            {placedCount} of {GARDEN_SLOTS.length} places decorated
            {nextItem ? ` · Next: ${nextItem.name} at Level ${nextItem.unlockLevel}` : ' · Collection complete'}
          </Text>

          <Text className="font-lora-bold" accessibilityRole="header" style={{ ...t.section, fontSize: 20, color: c.navy, marginTop: s.xl, marginBottom: s.sm }}>
            Your Decorations
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: s.sm, paddingVertical: 4 }} style={{ marginHorizontal: -s.screen }}>
            <View style={{ width: s.screen - s.sm }} />
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
                  className="items-center"
                  style={{
                    width: 96,
                    paddingVertical: s.sm,
                    borderRadius: profRadius.medium,
                    borderWidth: 1.5,
                    borderColor: active ? c.jade : c.border,
                    backgroundColor: active ? c.mint : placed ? c.earnedTile : c.card,
                  }}
                >
                  <DecorationThumb item={def.id} size={60} dim={!unlocked} />
                  {/* Two lines, centred: "Hanging Lantern" truncated to "Hanging
                      Lant…" on one. */}
                  <Text
                    className="font-lora"
                    numberOfLines={2}
                    style={{ ...t.tileTitle, fontSize: 13, lineHeight: 16, color: c.navy, marginTop: 6, textAlign: 'center', minHeight: 32, paddingHorizontal: 4 }}
                  >
                    {def.name}
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    {!unlocked ? (
                      <Tag tone="locked">Level {def.unlockLevel}</Tag>
                    ) : placed ? (
                      <Tag tone="on">Placed</Tag>
                    ) : (
                      <Tag tone="off">Ready</Tag>
                    )}
                  </View>
                </Pressable>
              )
            })}
            <View style={{ width: s.screen - s.sm }} />
          </ScrollView>

          {!selected && progression.garden.unlockedItemIds.length > 0 && (
            <Text className="font-lora" style={{ ...t.body, color: c.slate, marginTop: s.md, textAlign: 'center' }}>
              Tap a decoration to place it or take it out.
            </Text>
          )}

          {progression.garden.unlockedItemIds.length === 0 && (
            <Text className="font-lora" style={{ ...t.body, color: c.slate, marginTop: s.md }}>
              Your first decoration, {GARDEN_ITEMS[0].name}, arrives at Level {GARDEN_ITEMS[0].unlockLevel}. You are Level {level}.
            </Text>
          )}

          {selected && (
            <View style={{ marginTop: s.lg, backgroundColor: c.card, borderRadius: profRadius.large, borderWidth: 1, borderColor: c.border, padding: s.md, ...profShadow }}>
              <Text className="font-lora-bold" style={{ fontSize: 17, lineHeight: 22, color: c.navy }}>
                {gardenItemById(selected).name}
              </Text>
              <Text className="font-lora" style={{ ...t.body, color: c.slate, marginTop: 2 }}>
                {selectedSlot ? `In your garden · ${GARDEN_SLOT_NAMES[selectedSlot]}` : 'In your collection'}
              </Text>

              {!choosing && (
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
              )}

              {choosing && (
                <View style={{ marginTop: s.md }}>
                  <Text className="font-lora" style={{ ...t.body, color: c.navy }}>
                    Every place is taken. Which should make way?
                  </Text>
                  <View style={{ gap: s.sm, marginTop: s.sm }}>
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
                          className="flex-row items-center active:opacity-70"
                          style={{ gap: s.md, borderRadius: profRadius.medium, borderWidth: 1, borderColor: c.border, backgroundColor: c.tile, padding: s.sm }}
                        >
                          {occupant && <DecorationThumb item={occupant} size={40} />}
                          <View style={{ flex: 1 }}>
                            <Text className="font-lora-bold" style={{ fontSize: 14, color: c.navy }}>
                              {GARDEN_SLOT_NAMES[slot]}
                            </Text>
                            <Text className="font-lora" style={{ ...t.tag, color: c.slate }}>
                              {occupant ? gardenItemById(occupant).name : 'Empty'}
                            </Text>
                          </View>
                          <Text className="font-lora" style={{ ...t.link, color: c.jadeDark }}>
                            Replace
                          </Text>
                        </Pressable>
                      )
                    })}
                    <Pressable onPress={() => setChoosing(false)} accessibilityRole="button" className="items-center active:opacity-60" style={{ paddingVertical: s.sm }}>
                      <Text className="font-lora" style={{ ...t.link, color: c.slate }}>
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </ProfileSubpage>
  )
}
