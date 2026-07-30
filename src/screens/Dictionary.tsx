import { useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Search, Volume2, PlusCircle, Check, X } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, foldPinyin } from '../lib/hanzi'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { RADICALS } from '../data/radicals'
import { TOWN_BUILDINGS } from '../data/townBuildings'
import { speak } from '../lib/speech'
import { playTapSound } from '../lib/sound'
import { todayISO } from '../lib/date'
import type { VocabWord } from '../types'

type Tab = 'words' | 'radicals' | 'my-words'

/** The four shown in the "Common Radicals" strip, matching the reference design. */
const COMMON_RADICAL_IDS = ['r-ren', 'r-kou', 'r-shou', 'r-mu']

/** Horizontal + both diagonals of the 米字格 guide; the vertical is drawn separately. */
const GUIDES = [{ rotate: undefined }, { rotate: '45deg' }, { rotate: '-45deg' }] as const

/** Round speaker chip used on the word card, history rows and word of the day. */
function SpeakChip({ text, size = 18 }: { text: string; size?: number }) {
  return (
    <Pressable
      onPress={() => speak(text)}
      accessibilityRole="button"
      accessibilityLabel={`Play pronunciation of ${text}`}
      className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-card active:opacity-70"
    >
      <Volume2 size={size} color="#1e293b" />
    </Pressable>
  )
}

/**
 * Deterministic word of the day: the date string seeds an index into the bank, so
 * every device shows the same word on a given day and it changes exactly at midnight.
 */
