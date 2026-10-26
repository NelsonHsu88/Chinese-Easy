import { RaisedButton } from '../components/dashboard/parts'
import { View, Text, useWindowDimensions } from 'react-native'
import { BarChart3, Bell, BookOpen, Info, SlidersHorizontal, Sparkles, Target } from 'lucide-react-native'
import { router, type Href } from 'expo-router'
import { useApp } from '../context/AppContext'
import { playTints } from '../components/dashboard/tokens'
import {
  SettingsShell,
  SakuraCorner,
  FootRange,
  SectionHeading,
  GroupCard,
  NavRow,
} from '../components/settings/parts'
import { TourTarget } from '../components/tour/targets'
import { useScreenTransition } from '../components/settings/transition'
import { setColors as c, setSpacing as s, setType as t, setRadius, SET_CONTENT_MAX } from '../components/settings/tokens'
import { BackArrow } from '../components/BackArrow'

/** Everything this screen can open. Typed so a renamed route fails the build. */
type SettingsHref =
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
 * persisted fields — it is one level down, behind seven rows. The reason is not
 * tidiness: the old screen put eight segmented controls, two sliders, a
 * stepper, three toggles and a date picker on one scroll, and a learner
 * arriving to turn reminders off had to read all of it to find the one they
 * wanted. A row that already summarises its own state ("Daily at 7:00 PM", "20
 * words") answers most visits without opening anything at all.
 *
 * Reached from the gear on the Profile tab, so it is a page of its own at
 * `/settings` (`app/settings/index.tsx`) with a back arrow, not a tab. The
 * detail screens live in `src/screens/settings/`, reached through
 * `/settings/<name>`. The learner's name, photo and level are the Profile
 * tab's business now, so the profile card that used to head this page is gone.
 *
 * Built to the Beta 2.1 reference "SS104 Setting UI Redesign.png": Lora
 * headings and row titles, no row icons, the reference's own sakura branch and
 * foot range (`processSettingsArt.mjs`). The streak card the previous design
 * carried went with it — the Dashboard's This Week card shows the same week.
 *
 * **The hub scrolls, and nothing on it is squeezed.** It used to size its rows
 * to fit one screen, which on a phone pressed them to ~50pt and tightened every
 * gap around them until the page read as crammed. Every size below is now fixed
 * at a comfortable value and the page scrolls when it runs past the viewport;
 * on a tall screen the foot painting still ends the page (`SettingsShell`).
 */

/** A row with room for its two lines to breathe. */
const ROW_HEIGHT = 72
/** Between the profile card and each section. */
const SECTION_GAP = 32
/** Between a section heading and its card. */
const HEADING_GAP = 12
/**
 * The sakura branch's width as a share of the column. The reference's is 0.32
 * (301 of 941px), but its subtitle is set smaller; at the app's `t.subtitle` a branch
 * that wide drops petals onto "experience.".
 */
const SAKURA_SHARE = 0.26

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
  const { settings, isAdFree } = useApp()
  const phonetics = settings.phoneticScript === 'pinyin' ? 'Pinyin' : 'Zhuyin'

  const { width } = useWindowDimensions()
  const column = Math.min(width, SET_CONTENT_MAX)

  /*
   * This screen drops away downwards and rises back from below; a category
   * screen does the same. Every box below routes through `open` rather than
   * calling `router.push` directly — pushing straight away would mount the next
   * screen over an exit animation nobody ever sees.
   */
  const { style, shadow, leave } = useScreenTransition()
  const open = (href: SettingsHref) => () => leave(() => router.push(href))
  /* Back to Profile — guarded, since a deep link or a web reload has nothing to pop. */
  const back = () => leave(() => (router.canGoBack() ? router.back() : router.replace('/profile-tab' as Href)))


  return (
    <SettingsShell
      transitionStyle={style}
      shadow={shadow}
      foot={<FootRange />}
    >
      <View style={{ paddingHorizontal: s.screen, paddingBottom: s.xxl }}>
        {/*
          The branch is drawn before the title and sits behind it in paint order,
          but it is out of flow, so the title's own box is untouched.
        */}
        <View style={{ paddingTop: s.md }}>
          <BackArrow onPress={back} accessibilityLabel="Back to Profile" style={{ marginLeft: -8, alignSelf: 'flex-start' }} />
        </View>
        <View style={{ paddingTop: s.sm }}>
          <SakuraCorner width={column * SAKURA_SHARE} />
          <Text
            className="font-nunito-extrabold"
            accessibilityRole="header"
            style={{ ...t.title, color: c.navy }}
          >
            Settings
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.subtitle, color: c.textSecondary, marginTop: s.xs }}>
            Personalise your learning experience.
          </Text>
        </View>

        <View style={{ marginTop: s.xxxl, gap: HEADING_GAP }}>
          <SectionHeading>Study</SectionHeading>
          <TourTarget id="settings-study" radius={setRadius.card}>
          <GroupCard>
            <NavRow
              title="Learning preferences"
              subtitle="Script, phonetics, study"
              value={phonetics}
              height={ROW_HEIGHT}
              icon={BookOpen}
              hue="sky"
              onPress={open('/settings/learning')}
            />
            <NavRow
              title="Reminders"
              subtitle={
                settings.notificationsEnabled
                  ? `Daily at ${formatTime(settings.reminderTime)}`
                  : 'Notifications are off'
              }
              value={settings.notificationsEnabled ? 'On' : 'Off'}
              height={ROW_HEIGHT}
              icon={Bell}
              hue="honey"
              onPress={open('/settings/reminders')}
            />
            <NavRow
              title="My goal"
              subtitle={`${GOAL_LABELS[settings.learningGoal] ?? 'Daily life'} · HSK ${settings.hskLevel}`}
              value={`${settings.dailyNewWordLimit} words`}
              height={ROW_HEIGHT}
              icon={Target}
              hue="jade"
              onPress={open('/settings/goal')}
            />
          </GroupCard>
          </TourTarget>
        </View>

        <View style={{ marginTop: SECTION_GAP, gap: HEADING_GAP }}>
          <SectionHeading>Account &amp; App</SectionHeading>
          <TourTarget id="settings-app" radius={setRadius.card}>
          <GroupCard>
            {/*
              The way in to the subscription, and the only permanent one — the
              recurring offer is a passing thing, so a learner who dismissed it
              and later changed their mind needs somewhere to go. The row states
              what it is rather than selling: it already says whether they have
              it, which for a subscriber is the only question this row answers.
            */}
            <NavRow
              title="Ad-free"
              subtitle={isAdFree ? 'Thank you for supporting Chinese Easy' : 'Study without interruptions'}
              value={isAdFree ? 'Active' : undefined}
              height={ROW_HEIGHT}
              icon={Sparkles}
              hue="lilac"
              onPress={open('/subscribe')}
            />
            <NavRow
              title="Progress"
              subtitle="Track your learning journey"
              height={ROW_HEIGHT}
              icon={BarChart3}
              hue="jade"
              onPress={open('/settings/progress')}
            />
            <NavRow
              title="General"
              subtitle="Sounds, appearance, advanced"
              height={ROW_HEIGHT}
              icon={SlidersHorizontal}
              hue="sky"
              onPress={open('/settings/general')}
            />
            {/*
              Where an earlier reference put "Offline". The app has no download
              feature — every character's stroke data, all 46 stories and the
              whole word bank are compiled into the bundle — so a row offering
              to fetch them would be a button that does nothing. About is a real
              obligation instead: CC-CEDICT is CC BY-SA and has to be credited.
            */}
            <NavRow
              title="About"
              subtitle="Version, licences and credits"
              height={ROW_HEIGHT}
              icon={Info}
              hue="blossom"
              onPress={open('/settings/about')}
            />
          </GroupCard>
          </TourTarget>
        </View>
      </View>
    </SettingsShell>
  )
}
