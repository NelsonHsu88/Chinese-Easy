import { useEffect, useRef } from 'react'
import { View, Text, Pressable, Image, Animated, Easing } from 'react-native'
import { ChevronRight, Check, Star } from 'lucide-react-native'
import { ProgressBar, USE_NATIVE_DRIVER } from './ChallengeParts'
import { CARD, CHAL } from './tokens'
import { CHALLENGE_TONES, type ChallengeDef } from '../../lib/challenges'

/*
 * One challenge row.
 *
 * Four states out of one component, rather than three cards that drifted apart:
 *
 *   notStarted  nothing done yet — grey track, the reward shown as a gold chip
 *   inProgress  tone-coloured fill, chevron through to where the work happens
 *   claimable   pale mint card, green rule and tick, gold Claim button
 *   claimed     the same mint card, dimmed, with "Claimed" where the button was
 *
 * The reference mockup calls the third card "locked", but nothing on this screen
 * ever is: a challenge with no progress is simply one you haven't started, and
 * a padlock would be telling the learner something untrue. It reads as
 * `notStarted` here and shows what it's worth instead.
 */

export type CardState = 'notStarted' | 'inProgress' | 'claimable' | 'claimed'

interface Palette {
  surface: string
  border: string
  fill: string
  track: string
  value: string
}

function paletteFor(def: ChallengeDef, state: CardState): Palette {
  if (state === 'claimable' || state === 'claimed') {
    return { surface: CHAL.mintPale, border: CHAL.mintBorder, fill: CHAL.green, track: CHAL.mintTrack, value: CHAL.greenDeep }
  }
  if (state === 'notStarted') {
    return { surface: CHAL.card, border: CHAL.line, fill: 'transparent', track: CHAL.track, value: CHAL.muted }
  }
  const tone = CHALLENGE_TONES[def.tone]
  return { surface: CHAL.card, border: CHAL.line, fill: tone.strong, track: tone.track, value: tone.strong }
}

/**
 * The illustrated tile.
 *
 * Artwork where a piece exists, otherwise the challenge's character on a wash in
 * its own tone. The spec asks for these characters to be supplied as artwork
 * rather than typeset, and it's right — but there are no such assets in this
 * project yet, so the serif face on a tinted tile stands in. Swapping in real
 * 學/練 illustrations later is a change to `art` on the definition and nothing
 * else.
 */
