import { View } from 'react-native'
import { speak } from '../lib/speech'
import { IconChip } from './dictionary/DictionaryControls'

interface Props {
  text: string
  size?: number
  className?: string
  label?: string
}

/** A small speaker button that reads Chinese text aloud via text-to-speech. `size` is the icon's size. */
export function SpeakButton({ text, size = 18, className = '', label = 'Play pronunciation' }: Props) {
  /* The dictionary word card's raised speaker, so every audio button in the app is one object. */
  return (
    <View className={className}>
      <IconChip icon="speaker" size={size + 18} label={label} onPress={() => speak(text)} />
    </View>
  )
}
