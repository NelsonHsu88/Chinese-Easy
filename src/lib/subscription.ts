import { Platform } from 'react-native'
import { Linking } from 'react-native'

/*
 * The ad-free subscription: products, purchase, restore, and where "manage"
 * goes.
 *
 * This is the seam between the screen and a store, and it is deliberately a
 * seam rather than an SDK call: **no in-app-purchase package is installed in
 * this project**. There is no `react-native-iap`, no `expo-in-app-purchases`,
 * no RevenueCat, and none of them can be added while the app is being run
 * through Expo Go, which ships only the modules in the Expo SDK — a native
 * purchase module would throw at import and take the whole app down on launch,
 * exactly as `expo-speech-recognition` used to.
 *
 * So the store is *registered* rather than imported. `registerStore()` takes an
 * implementation of `NativeStore`, and wiring a real one later is: install the
 * package, write the adapter, call `registerStore(adapter)` once at startup.
 * Nothing else on this screen changes. The alternative — a `require()` of a
 * package that isn't there — is not merely unused code, it fails the Metro
 * build, because Metro resolves a literal require at bundle time whether or not
 * it ever runs.
 *
 * Until then the app is in one of two honest states, and never a third,
 * flattering one:
 *
 * - **Development** (`__DEV__`): purchases resolve through `simulatedStore`
 *   below, and every surface that shows the result says so. The screen prints
 *   "Simulated purchase — no store is connected to this build" in place of the
 *   renewal terms, so the subscribed state can be built, reviewed and tested
 *   without anyone being able to mistake it for a real entitlement.
 * - **Production with no store registered**: purchase and restore fail with
 *   `unavailable`, and the screen says so calmly. It does not grant anything.
 *
 * Restore never invents an entitlement in either state: with no store there is
 * nothing to restore, so it honestly reports finding nothing.
 */

export type PlanId = 'monthly' | 'yearly'

export interface SubscriptionProduct {
  id: PlanId
  /** The store's own product identifier, once there is a store. */
  productId: string
  title: string
  /** Localised, store-formatted price. Falls back to the reference pricing. */
  price: string
  /** "month" / "year", already localised for the "/ month" line. */
  unit: string
  /** Only the yearly plan carries one. Computed by the store where possible. */
  savings?: string
  /** A product the store could not offer is shown, disabled, rather than hidden. */
  available: boolean
}

export interface Entitlement {
  plan: PlanId
  /** ISO date the subscription next renews, when the store reports one. */
  renewsAt: string | null
  /** `store` is a real purchase; `simulated` is a development build. */
  source: 'store' | 'simulated'
  productId?: string
}

export type PurchaseOutcome =
  | { ok: true; entitlement: Entitlement }
  /** The learner backed out. Not an error, and must not be reported as one. */
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'unavailable' }
  | { ok: false; reason: 'failed' }

export type RestoreOutcome =
  | { ok: true; entitlement: Entitlement | null }
  | { ok: false; reason: 'unavailable' | 'failed' }

/** What a real store adapter has to provide. See `registerStore`. */
export interface NativeStore {
  /**
   * Tells the store which Chinese Easy account is signed in.
   *
   * For RevenueCat this is `Purchases.logIn(userId)` with the **Supabase
   * `auth.users.id` UUID, verbatim** — not a device id, not an email (they
   * change), not a hash of either. That id is already stable, unique and
   * non-guessable, and using it directly is what makes an entitlement bought on
   * one phone appear on the next one the moment the same account signs in.
   *
   * `null` means signed out, and should return the store to its own anonymous
   * identity rather than clearing anything: a purchase made while signed out is
   * still a purchase, and `logIn` later attaches it to the account.
   */
  identify?(userId: string | null): Promise<void>
  loadProducts(): Promise<SubscriptionProduct[]>
  purchase(plan: PlanId): Promise<PurchaseOutcome>
  restore(): Promise<RestoreOutcome>
  /** Current entitlement per the store, checked on launch. */
  current(): Promise<Entitlement | null>
  /** Where the platform wants subscriptions managed. */
  manageUrl?(): string
}

let store: NativeStore | null = null

/**
 * Connects a real store implementation.
 *
 * Call once, early (the root layout is the right place). Everything below
 * prefers the registered store and falls back to the states described at the
 * top of this file.
 */
export function registerStore(implementation: NativeStore): void {
  store = implementation
}

export function hasStore(): boolean {
  return store !== null
}

/**
 * Points the store at the signed-in account, or back at anonymous.
 *
 * Called on every change of storage scope, which is the same moment the rest of
 * the app switches accounts — so the entitlement and the deck can never end up
 * describing two different people.
 *
 * A no-op today: no store is registered, so there is nothing to identify to.
 * That is the honest state and not a stub — see the note at the top of this
 * file. Wiring RevenueCat is writing `identify` in the adapter; nothing here or
 * in `AppContext` changes.
 */
export async function identifyUser(userId: string | null): Promise<void> {
  if (!store?.identify) return
  try {
    await store.identify(userId)
  } catch {
    /* Identity is re-asserted on the next scope change and on every launch, so
       a transient failure here must not take the app down. */
  }
}

