import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { multipleMeaningsTag as T } from './dashboard/tokens'

/**
 * A small yellow tag saying the word has more than one meaning, so the single
 * gloss beside it isn't taken as the whole story. Shown where
 * `hasMultipleMeanings` is true: the dictionary's result cards and word page,
 * and the New Words card. Plain style objects (no NativeWind), since it sits
 * inside rows that re-render on Add.
 */
export function MultipleMeaningsTag({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel="This word has multiple meanings"
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: T.fill,
          borderColor: T.border,
          borderWidth: 1,
          borderRadius: 7,
          paddingHorizontal: 7,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={{ fontFamily: 'NunitoBold', fontSize: 11, lineHeight: 15, color: T.ink, includeFontPadding: false }}
      >
        Multiple meanings
      </Text>
    </View>
  )
}
