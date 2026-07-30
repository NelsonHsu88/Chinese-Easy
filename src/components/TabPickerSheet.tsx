import { Modal as RNModal, View, Text, Pressable } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { playTapSound } from '../lib/sound'

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
  return (
    <RNModal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" onPress={onClose}>
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
