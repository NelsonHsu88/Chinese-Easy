import { useState } from 'react'
import { View, Text, Platform, Pressable } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Clock } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import {
  DetailShell,
  ControlGroup,
  InlineRow,
  Toggle,
  Hint,
  NumberField,
} from '../../components/settings/parts'
import { setColors as c, setSpacing as s, setRadius } from '../../components/settings/tokens'
import { tickHaptic } from '../../lib/haptics'

/*
 * Reminders.
 *
 * Both fields are the ones the old screen wrote — `notificationsEnabled` and
 * `reminderTime`, same names, same format. Neither has ever asked the OS for
 * notification permission, and this screen deliberately does not start: opening
 * a settings page must never raise a system prompt, and the app has no
 * scheduling code behind the flag yet. The card at the foot says so rather than
 * letting the toggle imply a notification that will not arrive.
 */

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date
}

function dateToTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatTime(time: string): string {
  const [rawHours, rawMinutes] = time.split(':').map(Number)
  const hours = Number.isFinite(rawHours) ? rawHours : 0
  const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 0
  const suffix = hours < 12 ? 'AM' : 'PM'
  const twelve = hours % 12 === 0 ? 12 : hours % 12
  return `${twelve}:${String(minutes).padStart(2, '0')} ${suffix}`
}

/**
 * The time control, in two forms.
 *
 * Native gets the platform picker, unchanged from the old screen — it is the
 * control people already know, and on iOS it is a compact inline field rather
 * than a modal. The web build gets steppers instead, because
 * `@react-native-community/datetimepicker` is a native module with nothing
 * behind it in a browser, and this project is verified in one.
 */
function TimeField({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [showPicker, setShowPicker] = useState(false)

  if (Platform.OS === 'web') {
    const [hours, minutes] = value.split(':').map(Number)
    const hour = Number.isFinite(hours) ? hours : 19
    const minute = Number.isFinite(minutes) ? minutes : 0

    return (
      <View style={{ gap: s.lg }}>
        <View
          className="flex-row items-center justify-center"
          style={{
            gap: s.sm,
            paddingVertical: s.md,
            borderRadius: setRadius.inner,
            backgroundColor: c.greenSoft,
          }}
        >
          <Clock size={17} color={c.greenDark} strokeWidth={2.4} />
          <Text className="font-nunito-extrabold" style={{ fontSize: 19, color: c.greenDark }}>
            {formatTime(value)}
          </Text>
        </View>

        <View style={{ gap: s.sm }}>
          <Hint>Hour</Hint>
          <NumberField
            label="reminder hour"
            value={hour}
            onChange={(next) => onChange(`${String(next).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)}
            min={0}
            max={23}
            unit="of 24"
          />
        </View>

        <View style={{ gap: s.sm }}>
          <Hint>Minute</Hint>
          <NumberField
            label="reminder minute"
            value={minute}
            onChange={(next) => onChange(`${String(hour).padStart(2, '0')}:${String(next).padStart(2, '0')}`)}
            min={0}
            max={45}
            step={15}
            unit="past the hour"
          />
        </View>
      </View>
    )
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false)
    if (event.type === 'dismissed' || !date) return
    onChange(dateToTimeString(date))
  }

  return (
    <View className="flex-row items-center justify-between" style={{ gap: s.md }}>
      <Pressable
        onPress={() => {
          tickHaptic()
          setShowPicker(true)
        }}
        accessibilityRole="button"
        accessibilityLabel={`Reminder time, currently ${formatTime(value)}`}
        className="flex-row items-center active:opacity-70"
        style={{
          gap: s.sm,
          paddingHorizontal: s.lg,
          paddingVertical: s.md,
          borderRadius: setRadius.inner,
          backgroundColor: c.greenSoft,
        }}
      >
        <Clock size={17} color={c.greenDark} strokeWidth={2.4} />
        <Text className="font-nunito-extrabold" style={{ fontSize: 17, color: c.greenDark }}>
          {formatTime(value)}
        </Text>
      </Pressable>

      {(showPicker || Platform.OS === 'ios') && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={handleChange}
        />
      )}
    </View>
  )
}

export function Reminders() {
  const { settings, updateSettings } = useApp()

  return (
    <DetailShell title="Reminders">
      <ControlGroup title="Daily practice">
        <InlineRow
          label="Practice reminders"
          hint="A nudge once a day, at the time below."
        >
          <Toggle
            label="Practice reminders"
            value={settings.notificationsEnabled}
            onChange={(notificationsEnabled) => updateSettings({ notificationsEnabled })}
          />
        </InlineRow>

        {/*
          The time stays visible and editable with reminders off. Someone
          turning them on almost always wants to set the hour in the same visit,
          and hiding the field behind the toggle means enabling, hunting for the
          control that just appeared, and then setting it.
        */}
        <View style={{ opacity: settings.notificationsEnabled ? 1 : 0.55 }}>
          <TimeField
            value={settings.reminderTime}
            onChange={(reminderTime) => updateSettings({ reminderTime })}
          />
        </View>
      </ControlGroup>

      <View
        style={{
          padding: s.lg,
          borderRadius: setRadius.inner,
          backgroundColor: c.goldSoft,
        }}
      >
        <Hint>
          Chinese Easy does not send system notifications yet, so nothing will ask for
          notification permission and no alert will arrive at this time. Your choice is saved
          and will be used the moment reminders ship.
        </Hint>
      </View>
    </DetailShell>
  )
}
