import { Tabs, router } from 'expo-router'
import { LayoutDashboard, Sparkles, Repeat, BookOpen, Settings as SettingsIcon } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { dueCountFor } from '../../lib/selectors'

export default function TabsLayout() {
  const { deck } = useApp()
  const dueCount = dueCountFor(deck)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#149457',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} strokeWidth={2.25} /> }}
      />
      <Tabs.Screen
        name="new-words"
        options={{ title: 'New Words', tabBarIcon: ({ color }) => <Sparkles color={color} size={22} strokeWidth={2.25} /> }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ color }) => <Repeat color={color} size={22} strokeWidth={2.25} />,
          tabBarBadge: dueCount > 0 ? (dueCount > 99 ? '99+' : dueCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#f6432c' },
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault()
            router.push('/review')
          },
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{ title: 'Dictionary', tabBarIcon: ({ color }) => <BookOpen color={color} size={22} strokeWidth={2.25} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <SettingsIcon color={color} size={22} strokeWidth={2.25} /> }}
      />
    </Tabs>
  )
}
