import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Sparkles, X } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { newWordsPool } from '../lib/selectors'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { shortGloss } from '../lib/definitions'
import { playTapSound } from '../lib/sound'
import { tapHaptic, tickHaptic } from '../lib/haptics'

/*
 * Asks, on the Dashboard, whether the learner wants to pick up a new word — and
 * shows the actual word it's offering rather than a generic invitation. A named
 * word is a far better hook than "learn something new", and it doubles as a free
 * peek at what's next.
 *
 * A card rather than a modal on launch: this asks a question every single time
 * the app opens, and a dialog that has to be dismissed before you can reach your
 * reviews would wear out within a week.
 *
 * Dismissal lasts for the session only, so it reappears next launch without
 * needing any persisted state of its own.
 */
export function NewWordPrompt() {
  const { wordBank, deck, settings, wordsLearnedToday, addToReviewDeck } = useApp()
  const [dismissed, setDismissed] = useState(false)

  const next = useMemo(() => newWordsPool(wordBank, deck, settings)[0], [wordBank, deck, settings])

  const reachedDailyGoal = wordsLearnedToday >= settings.dailyNewWordLimit
  if (dismissed || !next || reachedDailyGoal) return null

  const openNewWords = () => {
    playTapSound()
    tapHaptic()
    router.push('/new-words')
  }

  return (
    <View className="rounded-3xl bg-white p-4 shadow-card dark:bg-slate-900">
      <View className="flex-row items-start gap-2">
        <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
          <Sparkles size={15} color="#16a34a" />
        </View>
        <Text className="flex-1 text-base font-extrabold text-slate-900 dark:text-white">
          Want to learn a new word?
        </Text>
        <Pressable
          onPress={() => {
            tickHaptic()
            setDismissed(true)
          }}
          accessibilityRole="button"
          accessibilityLabel="Not right now"
          hitSlop={10}
          className="p-0.5"
        >
          <X size={18} color="#94a3b8" />
        </Pressable>
      </View>

      {/* The offer itself. Tapping the word goes straight in, same as the button. */}
      <Pressable
        onPress={openNewWords}
        accessibilityRole="button"
        accessibilityLabel={`Learn ${displayWord(next, settings.script)}, ${shortGloss(next)}`}
        className="mt-3 flex-row items-baseline gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-3 active:opacity-80 dark:bg-slate-800/60"
      >
        <Text className="font-hanzi text-[30px] leading-[38px] text-slate-900 dark:text-white">
          {displayWord(next, settings.script)}
        </Text>
        <View className="flex-1">
          <Text className="text-xs text-slate-400">{displayPinyin(next, settings.phoneticScript)}</Text>
          <Text numberOfLines={1} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {shortGloss(next)}
          </Text>
        </View>
      </Pressable>

      <View className="mt-3 flex-row gap-2.5">
        <Pressable
          onPress={() => {
            tickHaptic()
            setDismissed(true)
          }}
          accessibilityRole="button"
          className="flex-1 items-center rounded-2xl border border-slate-200 py-3 active:opacity-70 dark:border-slate-700"
        >
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Not now</Text>
        </Pressable>
        {/*
          Adds this one word and stays put, for the learner who wants a word
          without committing to a session. The queue is the other button.
        */}
        <Pressable
          onPress={() => {
            playTapSound()
            tapHaptic()
            addToReviewDeck(next.id)
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${displayWord(next, settings.script)} to my deck`}
          className="flex-1 items-center rounded-2xl border border-brand-500 py-3 active:opacity-70"
        >
          <Text className="text-sm font-bold text-brand-700 dark:text-brand-300">Add this one</Text>
        </Pressable>
        <Pressable
          onPress={openNewWords}
          accessibilityRole="button"
          className="flex-1 items-center rounded-2xl bg-brand-500 py-3 shadow-card active:opacity-80"
        >
          <Text className="text-sm font-bold text-white">Let's go</Text>
        </Pressable>
      </View>
    </View>
  )
}
