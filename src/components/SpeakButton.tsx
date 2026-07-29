import { Pressable } from 'react-native'
import { Volume2 } from 'lucide-react-native'
import { speak } from '../lib/speech'

interface Props {
  text: string
  size?: number
  className?: string
  label?: string
}

/** A small speaker button that reads Chinese text aloud via text-to-speech. */
export function SpeakButton({ text, size = 18, className = '', label = 'Play pronunciation' }: Props) {
  return (
    <Pressable
      onPress={() => speak(text)}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`items-center justify-center rounded-full bg-slate-100 p-2 dark:bg-slate-800 ${className}`}
    >
      <Volume2 size={size} color="#64748b" />
    </Pressable>
  )
}
