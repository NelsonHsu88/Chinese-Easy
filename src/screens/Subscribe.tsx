import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { BookOpen, Headphones, Sprout } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { BrushHighlight } from '../components/BrushHighlight'
import { FlexGap } from '../components/FlexGap'
import {
  BenefitRow,
  CheckBenefit,
  Notice,
  OutlineButton,
  PlanCard,
  PrimaryCta,
  QuietLink,
  StatusCard,
  SubscriptionHero,
  TopBar,
} from '../components/subscription/parts'
import { subArt } from '../components/subscription/art'
import {
  subColors as c,
  subSpacing as s,
  subType as t,
  subHero,
  subMotion,
  SUB_CONTENT_MAX,
} from '../components/subscription/tokens'
import {
  hasStore,
  loadProducts,
  openSubscriptionManagement,
  planLabel,
  purchasePlan,
  renewalLine,
  restorePurchases,
  storeName,
  type Entitlement,
  type PlanId,
  type SubscriptionProduct,
} from '../lib/subscription'
import { successHaptic, tapHaptic, tickHaptic } from '../lib/haptics'

/*
 * The ad-free subscription, in its two states.
 *
 * One screen rather than two routes, because it is one thing: whether the
 * learner is being offered the subscription or thanked for it is a property of
 * their entitlement, not of where they tapped. `isAdFree` from `AppContext` is
 * the only thing that decides, and it is the app's single source of truth —
 * there is deliberately no second `isPremium` flag anywhere.
 *
 * What the screen must never do is grant on a button press. A purchase is only
 * real when the store says it is, so `applyEntitlement` is called from the
 * *outcome* of `purchasePlan`/`restorePurchases` and from nowhere else. See
 * `lib/subscription.ts` for what happens when there is no store connected — in
 * short: in development it simulates and says so on this screen, in production
 * it declines.
 */

/** The three promises, in the order the reference makes them. */
const BENEFITS = [
  { icon: BookOpen, label: 'Ad-free reading and review' },
  { icon: Headphones, label: 'Uninterrupted audiobook narration' },
  { icon: Sprout, label: 'Support continued development' },
] as const

/** And the three the learner already has. */
const ACTIVE_BENEFITS = [
  'Ads removed across the app',
  'Narration plays uninterrupted',
  'Your support helps us keep building',
] as const

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

