import { Redirect, router } from 'expo-router'
import { Layers, Sparkles, Target } from 'lucide-react-native'
import { LessonCompletionCelebration } from '../components/celebration/LessonCompletionCelebration'

/*
 * Development only: the completion celebration with sample results, so it can
 * be watched and re-watched (long-press Shifu to replay) without finishing a
 * real session. Production builds bounce straight home.
 */
export function CelebrationPreview() {
  if (!__DEV__) return <Redirect href="/" />
  return (
    <LessonCompletionCelebration
      stats={[
        { icon: Sparkles, tone: 'xp', value: '+80', label: 'XP earned' },
        { icon: Layers, tone: 'words', value: '9', label: 'Reviewed' },
        { icon: Target, tone: 'accuracy', value: '89%', label: 'Accuracy' },
      ]}
      onContinue={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  )
}
