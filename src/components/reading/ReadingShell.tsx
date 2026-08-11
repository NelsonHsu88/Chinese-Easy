import type { ReactNode } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/** The width the reading screens are designed against (a ~431px mobile viewport). */
export const DESIGN_WIDTH = 430

/*
 * Cream page plus a centred column capped at the design width.
 *
 * On a phone the cap never binds and this is just the background colour. It earns
 * its keep on web and tablets, where a full-bleed 1200px row would stretch a
 * 118pt story card into a letterbox and pull its illustration away from its text.
 */
export function ReadingShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 items-center" style={{ backgroundColor: '#fdfbf5' }}>
      <View className="w-full flex-1" style={{ maxWidth: DESIGN_WIDTH }}>
        {children}
      </View>
    </SafeAreaView>
  )
}
