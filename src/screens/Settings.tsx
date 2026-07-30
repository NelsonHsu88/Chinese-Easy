import { useState } from 'react'
import { View, Text, Pressable, ScrollView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { GraduationCap, RotateCcw, Bell, ChevronRight } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { SettingsSection, SegmentedControl, Stepper, SliderRow, Row } from '../components/SettingsControls'
import type { PhoneticScript, ReviewDirection, ReviewOrder } from '../types'

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date
}

function dateToTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function DevClockSection() {
  const { devClockOverride, updateDevClockOverride } = useApp()
  const enabled = devClockOverride !== null
  const base = devClockOverride ? new Date(devClockOverride) : new Date()

  const realTodayStart = new Date()
  realTodayStart.setHours(0, 0, 0, 0)
  const baseDayStart = new Date(base)
  baseDayStart.setHours(0, 0, 0, 0)
  const dayOffset = Math.round((baseDayStart.getTime() - realTodayStart.getTime()) / 86400000)
  const hour = base.getHours()

  const applyOffset = (newDayOffset: number, newHour: number) => {
    const d = new Date()
    d.setDate(d.getDate() + newDayOffset)
    d.setHours(newHour, 0, 0, 0)
    updateDevClockOverride(d.toISOString())
  }

  return (
    <SettingsSection title="Developer">
      <Row label="Simulate a different date/time" hint="Freezes the app's clock so you can test streaks, daily resets, and challenges without waiting">
        <Pressable
          onPress={() => (enabled ? updateDevClockOverride(null) : applyOffset(0, new Date().getHours()))}
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          className={`h-7 w-12 justify-center rounded-full px-0.5 ${enabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
          <View className={`h-6 w-6 rounded-full bg-white shadow-card ${enabled ? 'ml-5' : 'ml-0'}`} />
        </Pressable>
      </Row>

      {enabled && (
        <View className="mt-3 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Row label="Days from today">
            <Stepper value={dayOffset} min={-90} max={90} onChange={(v) => applyOffset(v, hour)} />
          </Row>
          <Row label="Hour of day">
            <Stepper value={hour} min={0} max={23} onChange={(v) => applyOffset(dayOffset, v)} />
          </Row>
          <View className="rounded-xl bg-brand-50 px-3 py-2.5 dark:bg-brand-900/20">
            <Text className="text-center text-sm font-bold text-brand-700 dark:text-brand-300">
              {base.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {' · '}
              {base.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <Pressable
            onPress={() => updateDevClockOverride(null)}
            className="items-center rounded-xl border border-slate-300 py-2 dark:border-slate-700"
          >
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Reset to real time</Text>
          </Pressable>
        </View>
      )}
    </SettingsSection>
  )
}

export function Settings() {
  const { settings, updateSettings, retakePlacementTest } = useApp()
  const [showTimePicker, setShowTimePicker] = useState(false)

  const handleRetake = () => {
    retakePlacementTest()
    router.push('/onboarding')
  }

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false)
    if (event.type === 'dismissed' || !date) return
    updateSettings({ reminderTime: dateToTimeString(date) })
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 40 }}>
        <View>
          <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</Text>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Settings</Text>
          <Text className="mt-1 text-xs text-slate-400">Traditional Chinese only, for now.</Text>
        </View>

        <Pressable onPress={() => router.push('/profile')} className="flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-500">
            <Text className="text-lg font-bold text-white">{settings.username ? settings.username[0].toUpperCase() : '?'}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-slate-900 dark:text-white">{settings.username || 'Learner'}</Text>
            <Text className="text-xs text-slate-400">Edit profile</Text>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </Pressable>

        <SettingsSection title="Skill level">
          <Row label="Estimated HSK level" hint="From your placement test">
            <View className="flex-row items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 dark:bg-brand-900/40">
              <GraduationCap size={16} color="#15803d" />
              <Text className="text-sm font-bold text-brand-700 dark:text-brand-300">HSK {settings.hskLevel}</Text>
            </View>
          </Row>
          <Pressable
            onPress={handleRetake}
            className="mt-3 w-full flex-row items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 dark:border-slate-700"
          >
            <RotateCcw size={16} color="#475569" />
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Retake placement test</Text>
          </Pressable>
        </SettingsSection>

        <SettingsSection title="Phonetic notation">
          <SegmentedControl<PhoneticScript>
            value={settings.phoneticScript}
            onChange={(phoneticScript) => updateSettings({ phoneticScript })}
            options={[
              { value: 'pinyin', label: 'Pinyin' },
              { value: 'zhuyin', label: 'Bopomofo (ㄅㄆㄇ)' },
            ]}
          />
          <Text className="mt-2 text-xs text-slate-400">Controls how a word's pronunciation is shown on New Words and Review cards.</Text>
        </SettingsSection>

        <SettingsSection title="Review direction">
          <SegmentedControl<ReviewDirection>
            value={settings.reviewDirection}
            onChange={(reviewDirection) => updateSettings({ reviewDirection })}
            options={[
              { value: 'recognition', label: 'Recognition' },
              { value: 'production', label: 'Production' },
              { value: 'mixed', label: 'Mixed' },
            ]}
          />
          <Text className="mt-2 text-xs text-slate-400">Recognition: see Chinese, recall meaning. Production: see English, write Chinese.</Text>
        </SettingsSection>

        <SettingsSection title="Review order">
          <SegmentedControl<ReviewOrder>
            value={settings.reviewOrder}
            onChange={(reviewOrder) => updateSettings({ reviewOrder })}
            options={[
              { value: 'due', label: 'Due date' },
              { value: 'shuffled', label: 'Shuffled' },
              { value: 'hardest-first', label: 'Hardest first' },
            ]}
          />
        </SettingsSection>

        <SettingsSection title="Daily limits">
          <View className="gap-4">
            <SliderRow
              label="Review cards per day"
              value={settings.dailyReviewLimit}
              min={5}
              max={100}
              step={5}
              onChange={(dailyReviewLimit) => updateSettings({ dailyReviewLimit })}
            />
            <SliderRow
              label="New words per day"
              value={settings.dailyNewWordLimit}
              min={1}
              max={30}
              onChange={(dailyNewWordLimit) => updateSettings({ dailyNewWordLimit })}
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Wrong-answer practice">
          <Row label="Rewrite reps after a miss" hint="Extra writing reps queued after grading 'Again'">
            <Stepper value={settings.wrongAnswerReps} min={1} max={10} onChange={(wrongAnswerReps) => updateSettings({ wrongAnswerReps })} />
          </Row>
        </SettingsSection>

        <SettingsSection title="Reminders">
          <Row label="Practice reminders" hint="Enabled during onboarding">
            <Pressable
              onPress={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.notificationsEnabled }}
              className={`h-7 w-12 justify-center rounded-full px-0.5 ${settings.notificationsEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <View className={`h-6 w-6 rounded-full bg-white shadow-card ${settings.notificationsEnabled ? 'ml-5' : 'ml-0'}`} />
            </Pressable>
          </Row>
          <Row label="Daily reminder time" hint="UI only for now">
            <Pressable
              onPress={() => setShowTimePicker(true)}
              className="flex-row items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800"
            >
              <Bell size={16} color="#94a3b8" />
              <Text className="text-sm font-semibold text-slate-900 dark:text-white">{settings.reminderTime}</Text>
            </Pressable>
          </Row>
          {(showTimePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={timeStringToDate(settings.reminderTime)}
              mode="time"
              display={Platform.OS === 'ios' ? 'compact' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </SettingsSection>

        <DevClockSection />
      </ScrollView>
    </SafeAreaView>
  )
}
