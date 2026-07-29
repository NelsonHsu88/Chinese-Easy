import { UtensilsCrossed, Plane, Users, Briefcase, FlaskConical, Sun, type LucideIcon } from 'lucide-react-native'
import type { WordCategory } from '../types'

export const CATEGORY_META: Record<WordCategory, { label: string; icon: LucideIcon }> = {
  food: { label: 'Food & Drink', icon: UtensilsCrossed },
  travel: { label: 'Travel & Places', icon: Plane },
  people: { label: 'People & Relationships', icon: Users },
  work: { label: 'Work & Study', icon: Briefcase },
  science: { label: 'Science & Tech', icon: FlaskConical },
  daily: { label: 'Daily Life', icon: Sun },
}

export const CATEGORY_ORDER: WordCategory[] = ['daily', 'food', 'travel', 'people', 'work', 'science']
