import { Utensils, Coffee, Lamp, Flower2, Store, Waves, Landmark, Sparkles, Mountain, Castle, type LucideIcon } from 'lucide-react-native'
import type { TownBuilding } from '../types'

/** Spend XP earned from reviews/lessons to unlock these, one at a time, for My Town. */
export const TOWN_BUILDINGS: (TownBuilding & { icon: LucideIcon })[] = [
  { id: 'noodle-shop', name: 'Noodle Shop', description: 'A steaming bowl of beef noodles on every table.', xpCost: 50, icon: Utensils },
  { id: 'tea-house', name: 'Tea House', description: 'Quiet corners for oolong and conversation.', xpCost: 70, icon: Coffee },
  { id: 'lantern-street', name: 'Lantern Street', description: 'Red lanterns lighting up the evening market.', xpCost: 90, icon: Lamp },
  { id: 'garden-pavilion', name: 'Garden Pavilion', description: 'A koi pond and a place to sit and study.', xpCost: 110, icon: Flower2 },
  { id: 'market-square', name: 'Market Square', description: 'Stalls of fresh produce and street snacks.', xpCost: 130, icon: Store },
  { id: 'riverside-walk', name: 'Riverside Walk', description: 'A path along the water for evening strolls.', xpCost: 150, icon: Waves },
  { id: 'temple', name: 'Temple', description: 'A peaceful courtyard temple at the edge of town.', xpCost: 180, icon: Landmark },
  { id: 'buddhist-statue', name: 'Buddhist Statue', description: 'A tall stone statue watching over the square.', xpCost: 220, icon: Sparkles },
  { id: 'mountain-pagoda', name: 'Mountain Pagoda', description: 'A pagoda on the hillside overlooking the town.', xpCost: 260, icon: Mountain },
  { id: 'grand-palace', name: 'Grand Palace', description: 'The town’s crowning landmark.', xpCost: 320, icon: Castle },
]
