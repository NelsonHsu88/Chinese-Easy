/*
 * The three profile cosmetics — and deliberately only three.
 *
 * Every one of them changes the Profile screen and nothing else: the Misty
 * Mountain Background paints the profile page, the Sakura Frame rings the
 * avatar, Jade Ink colours the profile's XP bar and accents. None of them
 * reaches the writing canvas, the tab bar or any other screen. They unlock by
 * level and are never bought — there is no currency in this app.
 */

export type ProfileRewardId = 'misty_mountain_background' | 'sakura_frame' | 'jade_ink'

export interface ProfileRewardDef {
  id: ProfileRewardId
  name: string
  /** What it changes, in one line — shown on the Rewards page. */
  description: string
  unlockLevel: number
}

export const PROFILE_REWARDS: ProfileRewardDef[] = [
  {
    id: 'misty_mountain_background',
    name: 'Misty Mountain Background',
    description: 'A pale mountain range behind your profile card.',
    unlockLevel: 5,
  },
  {
    id: 'sakura_frame',
    name: 'Sakura Frame',
    description: 'A ring of blossom around your profile picture.',
    unlockLevel: 10,
  },
  {
    id: 'jade_ink',
    name: 'Jade Ink',
    description: 'Deep jade for your XP bar and profile accents.',
    unlockLevel: 15,
  },
]

export function profileRewardById(id: ProfileRewardId): ProfileRewardDef {
  const def = PROFILE_REWARDS.find((r) => r.id === id)
  if (!def) throw new Error(`Unknown profile reward ${id}`)
  return def
}
