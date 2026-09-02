import { useState, type ComponentType } from 'react'
import { View, Text } from 'react-native'
import { Tabs, router, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Home,
  GraduationCap,
  Sparkles,
  Library,
  Repeat,
  BookOpen,
  Settings as SettingsIcon,
  PenTool,
} from 'lucide-react-native'
import { dashColors as tabColors } from '../../components/dashboard/tokens'
import { useApp } from '../../context/AppContext'
import { dueCountFor } from '../../lib/selectors'
import { FEATURES } from '../../lib/features'
import { tickHaptic } from '../../lib/haptics'
import { TabPickerSheet } from '../../components/TabPickerSheet'
import { TourPulse } from '../../components/tour/TourPulse'
import { WritingGuideModal } from '../../components/WritingGuideModal'

/**
 * One tab: icon over label, both inside the pale-green pill when active.
 *
 * The pill has to wrap *both*, which is why `tabBarShowLabel` is off and the
 * label is drawn here instead. React Navigation renders its own icon and label
 * as separate siblings, so a background behind the pair is not something
 * `tabBarIcon` alone can produce.
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
        paddingVertical: 7,
        borderRadius: 16,
        backgroundColor: focused ? tabColors.greenSoft : 'transparent',
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
        className="font-nunito-semibold"
        numberOfLines={1}
        style={{ fontSize: 11.5, lineHeight: 15, color, marginTop: 3 }}
      >
        {label}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  const { deck, newlyAddedWordIds, reportTourAction } = useApp()
  const dueCount = dueCountFor(deck)
  const pathname = usePathname()

  /*
   * The word and character screens are pushed inside the Dictionary tab's own
   * stack, so the navigator's `focused` flag does still hold there. This is kept
   * anyway to cover the standalone `/dictionary` route, which is a sibling of
   * the whole tab group and would otherwise leave nothing lit.
   */
  const dictionarySection = pathname.startsWith('/dictionary')
  const [openSheet, setOpenSheet] = useState<'lessons' | null>(null)
  const [showGuide, setShowGuide] = useState(false)

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
   * of 12 is for the last case — it lifts the labels off the very bottom edge,
   * which is the nudge that was asked for and costs nothing where the inset
   * already covers it.
   */
  const insets = useSafeAreaInsets()
  const barInset = Math.max(insets.bottom, 12)

  return (
    <>
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
            height: 70 + barInset,
            paddingTop: 8,
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
          listeners={{ tabPress: () => { tickHaptic(); setOpenSheet(null) } }}
        />
        {/*
          This tab stays put even with Lessons switched off: it's the only route
          to New Words and Books, which open from its picker sheet below. With
          Lessons hidden it's just relabelled, since "Lessons" would then name
          the one thing the sheet can't offer.
        */}
        <Tabs.Screen
          name="lessons-tab"
          options={{
            title: FEATURES.lessons ? 'Lessons' : 'Learn',
            tabBarIcon: ({ focused }) => (
              <TourPulse target="learn-tab" radius={16} inset={3}>
                <TabItem
                  icon={FEATURES.lessons ? GraduationCap : BookOpen}
                  label={FEATURES.lessons ? 'Lessons' : 'Learn'}
                  focused={focused}
                />
              </TourPulse>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              tickHaptic()
              setOpenSheet('lessons')
              reportTourAction('learn:open')
            },
          }}
        />
        <Tabs.Screen
          name="review-tab"
          options={{
            title: 'Review',
            tabBarIcon: ({ focused }) => <TabItem icon={Repeat} label="Review" focused={focused} />,
            tabBarBadge: dueCount > 0 ? (dueCount > 99 ? '99+' : dueCount) : undefined,
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
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              tickHaptic()
              setOpenSheet(null)
              router.push('/review')
            },
          }}
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
          listeners={{ tabPress: () => { tickHaptic(); setOpenSheet(null) } }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused }) => <TabItem icon={SettingsIcon} label="Settings" focused={focused} />,
          }}
          listeners={{ tabPress: () => { tickHaptic(); setOpenSheet(null) } }}
        />
      </Tabs>

      <TabPickerSheet
        visible={openSheet === 'lessons'}
        title="What would you like to do?"
        onClose={() => setOpenSheet(null)}
        options={[
          ...(FEATURES.lessons
            ? [
                {
                  key: 'lessons',
                  label: 'Lessons',
                  description: 'Work through units, one skill at a time',
                  icon: GraduationCap,
                  onPress: () => router.push('/lessons'),
                },
              ]
            : []),
          { key: 'new-words', label: 'New Words', description: 'Flip through fresh vocabulary', icon: Sparkles, onPress: () => router.push('/new-words') },
          { key: 'books', label: 'Books', description: 'Read short stories in Chinese', icon: Library, onPress: () => router.push('/books') },
          {
            key: 'writing-guide',
            label: 'How to write Chinese',
            description: 'Radicals, stroke order, and how characters are built',
            icon: PenTool,
            onPress: () => setShowGuide(true),
          },
        ]}
      />

      {showGuide && <WritingGuideModal onClose={() => setShowGuide(false)} />}
    </>
  )
}
