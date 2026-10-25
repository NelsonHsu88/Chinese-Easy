import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform } from 'react-native'
import { Check } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { displayWord, hanziFont } from '../../lib/hanzi'
import { shortGloss } from '../../lib/definitions'
import { shuffle } from '../../lib/mixedDrills'
import { playCorrectSound } from '../../lib/sound'
import { correctHaptic, tapHaptic, tickHaptic } from '../../lib/haptics'
import { PressableScale, LiftedFace, usePressProgress, DASH_LIFT } from '../dashboard/parts'
import { onbVerdict } from '../onboarding/tokens'
import { DrillShell, VerdictCard, DRILL_PAD } from './parts'
import { useAnswerReaction } from '../motion/questionMotion'
import { AnswerShimmer } from '../motion/answerFeedback'
import { drillColors as c, drillShoulders, drillType as t, drillSize, drillShadow } from './tokens'
import type { VocabWord } from '../../types'

type Side = 'hanzi' | 'gloss'

/** The finished board's chime, slightly quieter than the other drills' "correct". */
const MATCH_DONE_VOLUME = 0.75

/**
 * Match the Pairs, built to the Beta 2.1 reference (`SS 102 Match the
 * Pairs.png`): five words from My Words down the left, their meanings shuffled
 * down the right.
 *
 * Every tile is a raised button, like the rest of the app's: tap one and it
 * turns pale blue and stays up, picked. Tap one of each, in either order. A
 * right pair turns jade, springs, a highlight crosses it, then it presses down
 * into place, ticks, and recedes to half strength so what is left to do stands
 * out. Finishing every pair raises the answer sheet. A wrong pair washes coral,
 * both tiles shake together, and it **fades back** — the inputs are held for
 * exactly as long as the fade, then the learner chooses again. There's no Check: a
 * match is judged the moment it's made, which is the whole feel of the game.
 *
 * "I don't know" lines the meanings up against their words, in gold, so a word
 * the learner couldn't place is still shown with its pair before moving on.
 *
 * Practice rather than review — nothing here grades a card. `onComplete`
 * reports how many pairs were matched without a wrong try, for the session's
 * accuracy.
 */
