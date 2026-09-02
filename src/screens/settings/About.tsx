import { View, Text } from 'react-native'
import { DetailShell, ControlGroup, Card, Hint } from '../../components/settings/parts'
import { setColors as c, setSpacing as s, setRadius } from '../../components/settings/tokens'
import { hskFrequency } from '../../data/hskFrequency'
import { STORIES } from '../../data/stories'
import appConfig from '../../../app.json'

/*
 * About — where the reference puts "Offline".
 *
 * That row was dropped rather than faked: this app has no download feature at
 * all. Every character's stroke data, the whole word bank and all the stories
 * are compiled into the bundle, so there is nothing to fetch and a button
 * offering to fetch it would do nothing.
 *
 * What does belong in that slot is this. CC-CEDICT is CC BY-SA 4.0 and Unihan
 * carries the Unicode licence; both *require* attribution, and an app that
 * ships 20,000 of someone else's dictionary entries owes them a credit screen
 * rather than a line in a README nobody installs.
 */

const CREDITS = [
  {
    title: 'CC-CEDICT',
    body: 'The Chinese–English dictionary behind the word bank and every definition in the app. Licensed CC BY-SA 4.0.',
  },
  {
    title: 'Unicode Unihan database',
    body: 'Character readings and the Kangxi radical index behind the dictionary’s Radical section.',
  },
  {
    title: 'hanzi-writer',
    body: 'Stroke order data and the animation engine behind every writing practice screen. MIT licensed.',
  },
  {
    title: 'Lucide',
    body: 'The icon set used throughout the interface. ISC licensed.',
  },
]

export function About() {
  return (
    <DetailShell title="About">
      <Card style={{ padding: s.xl, gap: s.xs }}>
        <Text
          className="font-nunito-extrabold"
          style={{ fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: c.navy }}
        >
          {appConfig.expo.name}
        </Text>
        <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.textSecondary }}>
          Version {appConfig.expo.version}
        </Text>
        <View style={{ marginTop: s.md }}>
          <Hint>
            {hskFrequency.length.toLocaleString()} words and {STORIES.length} stories, all bundled
            with the app — every one of them works with no network.
          </Hint>
        </View>
      </Card>

      <ControlGroup title="Built with">
        {CREDITS.map((credit) => (
          <View key={credit.title} style={{ gap: 3 }}>
            <Text className="font-nunito-bold" style={{ fontSize: 15, lineHeight: 20, color: c.navy }}>
              {credit.title}
            </Text>
            <Hint>{credit.body}</Hint>
          </View>
        ))}
      </ControlGroup>

      <View style={{ padding: s.lg, borderRadius: setRadius.inner, backgroundColor: c.background }}>
        <Hint>
          Definitions are shown one sense at a time on learning screens and in full in the
          dictionary. The source data is never edited.
        </Hint>
      </View>
    </DetailShell>
  )
}
