import type { AppSettings, SrsCard, VocabWord } from '../types'
import { isPastOrToday } from './date'

export function orderCards(cards: SrsCard[], order: AppSettings['reviewOrder']): SrsCard[] {
  const copy = [...cards]
  if (order === 'shuffled') {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  if (order === 'hardest-first') {
    return copy.sort((a, b) => a.easeFactor - b.easeFactor || a.dueDate.localeCompare(b.dueDate))
  }
  return copy.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** Cards that are actually ready to review right now (ignores cards mid remedial-practice). */
export function dueCardsFor(deck: SrsCard[], settings: AppSettings): SrsCard[] {
  const ready = deck.filter((c) => c.practiceQueue === 0 && isPastOrToday(c.dueDate))
  return orderCards(ready, settings.reviewOrder).slice(0, settings.dailyReviewLimit)
}

/** Every due card, unlimited by the daily review cap — for browsing, not the review session itself. */
export function allDueCardsFor(deck: SrsCard[], settings: AppSettings): SrsCard[] {
  const ready = deck.filter((c) => c.practiceQueue === 0 && isPastOrToday(c.dueDate))
  return orderCards(ready, settings.reviewOrder)
}

export function dueCountFor(deck: SrsCard[]): number {
  return deck.filter((c) => c.practiceQueue === 0 && isPastOrToday(c.dueDate)).length
}

export function newWordsPool(allWords: VocabWord[], deck: SrsCard[], settings: AppSettings): VocabWord[] {
  const addedIds = new Set(deck.map((c) => c.wordId))
  return allWords
    .filter((w) => !addedIds.has(w.id) && !w.custom)
    .filter((w) => w.hskLevel <= settings.hskLevel + 1)
    .sort((a, b) => a.hskLevel - b.hskLevel || a.id.localeCompare(b.id))
}
