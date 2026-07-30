import { Layers, Utensils, Users, Plane, Smartphone, Coffee, Sparkles, Music, type LucideIcon } from 'lucide-react-native'
import type { Unit } from '../types'

/** Duolingo-style unit path. Only "the-basics" is fully authored today (see data/lessons.ts) — the rest ship as a visible, locked roadmap. */
export const UNITS: (Unit & { icon: LucideIcon })[] = [
  { id: 'the-basics', title: 'The Basics', description: 'Radicals, stroke order, grammar, numbers, and pronouns', order: 1, hanzi: '基礎', pinyin: 'jīchǔ', icon: Layers },
  { id: 'basic-food', title: 'Basic Food', description: 'Ordering, dishes, and dining out', order: 2, hanzi: '飲食', pinyin: 'yǐnshí', icon: Utensils },
  { id: 'friendship', title: 'Friendship', description: 'Meeting people and making plans', order: 3, hanzi: '友誼', pinyin: 'yǒuyì', icon: Users },
  { id: 'travel', title: 'Travel', description: 'Getting around and asking directions', order: 4, hanzi: '旅行', pinyin: 'lǚxíng', icon: Plane },
  { id: 'electronics', title: 'Electronics', description: 'Phones, apps, and the internet', order: 5, hanzi: '電子產品', pinyin: 'diànzǐ chǎnpǐn', icon: Smartphone },
  { id: 'lifestyle', title: 'Lifestyle', description: 'Daily routines and habits', order: 6, hanzi: '生活方式', pinyin: 'shēnghuó fāngshì', icon: Coffee },
  { id: 'beauty', title: 'Beauty', description: 'Style, skincare, and shopping', order: 7, hanzi: '美容', pinyin: 'měiróng', icon: Sparkles },
  { id: 'pop-culture', title: 'Pop Culture', description: 'Music, film, and celebrities', order: 8, hanzi: '流行文化', pinyin: 'liúxíng wénhuà', icon: Music },
]
