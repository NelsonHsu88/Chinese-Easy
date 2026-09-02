import { View, Text, Platform, useColorScheme } from 'react-native'
import { router } from 'expo-router'
import { Volume2, Vibrate, Moon, Wrench, ChevronRight, History } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import {
  DetailShell,
  ControlGroup,
  InlineRow,
  Toggle,
  Card,
  PressRow,
  IconCircle,
  Hint,
} from '../../components/settings/parts'
import { useLeave } from '../../components/settings/transition'
import { setColors as c, setSpacing as s, setRow, setRadius } from '../../components/settings/tokens'

/*
 * The drawer everything unglamorous lives in.
 *
 * The reference labels this row "Language, sounds, dark mode". Two of those
 * three are not settings this app has: there is no interface-language option
 * (the UI is English only), and dark mode is not a choice — NativeWind follows
 * the OS on its own. Rather than build two dead controls to match a caption,
 * appearance is stated as the fact it is, and the two that *can* be real —
 * sound and haptics — are wired straight into `lib/sound.ts` and
 * `lib/haptics.ts`.
 */
export function General() {
  const { settings, updateSettings, recoverableProgress, adoptRecoverableProgress, dismissRecoverableProgress } =
    useApp()
  const scheme = useColorScheme()
  const leave = useLeave()

  return (
    <DetailShell title="General">
      {/*
        Progress left in this device's guest namespace, offered rather than
        taken. It appears only when there is something to offer and the account
        is empty, and it disappears for good once answered either way — see
        `findRecoverableGuestProgress`.
      */}
      {recoverableProgress ? (
        <ControlGroup title="Restore progress">
          <Card>
            <View style={{ padding: setRow.padding, paddingVertical: s.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconCircle icon={History} tint={c.slateSoft} color={c.slate} />
                <View style={{ flex: 1, marginLeft: setRow.iconGap }}>
                  <Text
                    className="font-nunito-bold"
                    style={{ fontSize: 16, lineHeight: 21, color: c.navy }}
                  >
                    Progress found on this device
                  </Text>
                  <Text
                    className="font-nunito-semibold"
                    style={{ fontSize: 13.5, lineHeight: 18, color: c.textSecondary, marginTop: 1 }}
                  >
                    {recoverableProgress.deckCount} words, {recoverableProgress.xp} XP, studied
                    before you signed in.
                  </Text>
                </View>
              </View>
              <Text
                className="font-nunito-semibold"
                style={{ fontSize: 13.5, lineHeight: 19, color: c.textSecondary, marginTop: s.md }}
              >
                Add it to your account only if it is yours. Nothing is deleted either way.
              </Text>
            </View>
            <PressRow
              onPress={() => void adoptRecoverableProgress()}
              accessibilityLabel="Add this device's progress to my account"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: setRow.minHeight,
                paddingHorizontal: setRow.padding,
              }}
            >
              <Text
                className="font-nunito-bold"
                style={{ flex: 1, fontSize: 15.5, lineHeight: 20, color: c.navy }}
              >
                Add to my account
              </Text>
              <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
            </PressRow>
            <PressRow
              onPress={() => void dismissRecoverableProgress()}
              accessibilityLabel="This progress is not mine"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: setRow.minHeight,
                paddingHorizontal: setRow.padding,
              }}
            >
              <Text
                className="font-nunito-semibold"
                style={{ flex: 1, fontSize: 15.5, lineHeight: 20, color: c.textSecondary }}
              >
                Not mine
              </Text>
            </PressRow>
          </Card>
        </ControlGroup>
      ) : null}

      <ControlGroup title="Feedback">
        <InlineRow
          label="Sound effects"
          hint="Stroke clicks, the chime on a correct answer, the gong on a hint."
        >
          <Toggle
            label="Sound effects"
            value={settings.soundEnabled}
            onChange={(soundEnabled) => updateSettings({ soundEnabled })}
          />
        </InlineRow>

        <InlineRow
          label="Haptics"
          hint={
            Platform.OS === 'web'
              ? 'Vibration feedback on taps and milestones. Not available in a browser.'
              : 'Vibration feedback on taps, strokes and milestones.'
          }
        >
          <Toggle
            label="Haptics"
            value={settings.hapticsEnabled}
            onChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })}
          />
        </InlineRow>
      </ControlGroup>

      <ControlGroup title="Appearance">
        <View className="flex-row items-start" style={{ gap: s.md }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 34, height: 34, backgroundColor: c.lavenderSoft }}
          >
            <Moon size={16} color={c.lavender} strokeWidth={2.3} />
          </View>
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
              Follows your device
            </Text>
            <View style={{ marginTop: 2 }}>
              <Hint>
                Chinese Easy uses your system appearance — currently{' '}
                {scheme === 'dark' ? 'dark' : 'light'}. The reading, writing and settings screens
                are painted on cream paper and stay light in either.
              </Hint>
            </View>
          </View>
        </View>
      </ControlGroup>

      {/*
        Developer is a row rather than a section, and it is the last thing on the
        screen — in a development build. **It must never reach a release.**

        The tools behind it are not diagnostics, they are cheats: the simulated
        clock re-arms every daily challenge (`challengeInstanceId` is
        date-suffixed), fabricates a streak, and resets the interstitial day cap
        in `lib/ads/frequency.ts`; the entitlement toggle turns ads off outright.
        Shipped, that is a learner rewriting their own progress and our ad
        policy from the Settings screen — and once `FEATURES.cloudSync` is on,
        writing the fabrication to the server as history.

        This used to be ungated, with a comment arguing that somebody testing on
        a device has no console to reach for. That need is real and `__DEV__`
        already meets it: it is true in Expo Go and in any `eas build --profile
        development` client, so the row is still there on a phone all through
        development. It is false only in the builds that go to a store, where
        Metro strips this branch entirely.

        The screen itself refuses too (see Developer.tsx) — hiding the way in
        does not stop a deep link to chineseeasy://settings/developer.
      */}
      {__DEV__ && (
        <View style={{ gap: s.md }}>
          <Text
            className="font-nunito-extrabold"
            style={{ fontSize: 13, lineHeight: 17, letterSpacing: 0.3, color: c.textMuted, textTransform: 'uppercase' }}
          >
            Advanced
          </Text>
          <Card>
            <PressRow
              /* Same exit as the row that opened this screen — a link one level
                 down should not cut where the one above it eased. */
              onPress={() => leave(() => router.push('/settings/developer'))}
              accessibilityLabel="Developer options"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: setRow.minHeight,
                paddingHorizontal: setRow.padding,
                paddingVertical: s.md,
              }}
            >
              <IconCircle icon={Wrench} tint={c.slateSoft} color={c.slate} />
              <View style={{ flex: 1, marginLeft: setRow.iconGap, marginRight: s.sm }}>
                <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
                  Developer
                </Text>
                <Text
                  className="font-nunito-semibold"
                  numberOfLines={1}
                  style={{ fontSize: 13.5, lineHeight: 18, color: c.textSecondary, marginTop: 1 }}
                >
                  Simulated clock, replay onboarding
                </Text>
              </View>
              <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
            </PressRow>
          </Card>
        </View>
      )}

      <View style={{ padding: s.lg, borderRadius: setRadius.inner, backgroundColor: c.background }}>
        <Hint>
          Chinese Easy is English-only for now, so there is no interface language to choose.
        </Hint>
      </View>
    </DetailShell>
  )
}
