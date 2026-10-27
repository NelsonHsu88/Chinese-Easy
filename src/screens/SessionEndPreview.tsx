import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { SessionEnd, type SessionMode } from '../components/sessionEnd/SessionEnd'

/*
 * Development only: the review session's "Session Complete" screen with sample
 * results, so the result boxes can be watched without finishing a session.
 * `?reviewed=12&correct=9&xp=48&mode=flashcards` sets the numbers; a long
 * press anywhere replays it. Production builds bounce straight home.
 */
export function SessionEndPreview() {
  const params = useLocalSearchParams<{ reviewed?: string; correct?: string; xp?: string; mode?: string; empty?: string }>()
  const [run, setRun] = useState(0)
  if (!__DEV__) return <Redirect href="/" />
  const reviewed = Number(params.reviewed ?? 12)
  const correct = Number(params.correct ?? 9)
  const xp = Number(params.xp ?? 48)
  const mode = (params.mode ?? 'flashcards') as SessionMode
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))
  return (
    <Pressable style={{ flex: 1 }} onLongPress={() => setRun((n) => n + 1)} accessible={false}>
      <View key={run} style={{ flex: 1 }}>
        {params.empty ? (
          <SessionEnd kind="empty" mode={mode} onBack={back} />
        ) : (
          <SessionEnd kind="done" mode={mode} onBack={back} reviewed={reviewed} correct={correct} xpEarned={xp} timedOut={false} />
        )}
      </View>
    </Pressable>
  )
}