export function ReviewMatchPairs({
  words,
  onComplete,
  onClose,
  step,
  total,
  secondsLeft,
}: {
  words: VocabWord[]
  onComplete: (firstTry: number, pairs: number) => void
  onClose: () => void
  step: number
  total: number
  secondsLeft?: number | null
}) {
  const { settings } = useApp()
  /* Each column shuffled once, at mount, independently of the other. */
  const [hanziOrder] = useState(() => shuffle(words))
  const [glossOrder, setGlossOrder] = useState(() => shuffle(words))

  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null)
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [revealed, setRevealed] = useState(false)
  /** Words in a wrong attempt at least once — they don't count as right first time. */
  const missed = useRef(new Set<string>())

  /* The wrong pair currently washing red, and the fade carrying it out. */
  const [wrong, setWrong] = useState<{ hanzi: string; gloss: string } | null>(null)
  const flash = useRef(new Animated.Value(0)).current
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
  }, [])

  const allMatched = matched.size === words.length
  const done = revealed || allMatched

  const attempt = (hanziId: string, glossId: string) => {
    setSelected(null)
    if (hanziId === glossId) {
      const next = new Set(matched).add(hanziId)
      setMatched(next)
      /* Each pair is a light buzz in the hand; only the finished board rings,
         a little under full volume, with the fuller two-strike haptic. */
      if (next.size === words.length) {
        playCorrectSound({ volume: MATCH_DONE_VOLUME })
        correctHaptic()
      } else tapHaptic()
      return
    }

    missed.current.add(hanziId)
    missed.current.add(glossId)
    tapHaptic()
    setWrong({ hanzi: hanziId, gloss: glossId })
    flash.setValue(1)
    Animated.timing(flash, {
      toValue: 0,
      duration: drillSize.wrongFadeMs,
      easing: Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start()
    /* The state change rides a timer rather than the animation's callback, so
       a stalled browser tab can't leave the board locked (CLAUDE.md, Animation). */
    fadeTimer.current = setTimeout(() => setWrong(null), drillSize.wrongFadeMs)
  }

  const press = (side: Side, id: string) => {
    if (done || wrong || matched.has(id)) return
    if (!selected || selected.side === side) {
      // Same side: pick it, move the pick, or put it down again.
      tickHaptic()
      setSelected(selected?.side === side && selected.id === id ? null : { side, id })
      return
    }
    if (side === 'hanzi') attempt(id, selected.id)
    else attempt(selected.id, id)
  }

  const giveUp = () => {
    if (done) return
    tickHaptic()
    setSelected(null)
    setRevealed(true)
    // Line every meaning up against its own word, so each row reads as a pair.
    setGlossOrder(hanziOrder)
  }

  const firstTry = words.filter((w) => matched.has(w.id) && !missed.current.has(w.id)).length

  const tileState = (side: Side, id: string): TileState => {
    if (matched.has(id)) return 'matched'
    if (revealed) return 'revealed'
    if (wrong && wrong[side] === id) return 'wrong'
    if (selected?.side === side && selected.id === id) return 'selected'
    return 'idle'
  }

  return (
    <DrillShell
      title="Match the Pairs"
      step={step}
      total={total}
      secondsLeft={secondsLeft}
      onClose={onClose}
      sakuraCorner
      /* A solved board gets the answer sheet. A revealed one doesn't: the pairs
         are lined up to be studied, and the sheet would cover the lower rows. */
      answer={
        allMatched && !revealed
          ? {
              kind: 'correct',
              onContinue: () => onComplete(firstTry, words.length),
              detail: (
                <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, color: c.slate }}>
                  {firstTry === words.length ? 'Every pair first try' : `${firstTry} of ${words.length} first try`}
                </Text>
              ),
            }
          : null
      }
      buttons={
        <View style={{ flex: 1, alignItems: 'center', gap: 12 }}>
          {allMatched && !revealed ? (
            /* The board's verdict takes the "I don't know" slot, which has nothing left to offer. */
            <View style={{ alignSelf: 'stretch' }}>
              <VerdictCard kind="correct" label={firstTry === words.length ? 'All correct!' : 'All matched!'}>
                <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, color: c.slate }}>
                  {firstTry === words.length ? 'Every pair first try' : `${firstTry} of ${words.length} first try`}
                </Text>
              </VerdictCard>
            </View>
          ) : (
            /* Held in place once used, so the button doesn't jump. */
            <Pressable
              onPress={giveUp}
              disabled={done}
              accessibilityRole="button"
              accessibilityLabel="I don't know — show the pairs"
              hitSlop={10}
              style={{ opacity: done ? 0 : 1 }}
            >
              <Text
                style={{
                  fontFamily: 'NunitoSemiBold',
                  fontSize: 16,
                  color: c.slate,
                  textDecorationLine: 'underline',
                  textDecorationColor: c.outline,
                }}
              >
                I don’t know
              </Text>
            </Pressable>
          )}
          <PressableScale
            onPress={() => done && onComplete(firstTry, words.length)}
            scaleTo={1}
            haptic={false}
            wrapperStyle={{ alignSelf: 'stretch' }}
            accessibilityLabel={done ? 'Continue' : 'Continue — match every pair first'}
          >
            <LiftedFace
              height={drillSize.button}
              fill={done ? c.green : c.disabled}
              shoulder={done ? drillShoulders.primary : c.disabledShoulder}
              shadow={done}
            >
              <Text style={{ fontFamily: 'NunitoBold', ...t.button, color: '#FFFFFF' }}>Continue</Text>
            </LiftedFace>
          </PressableScale>
        </View>
      }
    >
      <View
        style={{
          flexGrow: 1,
          marginHorizontal: DRILL_PAD,
          marginTop: 26,
          paddingHorizontal: 16,
          paddingVertical: 18,
          gap: 12,
          /* Rows grow to their cap; anything a tall phone has beyond that is
             shared above and below rather than left as a band at the foot. */
          justifyContent: 'center',
          borderRadius: drillSize.radius.card,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.card,
          ...drillShadow,
        }}
      >
        {hanziOrder.map((left, row) => {
          const right = glossOrder[row]
          return (
            <View key={row} style={{ flexDirection: 'row', gap: 12, flexGrow: 1, maxHeight: drillSize.tileMax }}>
              <Tile state={tileState('hanzi', left.id)} flash={flash} onPress={() => press('hanzi', left.id)} label={displayWord(left, settings.script)}>
                {(ink) => (
                  <Text className={hanziFont(settings.script, 'semibold')} numberOfLines={1} style={{ ...t.matchHanzi, color: ink }}>
                    {displayWord(left, settings.script)}
                  </Text>
                )}
              </Tile>
              <Tile state={tileState('gloss', right.id)} flash={flash} onPress={() => press('gloss', right.id)} label={shortGloss(right)}>
                {(ink) => (
                  <Text numberOfLines={2} style={{ fontFamily: 'NunitoSemiBold', ...t.matchGloss, color: ink, textAlign: 'center' }}>
                    {shortGloss(right)}
                  </Text>
                )}
              </Tile>
            </View>
          )
        })}
      </View>
    </DrillShell>
  )
}

type TileState = 'idle' | 'selected' | 'matched' | 'wrong' | 'revealed'

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/**
 * One tile, built as the app's raised button: a face standing `DASH_LIFT` above
 * a darker shoulder, sinking onto it while pressed (`PressableScale` drives the
 * press through `usePressProgress`, exactly as it does for `LiftedFace`).
 * `LiftedFace` itself takes a fixed height and these tiles flex, so the same
 * two layers are drawn here against the tile's own bounds.
 *
 * - **idle** — white face, warm-grey shoulder, raised.
 * - **selected** — the face turns pale blue and stays raised: picked up, waiting for its pair.
 * - **matched** — pressed down into place, pale green with a tick and one
 *   highlight sweep, then fades to
 *   `matchedOpacity` so the tiles still in play are the ones that stand out.
 * - **wrong** — a coral wash over the tile that fades out (its own layer, so the
 *   fade can run on the native driver while the tile underneath is unchanged).
 * - **revealed** — "I don't know": pressed down in gold.
 *
 * Matched and revealed tiles take no press at all — `PressableScale` without an
 * `onPress` renders a plain view, so a finished tile doesn't sink under a tap.
 */
