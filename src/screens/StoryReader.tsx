import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { storyById } from '../data/stories'
import { segmentText } from '../lib/textSegmentation'
import { Modal } from '../components/Modal'
import { SpeakButton } from '../components/SpeakButton'
import { playTapSound } from '../lib/sound'

export function StoryReader() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>()
  const { wordBank, deck, addWordFromBook } = useApp()
  const story = storyById(storyId)

  const [pageIndex, setPageIndex] = useState(0)
  const [showTranslation, setShowTranslation] = useState(false)
  const [tappedWordId, setTappedWordId] = useState<string | null>(null)

  const page = story?.pages[pageIndex]
  const segments = useMemo(() => (page ? segmentText(page.chinese, wordBank) : []), [page, wordBank])
  const tappedWord = tappedWordId ? wordBank.find((w) => w.id === tappedWordId) : undefined
  const alreadyAdded = tappedWord ? deck.some((c) => c.wordId === tappedWord.id) : false

  if (!story || !page) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
        <Text className="text-slate-400">Story not found.</Text>
      </SafeAreaView>
    )
  }

  const totalPages = story.pages.length

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="flex-row items-center gap-3 px-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <View className="flex-1">
          <Text className="font-hanzi text-base font-bold text-slate-900 dark:text-white">{story.title}</Text>
          <Text className="text-xs text-slate-400">
            HSK {story.hskLevel} · Page {pageIndex + 1} of {totalPages}
          </Text>
        </View>
        <SpeakButton text={page.chinese} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <Text className="text-xs text-slate-400">Tap any word to see its meaning and add it to My Words.</Text>

        <View className="rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900">
          <Text className="font-hanzi text-2xl leading-loose text-slate-900 dark:text-white">
            {segments.map((seg, i) =>
              seg.word ? (
                <Text
                  key={i}
                  onPress={() => {
                    playTapSound()
                    setTappedWordId(seg.word!.id)
                  }}
                  className="bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                >
                  {seg.text}
                </Text>
              ) : (
                <Text key={i}>{seg.text}</Text>
              ),
            )}
          </Text>
        </View>

        <Pressable onPress={() => setShowTranslation((v) => !v)} className="self-start rounded-full bg-slate-100 px-3.5 py-1.5 dark:bg-slate-800">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {showTranslation ? 'Hide translation' : 'Show translation'}
          </Text>
        </Pressable>

        {showTranslation && (
          <View className="gap-1 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
            <Text className="text-sm text-slate-500 dark:text-slate-400">{page.pinyin}</Text>
            <Text className="text-sm italic text-slate-600 dark:text-slate-300">{page.translation}</Text>
          </View>
        )}

        {totalPages > 1 && (
          <View className="flex-row items-center justify-between pt-2">
            <Pressable
              disabled={pageIndex === 0}
              onPress={() => setPageIndex((p) => p - 1)}
              className={`flex-row items-center gap-1 rounded-xl px-3 py-2 ${pageIndex === 0 ? 'opacity-30' : ''}`}
            >
              <ChevronLeft size={18} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Previous</Text>
            </Pressable>
            <Pressable
              disabled={pageIndex === totalPages - 1}
              onPress={() => setPageIndex((p) => p + 1)}
              className={`flex-row items-center gap-1 rounded-xl px-3 py-2 ${pageIndex === totalPages - 1 ? 'opacity-30' : ''}`}
            >
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Next</Text>
              <ChevronRight size={18} color="#64748b" />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {tappedWord && (
        <Modal title={tappedWord.traditional} onClose={() => setTappedWordId(null)}>
          <View className="items-center gap-2 pb-2">
            <Text className="font-hanzi text-5xl font-bold text-slate-900 dark:text-white">{tappedWord.traditional}</Text>
            <Text className="text-base font-medium text-slate-400">{tappedWord.pinyin}</Text>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white">{tappedWord.definition}</Text>

            {alreadyAdded ? (
              <View className="mt-2 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-100 py-3.5 dark:bg-brand-900/40">
                <Check size={18} color="#16a34a" />
                <Text className="text-base font-bold text-brand-700 dark:text-brand-300">Already in My Words</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  addWordFromBook(tappedWord.id)
                  setTappedWordId(null)
                }}
                className="mt-2 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 shadow-card"
              >
                <Plus size={18} color="white" />
                <Text className="text-base font-bold text-white">Add to My Words</Text>
              </Pressable>
            )}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}
