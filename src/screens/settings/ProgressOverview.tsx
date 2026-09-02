import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { Flame, Sparkles, Repeat, CalendarCheck } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { buildHeatmapFromProgress, summarizeActivity } from '../../lib/progress'
import { proficiencyTotals } from '../../lib/proficiency'
import { DetailShell, Card, ControlGroup, ActionButton, Hint } from '../../components/settings/parts'
import { setColors as c, setSpacing as s, setRadius } from '../../components/settings/tokens'

/*
 * Progress — the reference's third Account row, pointed at real numbers.
 *
 * Every figure here is derived from state the app already keeps: the daily
 * progress log, the streak, and the SRS deck. Nothing new is recorded and
 * nothing is estimated. `buildHeatmapFromProgress` and `summarizeActivity` in
 * `lib/progress.ts` were written for exactly this and had no caller.
 *
 * Deliberately a summary, not an analytics screen: the Dashboard already owns
 * the week in detail, and duplicating it here would give a learner two charts
 * of the same days that round differently.
 */

/** How far back the summary looks. Twelve weeks — long enough for a habit to show. */
const WINDOW_DAYS = 84

function StatTile({
  icon: Icon,
  value,
  label,
  tint,
  ink,
}: {
  icon: typeof Flame
  value: string
  label: string
  tint: string
  ink: string
}) {
  return (
    <Card style={{ flex: 1, padding: s.lg, gap: s.sm }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 34, height: 34, backgroundColor: tint }}
      >
        <Icon size={17} color={ink} strokeWidth={2.3} />
      </View>
      <View>
        <Text className="font-nunito-extrabold" style={{ fontSize: 22, lineHeight: 27, color: c.navy }}>
          {value}
        </Text>
        <Text
          className="font-nunito-semibold"
          style={{ fontSize: 12, lineHeight: 16, color: c.textSecondary }}
        >
          {label}
        </Text>
      </View>
    </Card>
  )
}

export function ProgressOverview() {
  const { dailyProgress, streak, deck } = useApp()

  const summary = useMemo(
    () => summarizeActivity(buildHeatmapFromProgress(dailyProgress, WINDOW_DAYS)),
    [dailyProgress],
  )

  /* The deck split by how well each card is actually known — the same tiers,
     from the same function, that My Words files its list under. */
  const tiers = useMemo(() => proficiencyTotals(deck), [deck])

  return (
    <DetailShell title="Progress">
      <View style={{ gap: s.md }}>
        <View className="flex-row" style={{ gap: s.md }}>
          <StatTile
            icon={Flame}
            value={String(streak)}
            label={streak === 1 ? 'day streak' : 'day streak'}
            tint={c.coralSoft}
            ink={c.coralDark}
          />
          <StatTile
            icon={CalendarCheck}
            value={`${summary.activeDays}`}
            label={`active days of ${WINDOW_DAYS}`}
            tint={c.greenSoft}
            ink={c.greenDark}
          />
        </View>
        <View className="flex-row" style={{ gap: s.md }}>
          <StatTile
            icon={Sparkles}
            value={String(summary.totalWordsLearned)}
            label="words learned"
            tint={c.goldSoft}
            ink={c.gold}
          />
          <StatTile
            icon={Repeat}
            value={String(summary.totalReviewsCompleted)}
            label="reviews completed"
            tint={c.blueSoft}
            ink={c.blueGray}
          />
        </View>
      </View>

      <ControlGroup title="Your deck">
        <DeckBar label="Proficient" count={tiers.proficient} total={deck.length} fill={c.green} />
        <DeckBar label="Learning" count={tiers.learning} total={deck.length} fill={c.gold} />
        <DeckBar label="New" count={tiers.new} total={deck.length} fill={c.blueGray} />
        <ActionButton label="Open My Words" onPress={() => router.push('/my-words')} />
      </ControlGroup>

      <View style={{ padding: s.lg, borderRadius: setRadius.inner, backgroundColor: c.background }}>
        <Hint>
          Longest run in the last {WINDOW_DAYS} days: {summary.longestStreak}{' '}
          {summary.longestStreak === 1 ? 'day' : 'days'}. Counted from the days you actually
          studied, so it survives a change of device but not a cleared history.
        </Hint>
      </View>
    </DetailShell>
  )
}

/** One tier of the deck as a proportion. Zero cards draws an empty track, not a full one. */
function DeckBar({
  label,
  count,
  total,
  fill,
}: {
  label: string
  count: number
  total: number
  fill: string
}) {
  const share = total > 0 ? count / total : 0

  return (
    <View style={{ gap: 6 }}>
      <View className="flex-row items-baseline justify-between">
        <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.navy }}>
          {label}
        </Text>
        <Text className="font-nunito-bold" style={{ fontSize: 13.5, color: c.textSecondary }}>
          {count}
        </Text>
      </View>
      <View
        className="rounded-full"
        style={{ height: 8, backgroundColor: c.neutralTrack, overflow: 'hidden' }}
      >
        <View
          className="rounded-full"
          style={{ width: `${Math.round(share * 100)}%`, height: 8, backgroundColor: fill }}
        />
      </View>
    </View>
  )
}
