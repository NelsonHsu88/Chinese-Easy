import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { Redirect, router } from 'expo-router'
import { RotateCcw } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import {
  DetailShell,
  ControlGroup,
  InlineRow,
  Toggle,
  Field,
  NumberField,
  ActionButton,
  Hint,
} from '../../components/settings/parts'
import { setColors as c, setSpacing as s, setRadius } from '../../components/settings/tokens'
import { getLevelFromXp, levelTitle, xpAtLevelStart } from '../../lib/progression/levels'

/** Upper bound for the level stepper — past every level title and reward. */
const MAX_DEV_LEVEL = 99

/*
 * The developer controls, moved out of the main screen but otherwise untouched.
 *
 * The clock override writes its own persisted field, pushed into
 * `lib/devClock.ts` so every `devNow()` in the app sees it. It is the only way
 * to test a streak, a daily reset or a daily challenge without waiting a real
 * day for each one, so it must keep working — it is a testing instrument, not a
 * leftover.
 *
 * The reset below is genuinely destructive, which is why it asks twice. A
 * single-tap factory reset sitting one row under a date picker is a trap, and
 * the person most likely to spring it is whoever came here to change the clock.
 */
/** A year out, for the simulated entitlement's renewal date. */
function yearFromNow(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString()
}

export function Developer() {
  /*
   * Refused outright in a release build.
   *
   * Hiding the row in General.tsx is not enough on its own: this is a real
   * route, so `chineseeasy://settings/developer` reaches it whether or not
   * anything links to it. Both halves are deliberate — one keeps it out of
   * sight, this one keeps it out of reach.
   *
   * The guard sits above every hook, which is safe here and only here:
   * `__DEV__` is a build-time constant, so this branch is taken for the entire
   * life of the bundle and the hook order below can never change under React.
   * Metro replaces it with `false` in a release and strips the rest.
   */
  if (!__DEV__) return <Redirect href="/settings/general" />

  const {
    devClockOverride,
    updateDevClockOverride,
    resetToFirstRun,
    isAdFree,
    applyEntitlement,
    clearEntitlement,
    xp,
    devSetXp,
  } = useApp()

  const level = getLevelFromXp(xp)
  /* The typed XP is a draft until committed, so a half-typed "1" on the way
     to "1500" doesn't drop the learner to level 1 and fire nothing useful. */
  const [xpDraft, setXpDraft] = useState(String(xp))
  useEffect(() => setXpDraft(String(xp)), [xp])
  const commitXpDraft = () => {
    const parsed = Number.parseInt(xpDraft.replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(parsed)) devSetXp(parsed)
    else setXpDraft(String(xp))
  }

  /** Second tap arms the reset; it disarms itself so it can't sit primed. */
  const [armed, setArmed] = useState(false)
  const disarm = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (disarm.current) clearTimeout(disarm.current)
  }, [])

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
    <DetailShell title="Developer">
      <ControlGroup title="Simulated clock">
        <InlineRow
          label="Simulate a different date and time"
          hint="Freezes the app's clock so streaks, daily resets and challenges can be tested without waiting."
        >
          <Toggle
            label="Simulate a different date and time"
            value={enabled}
            onChange={(next) =>
              next ? applyOffset(0, new Date().getHours()) : updateDevClockOverride(null)
            }
          />
        </InlineRow>

        {enabled && (
          <>
            <Field label="Days from today">
              <NumberField
                label="days from today"
                value={dayOffset}
                onChange={(v) => applyOffset(v, hour)}
                min={-90}
                max={90}
                unit={Math.abs(dayOffset) === 1 ? 'day' : 'days'}
              />
            </Field>

            <Field label="Hour of day">
              <NumberField
                label="hour of day"
                value={hour}
                onChange={(v) => applyOffset(dayOffset, v)}
                min={0}
                max={23}
                unit="of 24"
              />
            </Field>

            <View
              style={{ padding: s.md, borderRadius: setRadius.inner, backgroundColor: c.greenSoft }}
            >
              <Text
                className="font-nunito-bold"
                style={{ fontSize: 13.5, lineHeight: 19, color: c.greenDark, textAlign: 'center' }}
              >
                {base.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' · '}
                {base.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>

            <ActionButton label="Reset to real time" onPress={() => updateDevClockOverride(null)} />
          </>
        )}
      </ControlGroup>

      {/*
        XP and level. The level is derived from XP, so setting a level sets XP
        to where that level begins. Lowering it rewinds the level-up mark (see
        `devSetXp`), so climbing back replays the celebration.
      */}
      <ControlGroup title="Level and XP">
        <View style={{ padding: s.md, borderRadius: setRadius.inner, backgroundColor: c.greenSoft }}>
          <Text
            className="font-nunito-bold"
            style={{ fontSize: 13.5, lineHeight: 19, color: c.greenDark, textAlign: 'center' }}
          >
            Level {level} · {levelTitle(level)} · {xp.toLocaleString()} XP
          </Text>
        </View>

        <Field label="Level">
          <NumberField
            label="level"
            value={level}
            onChange={(v) => devSetXp(xpAtLevelStart(v))}
            min={1}
            max={MAX_DEV_LEVEL}
          />
        </Field>

        <Field label="XP">
          <NumberField label="XP" value={xp} onChange={devSetXp} min={0} max={9_999_999} step={50} unit="XP" />
          <TextInput
            value={xpDraft}
            onChangeText={setXpDraft}
            onSubmitEditing={commitXpDraft}
            onBlur={commitXpDraft}
            keyboardType="number-pad"
            returnKeyType="done"
            accessibilityLabel="Exact XP total"
            placeholder="Exact XP total"
            placeholderTextColor={c.textMuted}
            className="font-nunito-bold"
            style={{
              fontSize: 16,
              color: c.navy,
              textAlign: 'center',
              paddingVertical: 10,
              borderRadius: setRadius.inner,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.card,
            }}
          />
        </Field>
        <Hint>
          Type an exact total and press done, or step by 50. Setting a level puts XP at the start of
          that level. Rewards already unlocked are kept when you go down. While signed in, sync keeps
          the higher of this device’s and the cloud’s XP, so lowering it may not stick.
        </Hint>
      </ControlGroup>

      {/*
        The ad-free entitlement, switchable — because with no store connected to
        this build there is otherwise no way back out of the subscribed state
        once a simulated purchase has granted it, and the two states have to be
        checked against each other. It only ever writes a `simulated`
        entitlement, and every surface that shows one says so out loud; a real
        store entitlement is not the app's to grant or revoke from here.
      */}
      <ControlGroup title="Ad-free subscription">
        <InlineRow
          label="Simulate an ad-free subscription"
          hint="Development only. Grants the same entitlement a purchase would, labelled as simulated wherever it appears."
        >
          <Toggle
            label="Simulate an ad-free subscription"
            value={isAdFree}
            onChange={(next) =>
              next
                ? applyEntitlement({
                    plan: 'yearly',
                    renewsAt: yearFromNow(),
                    source: 'simulated',
                  })
                : clearEntitlement()
            }
          />
        </InlineRow>
      </ControlGroup>

      <ControlGroup title="First run">
        <ActionButton
          label={armed ? 'Tap again to erase everything' : 'Reset to a fresh install'}
          icon={RotateCcw}
          onPress={() => {
            if (!armed) {
              setArmed(true)
              disarm.current = setTimeout(() => setArmed(false), 4000)
              return
            }
            if (disarm.current) clearTimeout(disarm.current)
            setArmed(false)
            resetToFirstRun()
            router.replace('/onboarding')
          }}
        />
        <Hint>
          Puts the app back to how it looks the first time it is opened: onboarding from the
          welcome screen, Shifu’s tour, an empty deck, and no words, XP, streak or reading
          progress. The simulated clock above is kept. This cannot be undone.
        </Hint>
      </ControlGroup>
    </DetailShell>
  )
}
