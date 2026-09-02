import { View, Text, Image, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import type { Story } from '../../types'
import { useApp } from '../../context/AppContext'
import { hanziFont } from '../../lib/hanzi'
import { forScript } from '../../lib/scriptConversion'
import { paletteFor } from './storyPresentation'

interface Props {
  story: Story
  width: number
  height: number
  radius: number
  /** Scales the fallback glyph. 1 fills most of the tile; lower it on tall posters. */
  glyphScale?: number
}

/*
 * A story's cover. No watercolour artwork ships with the app yet, so when a story
 * has no `art` this paints a stand-in from its own colour family: a soft two-stop
 * wash, a couple of translucent blooms where pigment would pool, and the story's
 * first character set in the same serif the reader uses.
 *
 * The point is that the placeholder reads as a deliberate design, not a missing
 * image — no icon, no grey box, no "no image" text. Give a story an `art` field
 * and it takes over this slot with nothing else to change.
 */
export function StoryArt({ story, width, height, radius, glyphScale = 1 }: Props) {
  const palette = paletteFor(story)
  // Read before the early return below — a hook must not sit behind a branch.
  const script = useApp().settings.script

  if (story.art) {
    return (
      <Image
        source={story.art}
        style={{ width, height, borderRadius: radius }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    )
  }

  // Keyed off the shorter edge so the glyph and blooms stay in proportion
  // whether this is a square list thumbnail or a tall poster.
  const base = Math.min(width, height)

  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
      <LinearGradient
        colors={[palette.wash, palette.soft]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Pigment blooms. Kept very faint — they should suggest paper texture
          rather than draw the eye away from the character. */}
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Circle cx={width * 0.26} cy={height * 0.24} r={base * 0.26} fill={palette.strong} opacity={0.08} />
        <Circle cx={width * 0.78} cy={height * 0.72} r={base * 0.32} fill={palette.strong} opacity={0.06} />
        <Circle cx={width * 0.62} cy={height * 0.2} r={base * 0.13} fill="#ffffff" opacity={0.35} />
      </Svg>
      <View className="flex-1 items-center justify-center">
        <Text
          className={hanziFont(script, 'semibold')}
          style={{
            fontSize: base * 0.42 * glyphScale,
            lineHeight: base * 0.56 * glyphScale,
            color: palette.strong,
            opacity: 0.62,
          }}
        >
          {forScript(story.title, script).slice(0, 1)}
        </Text>
      </View>
    </View>
  )
}
