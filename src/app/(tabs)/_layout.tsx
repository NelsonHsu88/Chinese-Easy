import { type ComponentType } from 'react'
import { View, Text } from 'react-native'
import { Tabs, router, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, GraduationCap, Library, Repeat, BookOpen, Settings as SettingsIcon } from 'lucide-react-native'
import { dashColors as tabColors } from '../../components/dashboard/tokens'
import { useApp } from '../../context/AppContext'
import { dueCountFor } from '../../lib/selectors'
import { FEATURES } from '../../lib/features'
import { tickHaptic } from '../../lib/haptics'
import { TAB_BAR_BODY, tabBarInset } from '../../lib/tabBar'

/**
 * One tab: icon over label, as SS1017 draws it — the active tab in jade with a
 * small jade dot under its label, the rest in slate; no pill.
 *
 * `tabBarShowLabel` is off and the label is drawn here, so the icon, label and
 * dot stay one centred group.
 */
function TabItem({
  icon: Icon,
  label,
  focused,
  badge = false,
  filled = false,
}: {
  icon: ComponentType<{ color: string; size: number; strokeWidth: number; fill?: string }>
  label: string
  focused: boolean
  /** The unseen-new-words dot on the Dictionary tab. */
  badge?: boolean
  /** Paints the glyph's interior when active — Home and Dictionary only. */
  filled?: boolean
}) {
  const color = focused ? tabColors.greenDark : '#7C8798'

  return (
    <View
      className="items-center justify-center"
      style={{
        width: 64,
        paddingTop: 4,
      }}
    >
      <View>
        <Icon
          color={color}
          size={23}
          strokeWidth={focused ? 2.4 : 2.1}
          fill={filled && focused ? color : 'transparent'}
        />
        {badge && (
          <View
            className="absolute rounded-full"
            style={{
              right: -3,
              top: -1,
              width: 9,
              height: 9,
              backgroundColor: tabColors.coral,
              borderWidth: 1.5,
              borderColor: '#FFFFFF',
            }}
          />
        )}
      </View>
      <Text
        className={focused ? 'font-nunito-bold' : 'font-nunito-semibold'}
        numberOfLines={1}
        style={{ fontSize: 11.5, lineHeight: 15, color, marginTop: 3 }}
      >
        {label}
      </Text>

    </View>
  )
}

