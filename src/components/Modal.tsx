import type { ReactNode } from 'react'
import { Modal as RNModal, View, Text, Pressable, ScrollView } from 'react-native'
import { X } from 'lucide-react-native'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: Props) {
  return (
    <RNModal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable onPress={() => {}} className="max-h-[88%] w-full rounded-t-3xl bg-white p-5 shadow-card dark:bg-slate-900">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" className="rounded-full p-1.5">
              <X size={20} color="#94a3b8" />
            </Pressable>
          </View>
          <ScrollView>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  )
}
