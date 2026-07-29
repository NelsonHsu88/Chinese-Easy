import { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Check } from 'lucide-react-native'
import { useApp } from '../context/AppContext'

export function Profile() {
  const { settings, updateSettings } = useApp()
  const [name, setName] = useState(settings.username)

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 24

  const handleSave = () => {
    if (!canSave) return
    updateSettings({ username: trimmed })
    router.push('/settings')
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 px-4 pt-2 dark:bg-slate-950">
      <View className="mb-6 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
          className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</Text>
      </View>

      <View className="items-center gap-3 py-4">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-500">
          <Text className="text-4xl font-bold text-white">{trimmed ? trimmed[0].toUpperCase() : '?'}</Text>
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={24}
          placeholder="Your name"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-lg text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </View>
      <Text className="mt-1.5 text-xs text-slate-400">Shown on your Dashboard. Up to 24 characters.</Text>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        className={`mt-6 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 shadow-card ${!canSave ? 'opacity-40' : ''}`}
      >
        <Check size={20} color="white" />
        <Text className="text-lg font-bold text-white">Save</Text>
      </Pressable>
    </SafeAreaView>
  )
}
