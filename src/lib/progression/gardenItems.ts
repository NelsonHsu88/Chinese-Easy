/*
 * Scholar's Garden: six decorations and four fixed places to put them.
 *
 * A collectible scene rather than a building game — no dragging, no free
 * placement. Each slot holds at most one decoration and each decoration sits in
 * at most one slot. The artwork for each id lives with the screen
 * (`components/profile/art.ts`); this file is the plain data, so it can be
 * tested without a bundler.
 */

export type GardenItemId = 'bamboo' | 'stone_lantern' | 'hanging_lantern' | 'sakura_tree' | 'bonsai' | 'small_pagoda'

export type GardenSlotId = 'left' | 'centerLeft' | 'centerRight' | 'right'

export const GARDEN_SLOTS: GardenSlotId[] = ['left', 'centerLeft', 'centerRight', 'right']

export const GARDEN_SLOT_NAMES: Record<GardenSlotId, string> = {
  left: 'Bamboo grove',
  centerLeft: 'By the pavilion',
  centerRight: 'By the bridge',
  right: 'Far bank',
}

export interface GardenItemDef {
  id: GardenItemId
  name: string
  unlockLevel: number
}

export const GARDEN_ITEMS: GardenItemDef[] = [
  { id: 'bamboo', name: 'Bamboo', unlockLevel: 3 },
  { id: 'stone_lantern', name: 'Stone Lantern', unlockLevel: 6 },
  { id: 'hanging_lantern', name: 'Hanging Lantern', unlockLevel: 9 },
  { id: 'sakura_tree', name: 'Sakura Tree', unlockLevel: 12 },
  { id: 'bonsai', name: 'Bonsai', unlockLevel: 18 },
  { id: 'small_pagoda', name: 'Small Pagoda', unlockLevel: 25 },
]

export function gardenItemById(id: GardenItemId): GardenItemDef {
  const def = GARDEN_ITEMS.find((i) => i.id === id)
  if (!def) throw new Error(`Unknown garden item ${id}`)
  return def
}
