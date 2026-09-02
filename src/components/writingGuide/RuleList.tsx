import { View, Text, Pressable } from 'react-native'
import { ArrowDown, ArrowRight, Plus, Square, SquareDashedBottom } from 'lucide-react-native'
import { guideColors as c, spacing, type as t } from './tokens'
import { tapHaptic } from '../../lib/haptics'

/*
 * The stroke-order rules, as things you can pick rather than a paragraph.
 *
 * Each row is its own pill, matching the reference. Tapping one does not expand
 * it — it swaps the character in the writing card *above* the list, so the rule
 * you chose is demonstrated at full size by the real writer. That keeps the
 * layout exactly as drawn while still making every rule something you can watch
 * happen, and it means only ever one animation on the page instead of five
 * WebViews stacked inside a list.
 */

export interface StrokeRule {
  label: string
  icon: typeof ArrowDown
  /** The character whose stroke order shows the rule. */
  character: string
  /** One line under the writing card while this rule is selected. */
  caption: string
}

export const STROKE_RULES: StrokeRule[] = [
  {
    label: 'Top to bottom',
    icon: ArrowDown,
    character: '三',
    caption: 'The three bars are written downward, never up.',
  },
  {
    label: 'Left to right',
    icon: ArrowRight,
    character: '好',
    caption: '女 finishes completely before 子 begins.',
  },
  {
    label: 'Horizontal before vertical',
    icon: Plus,
    character: '木',
    caption: 'The horizontal comes first, then the vertical, then the two legs.',
  },
  {
    label: 'Outside before inside',
    icon: Square,
    character: '同',
    caption: 'The frame is drawn before anything inside it.',
  },
  {
    label: 'Close frames last',
    icon: SquareDashedBottom,
    character: '回',
    caption: 'Fill the box, then seal the bottom.',
  },
]

export function RuleList({
  selected,
  onSelect,
}: {
  selected: number
  onSelect: (index: number) => void
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {STROKE_RULES.map((rule, i) => {
        const Icon = rule.icon
        const active = selected === i
        return (
          <Pressable
            key={rule.label}
            onPress={() => {
              tapHaptic()
              onSelect(i)
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={rule.label}
            className="flex-row items-center active:opacity-70"
            style={{
              backgroundColor: active ? c.takeawayBg : c.plainCardBg,
              borderColor: active ? c.takeawayBorder : c.plainCardBorder,
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: spacing.lg,
              paddingVertical: 13,
              gap: spacing.md,
            }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 30, height: 30, backgroundColor: c.green }}
            >
              <Icon size={16} color="#ffffff" strokeWidth={2.6} />
            </View>
            <Text
              className="font-nunito-bold"
              style={{ fontSize: t.smallLabel.fontSize, color: c.textMuted, width: 12 }}
            >
              {i + 1}
            </Text>
            <Text className="flex-1 font-nunito-semibold" style={{ fontSize: 15.5, color: c.navy }}>
              {rule.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
