import { Utensils, Coffee, Lamp, Flower2, Store, Waves, Landmark, Sparkles, Mountain, Castle, type LucideIcon } from 'lucide-react-native'
import type { ImageSourcePropType } from 'react-native'
import type { TownBuilding } from '../types'

/**
 * Spend XP earned from reviews/lessons to unlock these, one at a time, for My Town.
 *
 * `image` is the isometric sprite shown on the town map and in the building detail
 * sheet; `icon` is the lucide fallback used where a full sprite would be too large
 * (compact list rows, the dashboard card). Sprites are generated from the source
 * artwork by scripts/processBuildingAssets.mjs — re-run it if the source art changes.
 */
export const TOWN_BUILDINGS: (TownBuilding & { icon: LucideIcon; image: ImageSourcePropType })[] = [
  { id: 'noodle-shop', name: 'Noodle Shop', description: 'A steaming bowl of beef noodles on every table.', xpCost: 50, icon: Utensils, image: require('../assets/images/buildings/noodle-shop.png') },
  { id: 'tea-house', name: 'Tea House', description: 'Quiet corners for oolong and conversation.', xpCost: 70, icon: Coffee, image: require('../assets/images/buildings/tea-house.png') },
  { id: 'lantern-street', name: 'Lantern Street', description: 'Red lanterns lighting up the evening market.', xpCost: 90, icon: Lamp, image: require('../assets/images/buildings/lantern-street.png') },
  { id: 'garden-pavilion', name: 'Garden Pavilion', description: 'A koi pond and a place to sit and study.', xpCost: 110, icon: Flower2, image: require('../assets/images/buildings/garden-pavilion.png') },
  { id: 'market-square', name: 'Market Square', description: 'Stalls of fresh produce and street snacks.', xpCost: 130, icon: Store, image: require('../assets/images/buildings/market-square.png') },
  { id: 'riverside-walk', name: 'Riverside Walk', description: 'A path along the water for evening strolls.', xpCost: 150, icon: Waves, image: require('../assets/images/buildings/riverside-walk.png') },
  { id: 'temple', name: 'Temple', description: 'A peaceful courtyard temple at the edge of town.', xpCost: 180, icon: Landmark, image: require('../assets/images/buildings/temple.png') },
  { id: 'buddhist-statue', name: 'Buddhist Statue', description: 'A tall stone statue watching over the square.', xpCost: 220, icon: Sparkles, image: require('../assets/images/buildings/buddhist-statue.png') },
  { id: 'mountain-pagoda', name: 'Mountain Pagoda', description: 'A pagoda on the hillside overlooking the town.', xpCost: 260, icon: Mountain, image: require('../assets/images/buildings/mountain-pagoda.png') },
  { id: 'grand-palace', name: 'Grand Palace', description: 'The town’s crowning landmark.', xpCost: 320, icon: Castle, image: require('../assets/images/buildings/grand-palace.png') },
]