export function Subscribe() {
  const { isAdFree, subscription, applyEntitlement } = useApp()
  /*
   * `prompt=1` means the app raised this itself rather than the learner asking
   * for it. The only difference it makes is the control in the corner — a close
   * instead of a back arrow — because there is no screen behind an offer nobody
   * asked to see. See `useSubscribePrompt`.
   */
  const { prompt } = useLocalSearchParams<{ prompt?: string }>()
  const unprompted = prompt === '1'

  const { width } = useWindowDimensions()
  const column = Math.min(width, SUB_CONTENT_MAX)

  const close = useCallback(() => {
    /*
     * Never a bare `router.back()`. This screen is reachable by deep link, by a
     * reload of the web build, and — when the app raises it — as the first
     * entry on the stack, and in all three cases there is nothing to pop, so
     * `back()` would silently do nothing and the close button would be a lie.
     */
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }, [])

  return isAdFree && subscription ? (
    <ActiveState
      column={column}
      unprompted={unprompted}
      onClose={close}
      subscription={subscription}
      onRestored={applyEntitlement}
    />
  ) : (
    <PurchaseState
      column={column}
      unprompted={unprompted}
      onClose={close}
      onEntitled={applyEntitlement}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Purchase                                                                    */
/* -------------------------------------------------------------------------- */

function PurchaseState({
  column,
  unprompted,
  onClose,
  onEntitled,
}: {
  column: number
  unprompted: boolean
  onClose: () => void
  onEntitled: (entitlement: Entitlement) => void
}) {
  const [products, setProducts] = useState<SubscriptionProduct[]>([])
  /* Yearly by default: it is the plan that costs the learner least per month,
     and defaulting to the dearer one would be the screen quietly working
     against the person reading it. */
  const [plan, setPlan] = useState<PlanId>('yearly')
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadProducts().then((list) => {
      if (cancelled) return
      setProducts(list)
      /* A plan the store cannot offer must not stay selected, or the button
         under it offers to buy something that isn't for sale. */
      const yearly = list.find((p) => p.id === 'yearly')
      if (yearly && !yearly.available) setPlan('monthly')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const monthly = products.find((p) => p.id === 'monthly')
  const yearly = products.find((p) => p.id === 'yearly')
  const chosen = products.find((p) => p.id === plan)

  const select = (next: PlanId) => {
    if (next === plan) return
    tickHaptic()
    setPlan(next)
    setNotice(null)
  }

  const buy = async () => {
    if (busy || !chosen?.available) return
    tapHaptic()
    setBusy(true)
    setNotice(null)
    const outcome = await purchasePlan(plan)
    setBusy(false)

    if (outcome.ok) {
      /* The state changes because the store confirmed a purchase, never because
         a button was pressed. */
      successHaptic()
      onEntitled(outcome.entitlement)
      return
    }
    /* Backing out is not an error and must not be dressed as one. */
    if (outcome.reason === 'cancelled') return
    setNotice(
      outcome.reason === 'unavailable'
        ? `Subscriptions aren't available on this device yet.`
        : 'Something went wrong. Please try again.',
    )
  }

  const restore = async () => {
    if (restoring) return
    tapHaptic()
    setRestoring(true)
    setNotice(null)
    const outcome = await restorePurchases()
    setRestoring(false)

    if (!outcome.ok) {
      setNotice('We couldn’t reach the store. Please try again.')
      return
    }
    if (outcome.entitlement) {
      successHaptic()
      onEntitled(outcome.entitlement)
      return
    }
    setNotice('No previous subscription found on this account.')
  }

  /*
   * The terms, or the truth about this build.
   *
   * When no store is connected the renewal sentence would be a description of
   * something that is not going to happen, so the screen says what *is*
   * happening instead. A simulated purchase that presented itself as a real one
   * is the single most dishonest thing this screen could do.
   */
  const terms = hasStore()
    ? `Renews automatically. Cancel anytime in ${storeName()}.`
    : __DEV__
      ? 'Simulated purchase — no store is connected to this build.'
      : `Subscriptions aren’t available in this build yet.`

  return (
    <Page
      column={column}
      unprompted={unprompted}
      onClose={onClose}
      pose="thumbsUp"
      says={'Study without\ninterruptions.'}
      headlinePlain="Learn "
      headlineMarked="ad-free"
    >
      <FlexGap min={s.lg} max={30} grow={0.3} />

      <View style={{ gap: 14 }}>
        {BENEFITS.map((benefit) => (
          <BenefitRow key={benefit.label} icon={benefit.icon} label={benefit.label} />
        ))}
      </View>

      <FlexGap min={s.xl} max={46} grow={0.5} />

      <View style={{ flexDirection: 'row', gap: s.planGap }}>
        <PlanCard
          title={monthly?.title ?? 'Monthly'}
          price={monthly?.price ?? '$4'}
          unit={monthly?.unit ?? 'month'}
          selected={plan === 'monthly'}
          disabled={monthly ? !monthly.available : false}
          onSelect={() => select('monthly')}
          accessibilityLabel={`Monthly plan, ${monthly?.price ?? '$4'} per month${plan === 'monthly' ? ', selected' : ''}`}
        />
        <PlanCard
          title={yearly?.title ?? 'Yearly'}
          price={yearly?.price ?? '$36'}
          unit={yearly?.unit ?? 'year'}
          savings={yearly?.savings ?? 'Save 25%'}
          selected={plan === 'yearly'}
          disabled={yearly ? !yearly.available : false}
          onSelect={() => select('yearly')}
          accessibilityLabel={`Yearly plan, ${yearly?.price ?? '$36'} per year, ${yearly?.savings ?? 'Save 25%'}${plan === 'yearly' ? ', selected' : ''}`}
        />
      </View>

      {/*
        Where this screen's spare height collects. Above the button rather than
        below the footer, so the call to action and its terms stay one block at
        the foot of the page instead of drifting up it on a tall phone — and the
        space that opens is whitespace between two groups rather than a bare
        band under the whole interface.
      */}
      <FlexGap min={s.lg} max={64} grow={1.2} />

      {notice ? (
        <View style={{ marginBottom: s.md }}>
          <Notice text={notice} />
        </View>
      ) : null}

      <PrimaryCta
        label="Start subscription"
        busy={busy}
        onPress={buy}
        accessibilityLabel={`Start subscription, ${chosen?.price ?? ''} per ${chosen?.unit ?? ''}`}
      />

      <Text
        className="font-nunito-semibold"
        style={{ ...t.fine, color: c.mutedLight, textAlign: 'center', marginTop: s.lg }}
      >
        {terms}
      </Text>

      <View style={{ alignItems: 'center', marginTop: 2 }}>
        <QuietLink label="Restore purchases" busy={restoring} onPress={restore} />
      </View>
    </Page>
  )
}

/* -------------------------------------------------------------------------- */
/* Active                                                                      */
/* -------------------------------------------------------------------------- */

function ActiveState({
  column,
  unprompted,
  onClose,
  subscription,
  onRestored,
}: {
  column: number
  unprompted: boolean
  onClose: () => void
  subscription: Entitlement
  onRestored: (entitlement: Entitlement) => void
}) {
  const [restoring, setRestoring] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const restore = async () => {
    if (restoring) return
    tapHaptic()
    setRestoring(true)
    setNotice(null)
    const outcome = await restorePurchases()
    setRestoring(false)
    if (outcome.ok && outcome.entitlement) {
      onRestored(outcome.entitlement)
      setNotice('Your subscription is up to date.')
      return
    }
    setNotice(
      outcome.ok
        ? 'No previous subscription found on this account.'
        : 'We couldn’t reach the store. Please try again.',
    )
  }

  const manage = async () => {
    tapHaptic()
    const opened = await openSubscriptionManagement()
    if (!opened) setNotice(`We couldn’t open ${storeName()}.`)
  }

  const renewal = renewalLine(subscription)
  const note =
    subscription.source === 'simulated'
      ? 'Simulated subscription — development build only.'
      : `Cancel anytime in ${storeName()}.`

  return (
    <Page
      column={column}
      unprompted={unprompted}
      onClose={onClose}
      pose="gratitude"
      says={'Thank you for\nsupporting\nChinese Easy.'}
      headlinePlain="You’re "
      headlineMarked="ad-free"
      /*
       * The closing scenery. It belongs to this state alone: the purchase
       * screen ends on a button, which is the thing it wants looked at, while
       * this one has nothing left to ask for and ends on a view.
       */
      footScenery
    >
      <View style={{ marginTop: s.xl }}>
        <StatusCard title={planLabel(subscription)} renewal={renewal} note={note} />
      </View>

      <View style={{ marginTop: s.lg, gap: 13 }}>
        {ACTIVE_BENEFITS.map((label) => (
          <CheckBenefit key={label} label={label} />
        ))}
      </View>

      <FlexGap min={s.xl} max={40} grow={1} />

      {notice ? (
        <View style={{ marginBottom: s.md }}>
          <Notice text={notice} />
        </View>
      ) : null}

      <OutlineButton label="Manage subscription" onPress={manage} />

      <View style={{ alignItems: 'center', marginTop: 2 }}>
        <QuietLink label="Restore purchases" busy={restoring} onPress={restore} />
      </View>
    </Page>
  )
}

/* -------------------------------------------------------------------------- */
/* The page both states are laid out in                                        */
/* -------------------------------------------------------------------------- */

/**
 * Cream page, hero, headline, then whatever the state puts under it.
 *
 * The composition is a flex column: the hero is the only element allowed to
 * change size, so a tall phone spends its extra height on scenery while the
 * type, the cards and the button stay exactly as drawn — and a short one lets
 * the page scroll rather than shrinking the words. That is the whole responsive
 * strategy, and it is why the hero carries `flex: 1` between a floor and a
 * ceiling while everything below it is laid out to its natural height.
 */
function Page({
  column,
  unprompted,
  onClose,
  pose,
  says,
  headlinePlain,
  headlineMarked,
  footScenery = false,
  children,
}: {
  column: number
  unprompted: boolean
  onClose: () => void
  pose: 'thumbsUp' | 'gratitude'
  says: string
  headlinePlain: string
  headlineMarked: string
  footScenery?: boolean
  children: ReactNode
}) {
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  /*
   * The hero gets the room the rest of the page does not need.
   *
   * Everything below it is fixed — the type, the rows, the cards and the button
   * are all drawn at the size they were designed at — so the scene is the one
   * element that changes, and it changes to make the page end exactly at the
   * bottom of the screen. On a tall phone that means more mountain; on a short
   * one the artwork gives up its height first, exactly as the brief asks, and
   * only once it is at its floor does the page scroll.
   *
   * The subtraction is against the *usable* height, insets included: a hero
   * sized off the raw window is a hero that has quietly promised away the notch
   * and the home indicator.
   */
  const available = height - insets.top - insets.bottom
  const heroHeight = Math.max(
    subHero.min,
    Math.min(subHero.max, available - subHero.contentBelow[footScenery ? 'active' : 'purchase']),
  )

  /* The whole page fades in once, on arrival. Purchase → active is the same
     fade, replayed by the state change under it. */
  const enter = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: subMotion.stateChange,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    animation.start()
    const settle = setTimeout(() => enter.setValue(1), subMotion.stateChange + 90)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [enter])

  const sceneryWidth = column * 1.16

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.page }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Plain styles on the animated view, content in a plain View inside it
            — NativeWind drops `className` on an `Animated.View` entirely. */}
        <Animated.View style={{ width: column, flexGrow: 1, opacity: enter }}>
          <View style={{ flexGrow: 1 }}>
            <SubscriptionHero width={column} height={heroHeight} pose={pose} says={says}>
              <TopBar mode={unprompted ? 'close' : 'back'} onPress={onClose} />
            </SubscriptionHero>

            <View style={{ paddingHorizontal: s.screen, flexGrow: 1, paddingBottom: s.md }}>
              {/*
                The headline, with the app's marker stroke under the half of it
                that is the offer. One flourish on the page and no more: a
                second piece of handwriting would turn a calm screen into a
                busy one.
              */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: s.sm }}>
                <Text className="font-nunito-extrabold" style={{ ...t.headline, color: c.ink }}>
                  {headlinePlain}
                </Text>
                {/*
                  The stroke sits under the word, not across it: it starts
                  below the x-height and runs a little past the baseline, which
                  is where a marker actually lands. Bled wider on the right than
                  a rectangle would be, because the swipe overshoots the word.
                */}
                <BrushHighlight color={c.jadeSoft} bleedX={11} bleedTop={21} bleedBottom={-5} fleck={false}>
                  <Text className="font-nunito-extrabold" style={{ ...t.headline, color: c.ink }}>
                    {headlineMarked}
                  </Text>
                </BrushHighlight>
              </View>

              {children}
            </View>
          </View>

          {/*
            Anchored to the foot of the page and behind everything on it. It is
            the slack absorber for this state: on a tall phone the scenery is
            what grows into the space rather than a band of bare cream opening
            up under the last link.
          */}
          {footScenery ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: (column - sceneryWidth) / 2,
                bottom: 0,
                width: sceneryWidth,
                height: sceneryWidth / subArt.panorama.ratio,
                opacity: 0.55,
                zIndex: -1,
              }}
            >
              <Image
                source={subArt.panorama.source}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}