function ChallengeTile({ def, state }: { def: ChallengeDef; state: CardState }) {
  const tone = CHALLENGE_TONES[def.tone]
  const done = state === 'claimable' || state === 'claimed'
  const background = done ? CHAL.mint : tone.soft
  const ink = done ? CHAL.greenTile : tone.strong

  return (
    <View
      style={{
        width: CARD.tile,
        height: CARD.tile,
        borderRadius: CARD.tileRadius,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {def.art ? (
        <Image
          source={def.art}
          style={{ width: CARD.tile * 0.82, height: CARD.tile * 0.82 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className="font-hanzi-tc-semibold" style={{ fontSize: 36, lineHeight: 46, color: ink }}>
          {def.glyph ?? def.title.slice(0, 1)}
        </Text>
      )}
    </View>
  )
}

/** The green tick, popped in rather than cut in, so completion registers. */
function CompleteTick({ trigger }: { trigger: boolean }) {
  const scale = useRef(new Animated.Value(trigger ? 1 : 0)).current

  useEffect(() => {
    if (!trigger) return
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 240, mass: 0.7, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start()
  }, [trigger, scale])

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={{
          height: 42,
          width: 42,
          borderRadius: 21,
          backgroundColor: CHAL.green,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={24} color={CHAL.onGreen} strokeWidth={3} />
      </View>
    </Animated.View>
  )
}

export function ChallengeCard({
  def,
  current,
  state,
  onOpen,
  onClaim,
}: {
  def: ChallengeDef
  current: number
  state: CardState
  onOpen: () => void
  onClaim: () => void
}) {
  const palette = paletteFor(def, state)
  const ratio = def.target === 0 ? 0 : Math.min(1, current / def.target)
  const finished = state === 'claimable' || state === 'claimed'

  const press = useRef(new Animated.Value(1)).current
  const animatePress = (to: number) =>
    Animated.timing(press, { toValue: to, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }).start()

  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        onPressIn={() => !finished && animatePress(0.985)}
        onPressOut={() => animatePress(1)}
        onPress={finished ? undefined : onOpen}
        /*
         * Deliberately not `disabled`. react-native-web turns a disabled
         * Pressable into `pointer-events: none`, which swallows every click
         * inside it — including the Claim button this card exists to offer.
         * Dropping `onPress` is what actually makes the card inert, and it
         * leaves its children pressable.
         */
        accessibilityRole={finished ? undefined : 'button'}
        accessibilityLabel={finished ? undefined : def.title}
        accessibilityHint={finished ? undefined : def.description}
        className="shadow-chal"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: CARD.tileGap,
          borderRadius: CARD.radius,
          padding: CARD.padding,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        <ChallengeTile def={def} state={state} />

        {/*
          Title, description, bar and count all start at this one left edge —
          the alignment that holds the whole list together. Nothing here is
          allowed to begin under the tile.
        */}
        <View style={{ flex: 1 }}>
          <Text className="font-nunito-extrabold" style={{ fontSize: 19, lineHeight: 25, color: CHAL.navy }} numberOfLines={1}>
            {def.title}
          </Text>

          {/* Stale instructions next to a finished bar read as an unmet demand. */}
          {!finished && (
            <Text className="mt-0.5 font-nunito-semibold" style={{ fontSize: 14, lineHeight: 19, color: CHAL.body }} numberOfLines={1}>
              {def.description}
            </Text>
          )}

          <View style={{ marginTop: 10 }}>
            <ProgressBar ratio={ratio} fill={palette.fill} track={palette.track} />
          </View>

          <View style={{ marginTop: 7, flexDirection: 'row', alignItems: 'center', minHeight: 34 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline' }}>
              <Text className="font-nunito-bold" style={{ fontSize: 17, color: palette.value }}>
                {current}
              </Text>
              <Text className="font-nunito-semibold" style={{ fontSize: 15, color: CHAL.muted }}>
                {' / '}
                {def.target}
              </Text>
            </View>

            {state === 'claimable' && (
              <Pressable
                onPress={onClaim}
                accessibilityRole="button"
                accessibilityLabel={`Claim ${def.xpReward} XP for ${def.title}`}
                className="shadow-chal-claim active:opacity-85"
                style={{
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: CHAL.gold,
                  borderWidth: 1,
                  borderColor: CHAL.goldEdge,
                }}
              >
                <Text className="font-nunito-bold" style={{ fontSize: 15, color: CHAL.goldDeep }}>
                  Claim +{def.xpReward} XP
                </Text>
              </Pressable>
            )}

            {state === 'claimed' && (
              <Text className="font-nunito-bold" style={{ fontSize: 14, color: CHAL.greenDeep }}>
                Claimed
              </Text>
            )}

            {state === 'notStarted' && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  borderRadius: 17,
                  paddingHorizontal: 12,
                  backgroundColor: CHAL.goldWash,
                  borderWidth: 1,
                  borderColor: CHAL.goldWashLine,
                }}
              >
                <Star size={15} color={CHAL.gold} fill={CHAL.gold} strokeWidth={2} />
                <Text className="font-nunito-bold" style={{ fontSize: 14, color: CHAL.goldInk }}>
                  +{def.xpReward} XP
                </Text>
              </View>
            )}
          </View>
        </View>

        {/*
          The right rail: one status mark, vertically centred, in a fixed width
          so every card's content column ends on the same axis. The reward — a
          Claim button or an XP chip — is not here but down on the count row, as
          in the reference; stacking it under the mark squeezed the title into
          two lines on every card.
        */}
        <View
          style={{
            width: 30,
            alignSelf: 'stretch',
            alignItems: 'flex-end',
            // The tick sits level with the title, the chevron in the middle of
            // the card — both as in the reference, and both readable as what
            // they are: a verdict on the row, and a way into it.
            justifyContent: finished ? 'flex-start' : 'center',
          }}
        >
          {(state === 'claimable' || state === 'claimed') && <CompleteTick trigger={state === 'claimable'} />}
          {state === 'inProgress' && <ChevronRight size={22} color={CHAL.muted} strokeWidth={2.25} />}
        </View>
      </Pressable>
    </Animated.View>
  )
}