function pickWordOfTheDay(bank: VocabWord[]): VocabWord | undefined {
  if (bank.length === 0) return undefined
  let hash = 0
  for (const ch of todayISO()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return bank[hash % bank.length]
}

export function Dictionary() {
  const { wordBank, settings, deck, addToReviewDeck, recentSearchIds, pushRecentSearch, clearRecentSearches, getWord } =
    useApp()
  const [tab, setTab] = useState<Tab>('words')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<VocabWord | null>(null)
  const [practiceWord, setPracticeWord] = useState<VocabWord | null>(null)

  const wordOfTheDay = useMemo(() => pickWordOfTheDay(wordBank), [wordBank])

  const suggestions = useMemo(() => {
    const raw = query.trim()
    if (!raw) return []
    const q = foldPinyin(raw)
    const matches = wordBank.filter(
      (w) =>
        w.simplified.includes(raw) ||
        w.traditional.includes(raw) ||
        foldPinyin(w.pinyin).includes(q) ||
        w.definition.toLowerCase().includes(q),
    )
    // Surface exact/prefix pinyin hits before substring-of-definition noise.
    return matches
      .sort((a, b) => {
        const rank = (w: VocabWord) => {
          const p = foldPinyin(w.pinyin).replace(/\s+/g, '')
          if (p === q) return 0
          if (p.startsWith(q)) return 1
          return 2
        }
        return rank(a) - rank(b)
      })
      .slice(0, 8)
  }, [wordBank, query])

  const commonRadicals = useMemo(
    () => COMMON_RADICAL_IDS.map((id) => RADICALS.find((r) => r.id === id)).filter((r) => Boolean(r)) as typeof RADICALS,
    [],
  )

  const recentWords = useMemo(
    () => recentSearchIds.map((id) => getWord(id)).filter((w): w is VocabWord => Boolean(w)),
    [recentSearchIds, getWord],
  )

  const myWords = useMemo(
    () => deck.map((c) => getWord(c.wordId)).filter((w): w is VocabWord => Boolean(w)),
    [deck, getWord],
  )

  const choose = (word: VocabWord) => {
    playTapSound()
    setSelected(word)
    pushRecentSearch(word.id)
    setQuery('')
  }

  // Falls back to the last thing looked up so the featured card doesn't just mirror
  // the Word of the Day panel further down the screen.
  const shown = selected ?? recentWords[0] ?? wordOfTheDay
  const alreadyAdded = shown ? deck.some((c) => c.wordId === shown.id) : false
  const glyphLength = shown ? displayWord(shown, settings.script).length : 1
  const glyphSize = glyphLength <= 1 ? 68 : glyphLength === 2 ? 48 : 34

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas dark:bg-slate-950">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pb-3 pt-1 text-[30px] font-extrabold text-slate-900 dark:text-white">Dictionary</Text>

        <View className="flex-row items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <Search size={20} color="#94a3b8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Chinese or Pinyin"
            placeholderTextColor="#94a3b8"
            className="flex-1 text-[16px] text-slate-900 dark:text-white"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <X size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        {suggestions.length > 0 && (
          <View className="mt-2 overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-900">
            {suggestions.map((w, i) => (
              <Pressable
                key={w.id}
                onPress={() => choose(w)}
                className={`flex-row items-center gap-3 px-4 py-3 active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
              >
                <Text className="font-hanzi text-[22px] font-bold text-slate-900 dark:text-white">
                  {displayWord(w, settings.script)}
                </Text>
                <Text className="text-[13px] text-slate-400">{displayPinyin(w, settings.phoneticScript)}</Text>
                <Text numberOfLines={1} className="flex-1 text-[13px] text-slate-500 dark:text-slate-400">
                  {w.definition}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="mt-3 flex-row rounded-full bg-white p-1 shadow-card dark:bg-slate-900">
          {(
            [
              ['words', 'Words'],
              ['radicals', 'Radicals'],
              ['my-words', 'My Words'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => {
                playTapSound()
                setTab(key)
              }}
              className={`flex-1 items-center rounded-full py-2.5 ${tab === key ? 'bg-brand-100' : ''}`}
            >
              <Text
                className={`text-[15px] font-bold ${tab === key ? 'text-brand-700' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'words' && (
          <>
            {shown && (
              <View className="mt-4 flex-row gap-3 rounded-3xl bg-brand-50 p-3 dark:bg-brand-950/30">
                <Pressable
                  onPress={() => setPracticeWord(shown)}
                  accessibilityRole="button"
                  accessibilityLabel={`Practice writing ${displayWord(shown, settings.script)}`}
                  className="h-[150px] w-[150px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
                  {/* 米字格 practice-grid guides behind the glyph */}
                  {GUIDES.map((g, i) => (
                    <View
                      key={i}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        width: g.rotate ? '150%' : '100%',
                        borderTopWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: '#e5e7eb',
                        transform: g.rotate ? [{ rotate: g.rotate }] : undefined,
                      }}
                    />
                  ))}
                  <View
                    pointerEvents="none"
                    style={{ position: 'absolute', height: '100%', borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#e5e7eb' }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: glyphSize, lineHeight: glyphSize * 1.25 }}
                    className="font-hanzi text-brand-600 dark:text-brand-400"
                  >
                    {displayWord(shown, settings.script)}
                  </Text>
                </Pressable>

                <View className="flex-1 py-1">
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 text-[26px] font-extrabold text-brand-600 dark:text-brand-400">
                      {displayPinyin(shown, settings.phoneticScript)}
                    </Text>
                    <SpeakChip text={displayWord(shown, settings.script)} />
                  </View>
                  <Text className="mt-1 text-[19px] font-semibold text-slate-800 dark:text-slate-200">
                    {shown.definition}
                  </Text>

                  <View className="my-3 h-px bg-slate-200/80 dark:bg-slate-700" />

                  <Pressable
                    disabled={alreadyAdded}
                    onPress={() => {
                      playTapSound()
                      addToReviewDeck(shown.id)
                    }}
                    className={`flex-row items-center justify-center gap-2 rounded-2xl py-3 ${alreadyAdded ? 'bg-brand-100/60' : 'bg-brand-100'}`}
                  >
                    {alreadyAdded ? <Check size={19} color="#16a34a" /> : <PlusCircle size={19} color="#16a34a" />}
                    <Text className="text-[15px] font-bold text-brand-700">
                      {alreadyAdded ? 'In My Words' : 'Add to My Words'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View className="mt-6 flex-row items-center justify-between">
              <Text className="text-[19px] font-extrabold text-slate-900 dark:text-white">Common Radicals</Text>
              <Pressable onPress={() => router.push('/radicals')} accessibilityRole="button">
                <Text className="text-[15px] font-semibold text-brand-600">View all</Text>
              </Pressable>
            </View>
            <View className="mt-2.5 flex-row gap-2.5">
              {commonRadicals.map((r) => (
                <View
                  key={r.id}
                  className="flex-1 items-center rounded-2xl bg-brand-50 py-4 dark:bg-brand-950/30"
                >
                  <Text className="font-hanzi text-[34px] leading-[44px] text-slate-900 dark:text-white">
                    {r.character}
                  </Text>
                  <Text className="mt-1.5 text-[13px] text-slate-400">{r.pinyin}</Text>
                  <Text numberOfLines={1} className="mt-0.5 text-[13px] text-slate-800 dark:text-slate-300">
                    {r.meaning.split(',')[0]}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-6 flex-row items-center justify-between">
              <Text className="text-[19px] font-extrabold text-slate-900 dark:text-white">Recent Searches</Text>
              {recentWords.length > 0 && (
                <Pressable onPress={clearRecentSearches} accessibilityRole="button">
                  <Text className="text-[15px] font-semibold text-brand-600">Clear</Text>
                </Pressable>
              )}
            </View>
            {recentWords.length === 0 ? (
              <Text className="mt-3 text-[14px] text-slate-400">
                Words you look up will show up here.
              </Text>
            ) : (
              <View className="mt-2.5 overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-900">
                {recentWords.map((w, i) => (
                  <Pressable
                    key={w.id}
                    onPress={() => choose(w)}
                    className={`flex-row items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
                  >
                    <Text className="font-hanzi text-[26px] font-bold text-slate-900 dark:text-white">
                      {displayWord(w, settings.script)}
                    </Text>
                    <Text className="w-16 text-[14px] text-slate-400">{displayPinyin(w, settings.phoneticScript)}</Text>
                    <Text numberOfLines={1} className="flex-1 text-[14px] text-slate-500 dark:text-slate-400">
                      {w.definition}
                    </Text>
                    <SpeakChip text={displayWord(w, settings.script)} size={16} />
                  </Pressable>
                ))}
              </View>
            )}

            {wordOfTheDay && (
              <View className="mt-6 flex-row items-center overflow-hidden rounded-3xl bg-brand-50 pl-4 dark:bg-brand-950/30">
                <View className="flex-1 py-4">
                  <Text className="text-[17px] font-extrabold text-brand-600 dark:text-brand-400">Word of the Day</Text>
                  <View className="mt-1.5 flex-row items-center gap-3">
                    <Text className="font-hanzi text-[36px] leading-[44px] text-slate-900 dark:text-white">
                      {displayWord(wordOfTheDay, settings.script)}
                    </Text>
                    <View>
                      <Text className="text-[19px] font-bold text-brand-600 dark:text-brand-400">
                        {displayPinyin(wordOfTheDay, settings.phoneticScript)}
                      </Text>
                      <Text numberOfLines={1} className="text-[15px] text-slate-700 dark:text-slate-300">
                        {wordOfTheDay.definition}
                      </Text>
                    </View>
                  </View>
                </View>
                <Image source={TOWN_BUILDINGS[6].image} style={{ width: 108, height: 92 }} resizeMode="contain" />
                <View className="absolute right-3 top-3">
                  <SpeakChip text={displayWord(wordOfTheDay, settings.script)} size={16} />
                </View>
              </View>
            )}
          </>
        )}

        {tab === 'radicals' && (
          <View className="mt-4 flex-row flex-wrap gap-2.5">
            {RADICALS.map((r) => (
              <View key={r.id} className="w-[23.5%] items-center rounded-2xl bg-brand-50 py-3 dark:bg-brand-950/30">
                <Text className="font-hanzi text-[28px] leading-[36px] text-slate-900 dark:text-white">{r.character}</Text>
                <Text className="mt-1 text-[11px] text-slate-400">{r.pinyin}</Text>
                <Text numberOfLines={1} className="px-1 text-[11px] text-slate-700 dark:text-slate-300">{r.meaning}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'my-words' && (
          <View className="mt-4">
            {myWords.length === 0 ? (
              <Text className="mt-6 text-center text-[14px] text-slate-400">
                No saved words yet — search above and tap Add to My Words.
              </Text>
            ) : (
              <View className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-900">
                {myWords.map((w, i) => (
                  <Pressable
                    key={w.id}
                    onPress={() => choose(w)}
                    className={`flex-row items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
                  >
                    <Text className="font-hanzi text-[26px] font-bold text-slate-900 dark:text-white">
                      {displayWord(w, settings.script)}
                    </Text>
                    <Text className="w-16 text-[14px] text-slate-400">{displayPinyin(w, settings.phoneticScript)}</Text>
                    <Text numberOfLines={1} className="flex-1 text-[14px] text-slate-500 dark:text-slate-400">
                      {w.definition}
                    </Text>
                    <SpeakChip text={displayWord(w, settings.script)} size={16} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {practiceWord && <WritingPracticeModal word={practiceWord} onClose={() => setPracticeWord(null)} />}
    </SafeAreaView>
  )
}
