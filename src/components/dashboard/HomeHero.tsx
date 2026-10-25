import { View, Text, Animated, PixelRatio } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BrushHighlight } from '../BrushHighlight'
import { RefHero, ShifuBubble, shifuBubbleFontSize } from '../refScene'
import { homeArt, HOME_HERO_SIZE } from './art'
import { useReveal } from './entrance'
import { dashColors, dashEntrance as e, homeColors as c, homeType as t, homeLayout as l } from './tokens'

/*
 * The greeting scene, built to "SS1020 Redesign UI header".
 *
 * The painting (`homeArt.hero`, cut by `scripts/processSS1020HeroArt.mjs`) is
 * the whole scene — Shifu with his fan, the sun, the range, the pagoda and the
 * blossom — laid across the column at its own 3:2 ratio, never stretched. The
 * greeting, the name on its brush stroke and the welcome line are drawn over
 * its open left side, placed as fractions of the painting so they land where
 * SS1020 put them at any width.
 *
 * The previous painting (`app/home-hero.png`) drew Shifu with a squashed head;
 * that was the render itself, so the fix was a new render, not a layout change.
 */
export function HomeHero({
  greetingLead,
  greetingTail,
  name,
  columnWidth,
  run,
}: {
  greetingLead: string
  greetingTail: string
  name: string
  /** The full column, margins included: the painting runs edge to edge. */
  columnWidth: number
  /** Ticks on every focus; restarts the entrance. */
  run: number
}) {
  /* The painting's height at this width — its own ratio, so nothing is distorted. */
  const artHeight = (columnWidth * HOME_HERO_SIZE.height) / HOME_HERO_SIZE.width
  const textLeft = l.screen + l.heroInset
  /* The type shrinks with the painting on a narrow phone (to 82%), so it keeps to the same open sky. */
  const typeScale = Math.max(0.82, Math.min(1, columnWidth / DESIGN_COLUMN))

  /*
   * Room for each line, from where SS1020 keeps its type: the greeting stops
   * short of the sun, the name short of Shifu's topknot, and the welcome line
   * short of the pagoda. Lora Bold averages ~0.55em a letter; Android has no
   * shrink-to-fit, so sizes are worked out rather than left to the platform.
   */
  const greetingText = `${greetingLead} ${greetingTail},`
  const greetingRoom = columnWidth * GREETING_RIGHT - textLeft
  const greetingSize = Math.max(17, Math.min(t.greeting.fontSize * typeScale, greetingRoom / (greetingText.length * 0.55)))
  const nameRoom = columnWidth * NAME_RIGHT - textLeft
  /*
   * A name too long for its line, even at the smallest size the line allows,
   * would end in "…" — so it is greeted as "Scholar" instead. Measured by
   * estimate (no shrink-to-fit on Android), counting CJK and capitals as the
   * wider glyphs they are, and at the text size the system may scale it to.
   */
  const fontScale = Math.min(NAME_MAX_FONT_SCALE, PixelRatio.getFontScale())
  const shownName = nameEms(name) * NAME_MIN_SIZE * fontScale * NAME_FIT_MARGIN > nameRoom ? FALLBACK_NAME : name
  const nameSize = Math.max(NAME_MIN_SIZE, Math.min(t.name.fontSize * typeScale, nameRoom / (nameEms(shownName) * NAME_FIT_MARGIN)))
  /* Shifu's welcome, in the bubble Learn and Review share. Wide enough for two or
     three lines of the hand, and stopping short of Shifu so his face stays clear. */
  const bubbleWidth = Math.max(150, columnWidth * BUBBLE_RIGHT - textLeft)

  const scene = useReveal({ from: 'bottom', at: e.scenery.at, duration: e.shifu.for, run, distance: 18 })
  const greeting = useReveal({ from: 'left', at: e.greeting.at, duration: e.greeting.for, run, distance: e.slideX })

  return (
    <View style={{ minHeight: artHeight * HERO_HEIGHT_SHARE, overflow: 'hidden' }}>
      <RefHero source={homeArt.hero.source} ratio={HOME_HERO_SIZE.width / HOME_HERO_SIZE.height} column={columnWidth} animatedStyle={scene} />
      {/* The landscape's foot dissolves into the page instead of ending on a hard edge. */}
      <LinearGradient
        pointerEvents="none"
        colors={[FADE_CLEAR, dashColors.background]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HERO_FADE }}
      />

      <View style={{ paddingLeft: textLeft, paddingTop: artHeight * TEXT_TOP, paddingBottom: 12 }}>
        <Animated.View style={greeting}>
          <Text
            className="font-nunito-extrabold"
            accessibilityRole="header"
            style={{ ...t.greeting, fontSize: greetingSize, lineHeight: greetingSize * 1.26, color: c.ink, maxWidth: greetingRoom }}
          >
            {greetingText}
          </Text>
          <View style={{ marginTop: 2, alignSelf: 'flex-start' }}>
            {/* A soft wash behind the whole name, ascenders to baseline. The swipe's
                own edges sit inside its box (top ~7–20%, bottom ~72–86%), so the box
                overhangs the text above and below for the paint to reach both. */}
            <BrushHighlight color={c.nameWash} bleedX={6} bleedTop={-nameSize * 0.12} bleedBottom={-nameSize * 0.1} fleck={false}>
              <Text
                className="font-nunito-extrabold"
                numberOfLines={1}
                maxFontSizeMultiplier={NAME_MAX_FONT_SCALE}
                style={{ ...t.name, fontSize: nameSize, lineHeight: nameSize * 1.13, color: c.ink, paddingHorizontal: 2, maxWidth: nameRoom }}
              >
                {shownName}!
              </Text>
            </BrushHighlight>
          </View>
        </Animated.View>

        <Animated.View style={[{ marginTop: BUBBLE_GAP, alignSelf: 'flex-start' }, greeting]}>
          <ShifuBubble message="Great to see you! Let’s keep learning today." width={bubbleWidth} fontSize={shifuBubbleFontSize(columnWidth)} />
        </Animated.View>
      </View>
    </View>
  )
}