export default function TabsLayout() {
  const { deck, newlyAddedWordIds } = useApp()
  const dueCount = dueCountFor(deck)
  const pathname = usePathname()

  /*
   * The word and character screens are pushed inside the Dictionary tab's own
   * stack, so the navigator's `focused` flag does still hold there. This is kept
   * anyway to cover the standalone `/dictionary` route, which is a sibling of
   * the whole tab group and would otherwise leave nothing lit.
   */
  const dictionarySection = pathname.startsWith('/dictionary')
  const reviewOpen = pathname === '/review-tab'

  /*
   * Room under the tabs for the system's own navigation.
   *
   * Setting `tabBarStyle.height` replaces the height React Navigation would
   * otherwise compute — and the part it computes is precisely the safe-area
   * inset. So a fixed 70 put this bar *underneath* Android's gesture pill or
   * three-button nav, which is why the tab buttons were being intercepted.
   *
   * Derived rather than a magic offset: a 3-button Android nav wants ~48dp, an
   * iPhone home indicator 34, and a device with neither wants none. The floor
   * of 6 is for the last case — it lifts the labels off the very bottom edge
   * and costs nothing where the inset already covers it.
   *
   * The bar above the inset is exactly as tall as a tab (`TAB_BAR_BODY`), with
   * nothing spare under the labels. It used to be 70 over a floor of 12, which
   * left a band of empty bar between the labels and the phone's own navigation
   * buttons — the bar read as floating too high up the screen.
   */
  const insets = useSafeAreaInsets()
  const barInset = tabBarInset(insets.bottom)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        /*
         * The label is drawn inside `tabBarIcon` (see `TabItem`) so the active
         * pill can wrap the icon and the label together. The bar itself is
         * warm white against the Dashboard's cream, separated by a hairline
         * rather than a shadow — the whole design is soft, not elevated.
         */
        tabBarShowLabel: false,
        tabBarStyle: {
          height: TAB_BAR_BODY + barInset,
          paddingTop: 6,
          paddingBottom: barInset,
          // Warm white, not pure white — the bar sits under cream paper on
          // every screen it frames, and #FFFFFF reads as a cold strip.
          backgroundColor: tabColors.card,
          borderTopWidth: 1,
          borderTopColor: tabColors.border,
          elevation: 0,
        },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabItem icon={Home} label="Home" focused={focused} filled />,
        }}
        listeners={{ tabPress: () => tickHaptic() }}
      />
      {/*
        This tab stays put even with Lessons switched off: it's the route to
        the Learn screen, which is the only way to New Words and Books. With
        Lessons hidden it's just relabelled, since "Lessons" would then name
        the one thing that screen can't offer.
      */}
      <Tabs.Screen
        name="lessons-tab"
        options={{
          title: FEATURES.lessons ? 'Lessons' : 'Learn',
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon={FEATURES.lessons ? GraduationCap : BookOpen}
              label={FEATURES.lessons ? 'Lessons' : 'Learn'}
              focused={focused}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            tickHaptic()
          },
        }}
      />
      <Tabs.Screen
        name="review-tab"
        options={{
          title: 'Review',
          tabBarIcon: ({ focused }) => <TabItem icon={Repeat} label="Review" focused={focused} />,
          /*
           * Hidden while the Review tab is open: the learner is already looking
           * at what's due, so the count has said what it had to. React
           * Navigation's badge animates its own opacity when it goes, so it
           * fades away rather than blinking out, and fades back on leaving.
           */
          tabBarBadge: dueCount > 0 && !reviewOpen ? (dueCount > 99 ? '99+' : dueCount) : undefined,
          /*
           * Nudged up and right so it clears the icon. The default position
           * assumes the navigator's own icon-above-label layout; `TabItem`
           * draws both itself, which sits lower in the bar.
           */
          tabBarBadgeStyle: {
            backgroundColor: tabColors.coral,
            fontSize: 10,
            lineHeight: 14,
            minWidth: 17,
            height: 17,
            top: -3,
            marginLeft: 15,
          },
        }}
        listeners={{ tabPress: () => tickHaptic() }}
      />
      <Tabs.Screen
        name="dictionary-tab"
        options={{
          title: 'Dictionary',
          /*
           * Lit from `dictionarySection` rather than the navigator's own
           * `focused`, so the standalone `/dictionary` route keeps the tab
           * highlighted too. Filled when active, like Home — Lucide draws in
           * strokes, so "filled" means painting the interior in the same
           * green, which reads as a solid book rather than an outline of one.
           */
          tabBarIcon: () => (
            <TabItem
              icon={Library}
              label="Dictionary"
              focused={dictionarySection}
              filled
              badge={newlyAddedWordIds.length > 0}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            tickHaptic()
            /*
             * Tapping the tab while already inside it returns to the browse
             * screen, rather than just refocusing the tab on whatever word or
             * character screen a previous visit pushed onto the nested stack
             * (see Routing in CLAUDE.md). The other tabs have no nested stack
             * to leave stranded on, so this is the one place that needs it.
             */
            if (dictionarySection && pathname !== '/dictionary-tab') {
              e.preventDefault()
              router.navigate('/dictionary-tab')
              return
            }
            /*
             * Already sitting on the browse screen itself — the index route
             * doesn't change, so the tab press above would otherwise be a
             * no-op and a learner stuck three levels into HSK 3 vocabulary
             * has no way back to the landing page except Back taps. `reload`
             * is a param the screen itself doesn't use for anything but
             * noticing it changed (see Dictionary.tsx) — bumping it is a
             * signal to reset local state, not a real navigation.
             */
            if (dictionarySection && pathname === '/dictionary-tab') {
              router.setParams({ reload: String(Date.now()) })
            }
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabItem icon={SettingsIcon} label="Settings" focused={focused} />,
        }}
        listeners={{ tabPress: () => tickHaptic() }}
      />
    </Tabs>
  )
}
