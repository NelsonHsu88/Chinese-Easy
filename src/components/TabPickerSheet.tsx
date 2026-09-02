import { useEffect, useRef } from 'react'
import { Modal as RNModal, View, Text, Pressable } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { playTapSound } from '../lib/sound'
import { useApp } from '../context/AppContext'
import { TOUR_STEPS } from '../lib/tour'
import { TourCard } from './tour/TourOverlay'
import { useHostsTourCard } from './tour/cardHost'

export interface TabPickerOption {
  key: string
  label: string
  description: string
  icon: LucideIcon
  onPress: () => void
}

interface Props {
  visible: boolean
  title: string
  options: TabPickerOption[]
  onClose: () => void
}

/** Bottom-sheet action menu triggered by tapping a "picker" tab (Lessons, Dictionary). */
export function TabPickerSheet({ visible, title, options, onClose }: Props) {
  const { tourStep } = useApp()
  const stepInSheet = tourStep !== null && !!TOUR_STEPS[tourStep]?.inSheet

  /*
   * Shifu talks about Books and the writing primer while this sheet is open, and
   * a React Native `Modal` draws above every other layer — including the global
   * tour overlay — so he simply vanished at the exact moment he was describing
   * what the learner was looking at. The sheet hosts its own copy instead.
   *
   * The other half of that: once the tour moves past the steps that belong here,
   * the sheet has to get out of the way, or it sits over whatever screen comes
   * next. Keyed on *leaving* a sheet step rather than on "the current step isn't
   * a sheet step", so opening the menu out of curiosity mid-tour doesn't snap
   * shut in the learner's face.
   */
  const wasInSheet = useRef(false)
  useEffect(() => {
    if (wasInSheet.current && !stepInSheet && visible) onClose()
    wasInSheet.current = stepInSheet
  }, [stepInSheet, visible, onClose])

  /*
   * Claim the card while this sheet is the one drawing it, so the global overlay
   * stands down instead of leaving its copy on screen behind the modal. The
   * claim covers `visible` as well as the step, so dismissing the sheet hands
   * the card straight back rather than leaving the learner with none.
   */
  useHostsTourCard(visible && stepInSheet)

  return (
    <RNModal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" onPress={onClose}>
        {stepInSheet && (
          // Swallows the tap the way the panel below does, so pressing Next
          // inside the card doesn't also dismiss the sheet underneath it.
          <Pressable onPress={() => {}} className="items-end px-4 pb-3">
            <TourCard />
          </Pressable>
        )}

        <Pressable onPress={() => {}} className="gap-3 rounded-t-3xl bg-white p-5 pb-8 shadow-card dark:bg-slate-900">
          <Text className="mb-1 text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => {
                playTapSound()
                onClose()
                opt.onPress()
              }}
              className="flex-row items-center gap-3 rounded-2xl bg-slate-50 p-4 active:bg-slate-100 dark:bg-slate-800 dark:active:bg-slate-700"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                <opt.icon size={20} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900 dark:text-white">{opt.label}</Text>
                <Text className="text-xs text-slate-400">{opt.description}</Text>
              </View>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </RNModal>
  )
}