/** The name line's smallest size, and the most the system text size may enlarge it. */
const NAME_MIN_SIZE = 24
const NAME_MAX_FONT_SCALE = 1.25
/** Headroom on the width estimate, so a near miss falls back rather than truncating. */
const NAME_FIT_MARGIN = 1.08
/** Who the greeting addresses when the learner's name won't fit on its line. */
const FALLBACK_NAME = 'Scholar'

/** The name and its "!" in ems of Nunito ExtraBold — CJK and full-width glyphs a full em. */
function nameEms(name: string): number {
  let ems = 0.32 // the "!"
  for (const ch of name) {
    if (/[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch)) ems += 1
    else if (/[A-Z0-9]/.test(ch)) ems += 0.66
    else if (/\s/.test(ch)) ems += 0.26
    else ems += 0.56
  }
  return ems
}

/** The column SS1020 is laid out for; the type is full size from here up. */
const DESIGN_COLUMN = 390
/* Where SS1020 sets its type, as fractions of the painting. */
/** The greeting's first line starts this far down the painting. */
const TEXT_TOP = 0.15
/** The greeting stops short of the sun… */
const GREETING_RIGHT = 0.56
/** …the name short of Shifu's topknot… */
const NAME_RIGHT = 0.58
/** …and Shifu's bubble short of his fan and face. */
const BUBBLE_RIGHT = 0.5
/**
 * How much of the painting's height the hero claims. A little less than all of
 * it: the foot is soft mist, and the fade below carries it into the page.
 */
const HERO_HEIGHT_SHARE = 0.94
/** The fade at the hero's foot. */
const HERO_FADE = 44
/** The page colour at zero alpha — a transparent that fades towards white rather than grey. */
const FADE_CLEAR = 'rgba(255,255,255,0)'
/** Between the name and Shifu's bubble below. */
const BUBBLE_GAP = 12

