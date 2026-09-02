import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { BookOpen, Bell, Target, BarChart3, Settings2, Info, Sparkles } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { currentWeekActivity } from '../lib/progress'
import {
  SettingsShell,
  SakuraCorner,
  FootRange,
  SectionHeading,
  GroupCard,
  NavRow,
} from '../components/settings/parts'
import { ProfileCard, StreakCard } from '../components/settings/cards'
import { useScreenTransition } from '../components/settings/transition'
import { setColors as c, setSpacing as s, setType as t } from '../components/settings/tokens'

/** Everything this screen can open. Typed so a renamed route fails the build. */
type SettingsHref =
  | '/profile'
  | '/subscribe'
  | '/settings/learning'
  | '/settings/reminders'
  | '/settings/goal'
  | '/settings/progress'
  | '/settings/general'
  | '/settings/about'

/*
 * Settings, as an index rather than a control panel.
 *
 * Everything the old screen showed is still here and still writes to the same
 * persisted fields — it is one level down, behind six rows. The reason is not
 * tidiness: the old screen put eight segmented controls, two sliders, a
 * stepper, three toggles and a date picker on one scroll, and a learner
 * arriving to turn reminders off had to read all of it to find the one they
 * wanted. A row that already summarises its own state ("Daily at 7:00 PM", "20
 * words") answers most visits without opening anything at all.
 *
 * The detail screens live in `src/screens/settings/`, reached through
 * `/settings/<name>` — a directory with no `index`, so `/settings` itself stays
 * owned by the tab route and expo-router has no path to loop on.
 */

/** How the four learning goals are named to the learner. */
const GOAL_LABELS: Record<string, string> = {
  'daily-life': 'Daily life',
  travel: 'Travel',
  exam: 'Exam prep',
  culture: 'Culture',
}

/** "19:00" → "7:00 PM". The stored value stays 24-hour; only the display shifts. */
function formatTime(time: string): string {
  const [rawHours, rawMinutes] = time.split(':').map(Number)
  const hours = Number.isFinite(rawHours) ? rawHours : 0
  const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 0
  const suffix = hours < 12 ? 'AM' : 'PM'
  const twelve = hours % 12 === 0 ? 12 : hours % 12
  return `${twelve}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function Settings() {
  const { settings, streak, dailyProgress, isAdFree } = useApp()
  const week = useMemo(() => currentWeekActivity(dailyProgress), [dailyProgress])

  const phonetics = settings.phoneticScript === 'pinyin' ? 'Pinyin' : 'Zhuyin'

  /*
   * This screen drops away downwards and rises back from below; a category
   * screen does the same. Every box below routes through `open` rather than
   * calling `router.push` directly — pushing straight away would mount the next
   * screen over an exit animation nobody ever sees.
   */
  const { style, leave } = useScreenTransition()
  const open = (href: SettingsHref) => () => leave(() => router.push(href))

  return (
    <SettingsShell bottomInset={0} transitionStyle={style}>
      <View style={{ paddingHorizontal: s.screen }}>
        {/*
          The branch is drawn before the title and sits behind it in paint order,
          but it is out of flow, so the title's own box is untouched. It is
          sized to clear "Settings" rather than to fill the corner — the word is
          the largest type on the screen and must not have petals in it.
        */}
        <View style={{ paddingTop: s.sm }}>
          <SakuraCorner />
          <Text className="font-nunito-extrabold" style={{ ...t.title, color: c.navy }}>
            Settings
          </Text>
          <Text
            className="font-nunito-semibold"
            style={{ ...t.subtitle, color: c.textSecondary, marginTop: s.xs }}
          >
            Personalise your learning experience.
          </Text>
        </View>

        <View style={{ marginTop: s.xxl }}>
          <ProfileCard
            name={settings.username}
            email={settings.email}
            onPress={open('/profile')}
          />
        </View>

        <View style={{ marginTop: s.xl, gap: s.md }}>
          <SectionHeading>Study</SectionHeading>
          <GroupCard>
            <NavRow
              icon={BookOpen}
              tint={c.greenSoft}
              iconColor={c.greenDark}
              title="Learning preferences"
              subtitle="Script, phonetics and study options"
              value={phonetics}
              onPress={open('/settings/learning')}
            />
            <NavRow
              icon={Bell}
              tint={c.coralSoft}
              iconColor={c.coralDark}
              title="Reminders"
              subtitle={
                settings.notificationsEnabled
                  ? `Daily at ${formatTime(settings.reminderTime)}`
                  : 'Notifications are off'
              }
              value={settings.notificationsEnabled ? 'On' : 'Off'}
              onPress={open('/settings/reminders')}
            />
            <NavRow
              icon={Target}
              tint={c.goldSoft}
              iconColor={c.gold}
              title="My goal"
              subtitle={`${GOAL_LABELS[settings.learningGoal] ?? 'Daily life'} · HSK ${settings.hskLevel}`}
              value={`${settings.dailyNewWordLimit} words`}
              onPress={open('/settings/goal')}
            />
          </GroupCard>
        </View>

        <View style={{ marginTop: s.xxl, gap: s.md }}>
          <SectionHeading>Account &amp; App</SectionHeading>
          <GroupCard>
            {/*
              The way in to the subscription, and the only permanent one — the
              recurring offer is a passing thing, so a learner who dismissed it
              and later changed their mind needs somewhere to go. The row states
              what it is rather than selling: it already says whether they have
              it, which for a subscriber is the only question this row answers.
            */}
            <NavRow
              icon={Sparkles}
              tint={c.greenSoft}
              iconColor={c.greenDark}
              title="Ad-free"
              subtitle={
                isAdFree
                  ? 'Thank you for supporting Chinese Easy'
                  : 'Study without interruptions'
              }
              value={isAdFree ? 'Active' : undefined}
              onPress={open('/subscribe')}
            />
            <NavRow
              icon={BarChart3}
              tint={c.blueSoft}
              iconColor={c.blueGray}
              title="Progress"
              subtitle="Track your learning journey"
              onPress={open('/settings/progress')}
            />
            <NavRow
              icon={Settings2}
              tint={c.slateSoft}
              iconColor={c.slate}
              title="General"
              subtitle="Sounds, appearance, advanced"
              onPress={open('/settings/general')}
            />
            {/*
              Where the reference puts "Offline". The app has no download
              feature — every character's stroke data, all 46 stories and the
              whole word bank are compiled into the bundle — so a row offering
              to fetch them would be a button that does nothing. About is a real
              obligation instead: CC-CEDICT is CC BY-SA and has to be credited.
            */}
            <NavRow
              icon={Info}
              tint={c.lavenderSoft}
              iconColor={c.lavender}
              title="About"
              subtitle="Version, licences and credits"
              onPress={open('/settings/about')}
            />
          </GroupCard>
        </View>

        <View style={{ marginTop: s.xl }}>
          <StreakCard streak={streak} week={week} />
        </View>
      </View>

      <FootRange />
    </SettingsShell>
  )
}
