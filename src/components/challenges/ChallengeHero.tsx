import { View, Text } from 'react-native'
import { Clock } from 'lucide-react-native'
import { ProgressBar, ProgressRing } from './ChallengeParts'
import { BrushHighlight } from '../BrushHighlight'
import { CHAL, HERO } from './tokens'

/*
 * The hero: how much of today is done.
 *
 * The screen's visual anchor and the answer to the question the learner opened
 * it with. Left column carries the words and the XP bar, right column the ring —
 * roughly 60/40, because the ring needs room to breathe and the sentence needs
 * more than a column of two-word lines.
 *
 * The handwritten reset note deliberately overhangs the bottom edge. Everything
 * else on this screen is a rounded rectangle in a stack of rounded rectangles;
 * the one element that breaks the grid is what stops it reading as a settings
 * page.
 */

export function ChallengeHero({
  title,
  subtitle,
  completed,
  total,
  xpEarned,
  xpAvailable,
  footnote,
}: {
  title: string
  subtitle: string
  completed: number
  total: number
  xpEarned: number
  xpAvailable: number
  /** The handwritten note taped across the bottom edge. Omitted for milestones, which don't reset. */
  footnote?: string
}) {
  const ratio = total === 0 ? 0 : completed / total
  const xpRatio = xpAvailable === 0 ? 0 : Math.min(1, xpEarned / xpAvailable)

  return (
    <View style={{ paddingBottom: footnote ? 18 : 0 }}>
      <View
        className="shadow-chal"
        style={{
          borderRadius: HERO.radius,
          padding: HERO.padding,
          minHeight: HERO.minHeight,
          backgroundColor: CHAL.mintPale,
          borderWidth: 1,
          borderColor: CHAL.mintLine,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-nunito-extrabold" style={{ fontSize: 25, lineHeight: 32, color: CHAL.navy }}>
            {title}
          </Text>
          <Text className="mt-1 font-nunito-semibold" style={{ fontSize: 15, lineHeight: 21, color: CHAL.body }}>
            {subtitle}
          </Text>

          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text className="font-nunito-extrabold" style={{ fontSize: 19, color: CHAL.greenDeep }}>
                {xpEarned}
              </Text>
              <Text className="font-nunito-semibold" style={{ fontSize: 16, color: CHAL.body }}>
                {' / '}
                {xpAvailable} XP
              </Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <ProgressBar ratio={xpRatio} fill={CHAL.green} track={CHAL.mintTrack} />
            </View>
          </View>
        </View>

        <ProgressRing ratio={ratio}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text className="font-nunito-extrabold" style={{ fontSize: 32, lineHeight: 38, color: CHAL.navy }}>
              {completed}
            </Text>
            <Text className="font-nunito-semibold" style={{ fontSize: 17, color: CHAL.body }}>
              {' / '}
              {total}
            </Text>
          </View>
          <Text className="font-nunito-bold" style={{ fontSize: 13, color: CHAL.greenDeep }}>
            Completed
          </Text>
        </ProgressRing>
      </View>

      {footnote && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <BrushHighlight color={CHAL.goldSoft} bleedX={16} bleedTop={5} bleedBottom={3}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Clock size={16} color={CHAL.goldInk} strokeWidth={2.25} />
                <Text className="font-handwriting-medium" style={{ fontSize: 19, color: CHAL.noteInk }}>
                  {footnote}
                </Text>
              </View>
            </BrushHighlight>
          </View>
        </View>
      )}
    </View>
  )
}