function Tile({
  state,
  flash,
  onPress,
  label,
  children,
}: {
  state: TileState
  flash: Animated.Value
  onPress: () => void
  label: string
  /** Given the ink colour for the tile's state. */
  children: (ink: string) => ReactNode
}) {
  const finished = state === 'matched' || state === 'revealed'

  /* Matched tiles recede: hold full strength a beat so the green registers, then fade. */
  const fade = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (state !== 'matched') return
    const anim = Animated.timing(fade, {
      toValue: drillSize.matchedOpacity,
      duration: drillSize.matchedFadeMs,
      delay: drillSize.matchedFadeDelayMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    anim.start()
    // Backstop: rAF stalls in a hidden browser tab (see CLAUDE.md, Animation).
    const backstop = setTimeout(
      () => fade.setValue(drillSize.matchedOpacity),
      drillSize.matchedFadeDelayMs + drillSize.matchedFadeMs + 150,
    )
    return () => {
      anim.stop()
      clearTimeout(backstop)
    }
  }, [state, fade])

  /* A match settles with a small spring; a wrong pair gives a short shake under its coral wash. */
  const reaction = useAnswerReaction(state === 'matched' ? 'pop' : state === 'wrong' ? 'shake' : null)

  return (
    <Animated.View
      style={{ flex: 1, opacity: fade, transform: reaction.transform }}
      /* Android fades each layer separately, which would show the shoulder through the face. */
      needsOffscreenAlphaCompositing={state === 'matched'}
      accessibilityState={{ selected: state === 'selected', disabled: finished }}
    >
      <PressableScale
        onPress={finished ? undefined : onPress}
        scaleTo={1}
        haptic={false}
        wrapperStyle={{ flex: 1 }}
        style={{ flex: 1 }}
        accessibilityLabel={label}
      >
        <TileFace state={state} flash={flash}>
          {children}
        </TileFace>
      </PressableScale>
    </Animated.View>
  )
}

function TileFace({
  state,
  flash,
  children,
}: {
  state: TileState
  flash: Animated.Value
  children: (ink: string) => ReactNode
}) {
  /* Outside a live press (finished tiles) there is no progress to follow; this stands in. */
  const resting = useRef(new Animated.Value(0)).current
  const press = usePressProgress() ?? resting

  const sunk = state === 'matched' || state === 'revealed'
  const sink = sunk ? DASH_LIFT : press.interpolate({ inputRange: [0, 1], outputRange: [0, DASH_LIFT] })

  const face =
    state === 'selected' ? c.pickedFace : state === 'matched' ? c.matched : state === 'revealed' ? onbVerdict.unsure.fill : c.tileFace
  const border =
    state === 'selected' ? c.pickedBorder : state === 'matched' ? c.matchedBorder : state === 'revealed' ? onbVerdict.unsure.border : c.border
  const shoulder =
    state === 'selected'
      ? c.pickedShoulder
      : state === 'matched'
        ? c.matchedBorder
        : state === 'revealed'
          ? c.revealedShoulder
          : c.tileShoulder
  const ink = c.ink

  return (
    <View style={{ flex: 1, minHeight: drillSize.tileMin + DASH_LIFT }}>
      <View
        style={{
          position: 'absolute',
          top: DASH_LIFT,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: drillSize.radius.tile,
          backgroundColor: shoulder,
          ...(sunk ? null : drillShadow),
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: DASH_LIFT,
          borderRadius: drillSize.radius.tile,
          borderWidth: state === 'selected' ? 1.75 : 1,
          borderColor: border,
          backgroundColor: face,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: state === 'matched' ? 30 : 10,
          /* Android paints by elevation before tree order — without matching the
             shoulder's, the shoulder is drawn over the face (see LiftedFace). */
          ...(!sunk && Platform.OS === 'android' ? { elevation: drillShadow.elevation } : null),
          transform: [{ translateY: sink }],
        }}
      >
        <AnswerShimmer play={state === 'matched'} radius={drillSize.radius.tile} />
        {children(ink)}
        {state === 'matched' && (
          <View
            style={{
              position: 'absolute',
              right: 10,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: c.greenDark,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={14} color="#FFFFFF" strokeWidth={3.2} />
          </View>
        )}
        {state === 'wrong' && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              borderRadius: drillSize.radius.tile,
              borderWidth: 2,
              borderColor: c.wrongBorder,
              backgroundColor: c.wrong,
              opacity: flash,
            }}
          />
        )}
      </Animated.View>
    </View>
  )
}
