import { View, Text } from 'react-native'
import { ArrowRight } from 'lucide-react-native'
import { DashboardCard, CardArt, CardTag, CardTitle, CardBody, LiftedFace } from './parts'
import { dashArt } from './art'
import { dashColors as c, dashSurfaces, dashShoulders, dashType as t, dashHeights } from './tokens'

/*
 * The strongest action on the screen, and the only card whose fill is a colour
 * rather than a near-white.
 *
 * **The whole card is the button.** The coral pill inside it is a plain View,
 * not a Pressable — nesting one pressable inside another double-fires on the
 * web target, where the synthetic event bubbles from the inner handler to the
 * outer one and pushes the route twice. One target also means the learner can
 * hit anywhere on a 158pt card instead of aiming at a 48pt pill.
 *
 * The pill still *behaves* like a button, though: it follows the card's press
 * through `usePressProgress` and sinks onto its own shoulder wherever the finger
 * lands. See `StartReviewButton` below.
 */
export function ReviewCard({ dueCount, onPress }: { dueCount: number; onPress: () => void }) {
  return (
    <DashboardCard
      fill={dashSurfaces.review.fill}
      border={dashSurfaces.review.border}
      minHeight={dashHeights.review}
      onPress={onPress}
      accessibilityLabel={
        dueCount > 0 ? `Start review, ${dueCount} words due` : 'Start review, you are all caught up'
      }
    >
      {/*
        The campfire sits low and right and is allowed past both edges, so it
        reads as painted onto the card rather than placed on it. It is behind
        the content and cannot take a touch.
      */}
      <CardArt
        source={dashArt.fire.source}
        ratio={dashArt.fire.ratio}
        width={143}
        style={{ right: -8, bottom: -12 }}
      />

      <View style={{ padding: 16 }}>
        <CardTag label="Review" fill="#F9D5CD" color={c.coralDark} />

        <View style={{ marginTop: 7 }}>
          <CardTitle>Start Review</CardTitle>
        </View>
        <CardBody style={{ marginTop: 1 }}>
          {dueCount > 0 ? 'Keep your streak alive!' : 'You’re all caught up'}
        </CardBody>

        <View style={{ marginTop: 11 }}>
          <StartReviewButton />
        </View>
      </View>
    </DashboardCard>
  )
}

/** Face size. `LiftedFace` adds its own shoulder below this. */
const FACE_HEIGHT = 48
const FACE_WIDTH = 162

/**
 * "Start Review", drawn as a physical button.
 *
 * The two-part construction lives in `LiftedFace`, which the word card's pair
 * uses too — the same object at three sizes rather than three drawings of one.
 *
 * What is particular to this one is that it is not its own Pressable. It follows
 * the *card's* press through `usePressProgress`, so it depresses wherever on the
 * card the finger lands, which is right: the whole card is this button.
 */
function StartReviewButton() {
  return (
    <LiftedFace
      height={FACE_HEIGHT}
      fill={c.coral}
      shoulder={dashShoulders.coral}
      style={{ width: FACE_WIDTH }}
    >
      <Text className="font-nunito-extrabold text-white" style={{ fontSize: t.button.fontSize }}>
        Start Review
      </Text>
      <ArrowRight size={18} color="#ffffff" strokeWidth={2.6} />
    </LiftedFace>
  )
}
