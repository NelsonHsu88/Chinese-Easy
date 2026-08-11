import { useState } from 'react'
import { View } from 'react-native'
import { Tabs, router } from 'expo-router'
import {
  LayoutDashboard,
  GraduationCap,
  Sparkles,
  Library,
  Repeat,
  BookOpen,
  Settings as SettingsIcon,
} from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { dueCountFor } from '../../lib/selectors'
import { TabPickerSheet } from '../../components/TabPickerSheet'

export default function TabsLayout() {
  const { deck, newlyAddedWordIds } = useApp()
  const dueCount = dueCountFor(deck)
  const [openSheet, setOpenSheet] = useState<'lessons' | null>(null)

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#16a34a',
          tabBarInactiveTintColor: '#94a3b8',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} strokeWidth={2.25} /> }}
          listeners={{ tabPress: () => setOpenSheet(null) }}
        />
        <Tabs.Screen
          name="lessons-tab"
          options={{ title: 'Lessons', tabBarIcon: ({ color }) => <GraduationCap color={color} size={22} strokeWidth={2.25} /> }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setOpenSheet('lessons')
            },
          }}
        />
        <Tabs.Screen
          name="review-tab"
          options={{
            title: 'Review',
            tabBarIcon: ({ color }) => <Repeat color={color} size={22} strokeWidth={2.25} />,
            tabBarBadge: dueCount > 0 ? (dueCount > 99 ? '99+' : dueCount) : undefined,
            tabBarBadgeStyle: { backgroundColor: '#ff6b6b' },
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setOpenSheet(null)
              router.push('/review')
            },
          }}
        />
        <Tabs.Screen
          name="dictionary-tab"
          options={{
            title: 'Dictionary',
            tabBarIcon: ({ color }) => (
              <View>
                <BookOpen color={color} size={22} strokeWidth={2.25} />
                {newlyAddedWordIds.length > 0 && (
                  <View className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-coral-500 dark:border-slate-900" />
                )}
              </View>
            ),
          }}
          listeners={{ tabPress: () => setOpenSheet(null) }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Settings', tabBarIcon: ({ color }) => <SettingsIcon color={color} size={22} strokeWidth={2.25} /> }}
          listeners={{ tabPress: () => setOpenSheet(null) }}
        />
      </Tabs>

      <TabPickerSheet
        visible={openSheet === 'lessons'}
        title="What would you like to do?"
        onClose={() => setOpenSheet(null)}
        options={[
          { key: 'lessons', label: 'Lessons', description: 'Work through units, one skill at a time', icon: GraduationCap, onPress: () => router.push('/lessons') },
          { key: 'new-words', label: 'New Words', description: 'Flip through fresh vocabulary', icon: Sparkles, onPress: () => router.push('/new-words') },
          { key: 'books', label: 'Books', description: 'Read short stories in Chinese', icon: Library, onPress: () => router.push('/books') },
        ]}
      />
    </>
  )
}
