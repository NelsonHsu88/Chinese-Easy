import { Fragment, type ReactNode } from 'react'
import { View, Text, useWindowDimensions } from 'react-native'
import { PlayCircle, PencilLine } from 'lucide-react-native'
import { PressableScale, LiftedFace } from '../dashboard/parts'
import { ICON_GREEN, ICON_STROKE, SpeakChip } from './DictionaryControls'
import { DICT_BG } from './shadows'
import { hanziFont } from '../../lib/hanzi'
import { useApp } from '../../context/AppContext'
import { spacedReading } from '../SpacedReading'

/** The hero card's two action buttons' face height — see the comment above their row for why nothing there is a class. */
const HERO_BUTTON_HEIGHT = 50
const HERO_LABEL = { fontFamily: 'NunitoBold', fontSize: 15 } as const

/** One fact under the meaning ("8 strokes", "HSK 2"). `green` marks the level. */
export interface HeroFact {
  text: string
  green?: boolean
}

/** Room the hero needs besides the glyph: reading, meaning, facts, buttons, Add/Star. */
const HERO_FIXED = 236
const HERO_SAVE_ROW = 58

/**
 * The focused top of a detail page: the glyph, how to say it, what it means,
 * the facts worth a glance, the two things to do with it and, for an entry,
 * Add and Star.
 *
 * Sized from the height it is given, so every control fits without scrolling:
 * the glyph takes what is left, capped by length so a phrase still fits across.
 *
 * Both actions are offered for every entry — `HanziStage` falls back to the
 * hanzi-writer CDN for anything not bundled, and says so when even that fails.
 */
export function DetailHero({
  glyph,
  reading,
  meaning,
  facts,
  availableHeight,
  onWatch,
  onPractice,
  save,
}: {
  glyph: string
  reading: string
  meaning?: string
  facts: HeroFact[]
  availableHeight: number
  onWatch: () => void
  onPractice: () => void
  /** Add / Star, when there is an entry to save. */
  save?: ReactNode
}) {
  const face = hanziFont(useApp().settings.script)
  const { width: windowWidth } = useWindowDimensions()
  const length = Math.max(1, [...glyph].length)
  const column = Math.min(windowWidth, 430) - 40
  const cap = length === 1 ? 112 : length === 2 ? 96 : length === 3 ? 80 : 64
  const byWidth = (column / length) * 0.9
  const byHeight = (availableHeight - HERO_FIXED - (save ? HERO_SAVE_ROW : 0)) / 1.2
  const size = Math.round(Math.max(40, Math.min(cap, byWidth, byHeight)))

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        numberOfLines={1}
        style={{ fontSize: size, lineHeight: Math.round(size * 1.2), includeFontPadding: false }}
        className={`${face} text-dict-heading`}
        accessibilityRole="header"
      >
        {glyph}
      </Text>

      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {reading.length > 0 && (
          <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 22, lineHeight: 28, color: DICT_BG.green, includeFontPadding: false }}>
            {spacedReading(reading, 22)}
          </Text>
        )}
        <SpeakChip text={glyph} size={34} />
      </View>

      {meaning ? (
        <Text
          numberOfLines={2}
          style={{ marginTop: 8, textAlign: 'center', fontFamily: 'Nunito', fontSize: 17, lineHeight: 23, color: '#42526B' }}
        >
          {meaning}
        </Text>
      ) : null}

      {facts.length > 0 && (
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {facts.map((fact, i) => (
            <Fragment key={fact.text}>
              {i > 0 && <Text style={HERO_FACT}>  ·  </Text>}
              <Text style={[HERO_FACT, fact.green ? { color: DICT_BG.greenDark, fontFamily: 'NunitoSemiBold' } : null]}>
                {fact.text}
              </Text>
            </Fragment>
          ))}
        </View>
      )}

      {/*
        No NativeWind in this row — plain style objects. On Android, adding a
        word re-renders this block and NativeWind-applied padding was dropped,
        leaving the buttons blank; React Native applies plain objects itself.
      */}
      <View style={{ marginTop: 20, flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
        {/* The Dashboard's raised `LiftedFace` buttons, sinking onto their shoulder on press. */}
        <PressableScale onPress={onWatch} wrapperStyle={{ flex: 1 }} scaleTo={1} haptic={false} accessibilityLabel="Watch stroke order">
          <LiftedFace height={HERO_BUTTON_HEIGHT} radius={14} fill={DICT_BG.greenDark} shoulder={DICT_BG.greenDarkShoulder}>
            <PlayCircle size={18} color="#ffffff" strokeWidth={ICON_STROKE} />
            <Text numberOfLines={1} style={[HERO_LABEL, { color: '#ffffff' }]}>
              Stroke order
            </Text>
          </LiftedFace>
        </PressableScale>
        <PressableScale onPress={onPractice} wrapperStyle={{ flex: 1 }} scaleTo={1} haptic={false} accessibilityLabel="Practice writing">
          <LiftedFace
            height={HERO_BUTTON_HEIGHT}
            radius={14}
            fill={DICT_BG.card}
            border={DICT_BG.green}
            shoulder={DICT_BG.green}
            shadow={false}
          >
            <PencilLine size={18} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
            <Text numberOfLines={1} style={[HERO_LABEL, { color: DICT_BG.greenDark }]}>
              Practice
            </Text>
          </LiftedFace>
        </PressableScale>
      </View>

      {save ? <View style={{ marginTop: 14 }}>{save}</View> : null}
    </View>
  )
}

const HERO_FACT = { fontFamily: 'Nunito', fontSize: 14, lineHeight: 20, color: '#8290A6' } as const