/**
 * Whether a *cached* entitlement may be honoured before the store has answered.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * A persisted entitlement is a convenience, not proof of payment. It is here so
 * a real subscriber opening the app on a plane is not shown a paywall for the
 * two seconds before the store replies — and for nothing else.
 *
 * It used to be more than that, and that was a security hole: the stored value
 * was trusted indefinitely, so anything that could write
 * `chinese-easy:subscription` had premium for good. The two rules below are
 * what stop it being a grant in its own right:
 *
 *  - **A simulated entitlement is development state.** `purchasePlan` only ever
 *    mints one under `__DEV__`, so a production build finding one in storage is
 *    looking at a value that could not have been created legitimately.
 *  - **With no store registered there is nothing that can ever validate it.**
 *    In production that means it can never be confirmed or revoked, so it is
 *    not honoured at all. In development it is, because the simulated purchase
 *    path is the only way to exercise the subscribed UI.
 *
 * Honouring a cached value is still only ever *provisional*: the caller must
 * ask the store and take its answer, including a `null` one. See
 * `applyStoreVerdict`.
 */
export function cachedEntitlementIsUsable(cached: Entitlement | null): boolean {
  if (!cached) return false
  if (cached.source === 'simulated') return __DEV__
  return hasStore() || __DEV__
}

/**
 * The platform's store, by name, for the sentence a learner reads before they
 * pay. Never hardcode "the App Store" — on Android it is simply untrue, and it
 * is the one line on the screen that tells them how to get out of this.
 */
export function storeName(): string {
  return Platform.OS === 'android' ? 'Google Play' : 'the App Store'
}

/**
 * Fallback pricing, used for display when no store can be asked.
 *
 * These are the reference's numbers. A registered store's own localised prices
 * always win — a learner in Tokyo must not be shown dollars.
 */
const FALLBACK_PRODUCTS: SubscriptionProduct[] = [
  {
    id: 'monthly',
    productId: 'com.chineseeasy.app.adfree.monthly',
    title: 'Monthly',
    price: '$4',
    unit: 'month',
    available: true,
  },
  {
    id: 'yearly',
    productId: 'com.chineseeasy.app.adfree.yearly',
    title: 'Yearly',
    price: '$36',
    unit: 'year',
    savings: 'Save 25%',
    available: true,
  },
]

/**
 * A simulated purchase, for development builds only.
 *
 * It grants the same shape of entitlement a store would, so the subscribed
 * state exercises the real code path rather than a mock of it — and it stamps
 * `source: 'simulated'`, which is what every surface keys off to say out loud
 * that this is not a real subscription.
 */
const simulatedStore = {
  purchase(plan: PlanId): Entitlement {
    const renews = new Date()
    if (plan === 'yearly') renews.setFullYear(renews.getFullYear() + 1)
    else renews.setMonth(renews.getMonth() + 1)
    return {
      plan,
      renewsAt: renews.toISOString(),
      source: 'simulated',
      productId: FALLBACK_PRODUCTS.find((p) => p.id === plan)?.productId,
    }
  },
}

export async function loadProducts(): Promise<SubscriptionProduct[]> {
  if (!store) return FALLBACK_PRODUCTS
  try {
    const products = await store.loadProducts()
    /* A store that answers with nothing is a store that is not ready — showing
       an empty plan row would be worse than showing the fallback prices. */
    return products.length > 0 ? products : FALLBACK_PRODUCTS
  } catch {
    return FALLBACK_PRODUCTS
  }
}

/** The entitlement the store currently reports, checked at launch. */
export async function currentEntitlement(): Promise<Entitlement | null> {
  if (!store) return null
  try {
    return await store.current()
  } catch {
    return null
  }
}

export async function purchasePlan(plan: PlanId): Promise<PurchaseOutcome> {
  if (store) {
    try {
      return await store.purchase(plan)
    } catch {
      return { ok: false, reason: 'failed' }
    }
  }
  if (__DEV__) return { ok: true, entitlement: simulatedStore.purchase(plan) }
  return { ok: false, reason: 'unavailable' }
}

export async function restorePurchases(): Promise<RestoreOutcome> {
  if (!store) {
    /* Nothing was ever bought through a store, so nothing is found. This is a
       real answer, not a stub: inventing an entitlement here is precisely the
       lie this module exists to avoid. */
    return { ok: true, entitlement: null }
  }
  try {
    return await store.restore()
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

/**
 * Opens the platform's subscription management screen.
 *
 * Both platforms require a subscription to be cancelled in the store rather
 * than in the app, so this hands over rather than pretending to offer an
 * in-app cancellation the app cannot honour.
 */
export async function openSubscriptionManagement(): Promise<boolean> {
  const url =
    store?.manageUrl?.() ??
    (Platform.OS === 'android'
      ? 'https://play.google.com/store/account/subscriptions'
      : 'https://apps.apple.com/account/subscriptions')
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

/** "Monthly plan active" / "Annual plan active", from the entitlement itself. */
export function planLabel(entitlement: Entitlement): string {
  return entitlement.plan === 'yearly' ? 'Annual plan active' : 'Monthly plan active'
}

/**
 * "Renews Mar 12, 2027", or an honest absence.
 *
 * A store that reports no renewal date gets no invented one — the card simply
 * shows the plan and the cancellation note instead.
 */
export function renewalLine(entitlement: Entitlement): string | null {
  if (!entitlement.renewsAt) return null
  const date = new Date(entitlement.renewsAt)
  if (Number.isNaN(date.getTime())) return null
  return `Renews ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}
