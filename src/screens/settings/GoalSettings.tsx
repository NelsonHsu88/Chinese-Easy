import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { GraduationCap, RotateCcw } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import {
  DetailShell,
  ControlGroup,
  Field,
  ChoiceList,
  NumberField,
  ActionButton,
  Hint,
} from '../../components/settings/parts'
import { setColors as c, setSpacing as s, setRadius } from '../../components/settings/tokens'
import type { LearningGoal } from '../../types'

/*
 * What the learner is aiming at.
 *
 * `learningGoal` is the interesting one: it has been persisted since onboarding
 * asked for it, and until now there was nowhere in the app to change the
 * answer. Same field, same values, no migration — it was simply unreachable.
 *
 * `dailyNewWordLimit` lives here rather than under Learning preferences because
 * this is where a learner thinks about it. It is the number the Settings index
 * shows as "20 words".
 */

const GOALS: { value: LearningGoal; label: string; hint: string }[] = [
  { value: 'daily-life', label: 'Daily life', hint: 'Conversation, food, family, getting around' },
  { value: 'travel', label: 'Travel', hint: 'Directions, hotels, ordering, asking for help' },
  { value: 'exam', label: 'Exam prep', hint: 'HSK vocabulary lists, at pace' },
  { value: 'culture', label: 'Culture', hint: 'Stories, festivals, chengyu and classical myth' },
]

export function GoalSettings() {
  const { settings, updateSettings, retakePlacementTest } = useApp()

  return (
    <DetailShell title="My goal">
      <ControlGroup title="Daily target">
        <Field
          label="New words per day"
          hint="How many unseen words New Words will offer before it stops for the day."
        >
          <NumberField
            label="new words per day"
            value={settings.dailyNewWordLimit}
            onChange={(dailyNewWordLimit) => updateSettings({ dailyNewWordLimit })}
            min={1}
            max={30}
            unit={settings.dailyNewWordLimit === 1 ? 'word per day' : 'words per day'}
          />
        </Field>
      </ControlGroup>

      <ControlGroup title="Why you're here">
        <Field label="Learning goal" hint="Chosen during onboarding. Change it any time.">
          <ChoiceList<LearningGoal>
            value={settings.learningGoal}
            onChange={(learningGoal) => updateSettings({ learningGoal })}
            options={GOALS}
          />
        </Field>
      </ControlGroup>

      <ControlGroup title="Level">
        <View className="flex-row items-center justify-between" style={{ gap: s.md }}>
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
              Estimated HSK level
            </Text>
            <View style={{ marginTop: 2 }}>
              <Hint>From your placement test.</Hint>
            </View>
          </View>
          <View
            className="flex-row items-center rounded-full"
            style={{ gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.greenSoft }}
          >
            <GraduationCap size={16} color={c.greenDark} strokeWidth={2.3} />
            <Text className="font-nunito-extrabold" style={{ fontSize: 14, color: c.greenDark }}>
              HSK {settings.hskLevel}
            </Text>
          </View>
        </View>

        {/*
          Retaking sends the learner back through onboarding, which is where the
          placement test lives — the same call the old screen made, unchanged.
          `retakePlacementTest` deliberately leaves the deck, XP and streak
          alone; only the estimate is reopened.
        */}
        <View style={{ gap: s.sm }}>
          <ActionButton
            label="Retake placement test"
            icon={RotateCcw}
            onPress={() => {
              retakePlacementTest()
              router.push('/onboarding')
            }}
          />
          <View
            style={{ padding: s.md, borderRadius: setRadius.inner, backgroundColor: c.background }}
          >
            <Hint>Your saved words, streak and XP are all kept — only the level estimate is redone.</Hint>
          </View>
        </View>
      </ControlGroup>
    </DetailShell>
  )
}
