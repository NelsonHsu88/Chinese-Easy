import { DICT_BG } from './shadows'
import { RaisedButton } from '../dashboard/parts'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { View, Text, Pressable, ScrollView, Modal, useWindowDimensions } from 'react-native'
import type { ScrollViewInstance } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { tabBarHeight } from '../../lib/tabBar'
import { InfoSheet, SHEET_PEEK, type SheetTab } from './InfoSheet'
import { router, usePathname } from 'expo-router'
import { X, Play, Pause, RotateCcw } from 'lucide-react-native'
import { HanziStage, type HanziStageSpeed } from '../HanziStage'
import { StrokeSpeedToggle } from '../StrokeSpeedToggle'
import { ICON_GREEN, ICON_MUTED, ICON_STROKE } from './DictionaryControls'
import { tapHaptic } from '../../lib/haptics'
import { hanziFont } from '../../lib/hanzi'
import { useApp } from '../../context/AppContext'
import { TourScrollContext } from '../tour/targets'
import { BackArrow } from '../BackArrow'

/**
 * Page frame for the two detail screens: a hairline nav bar over the
 * dictionary's page grey.
 *
 * Presented as a modal (see the dictionary-tab Stack) rather than a plain
 * push, so this reads as a card raised over the browse screen rather than a
 * new page replacing it — on iOS that presentation is a native page sheet,
 * which already rounds its own top corners and lets the screen behind it
 * peek through; the rounding here is what carries that same "card" feel on
 * Android and web, where a modal is otherwise just a full-bleed screen.
 */
/**
 * Whether this detail screen is inside the Dictionary tab's stack, or pushed
 * standalone on top of another screen (`/word/[wordId]`, from My Words).
 *
 * The standalone routes exist so Back returns to the screen that opened the
 * card: pushing the tab's route from My Words switches to the tabs underneath
 * and takes My Words off the stack. Links onward from a detail screen stay in
 * whichever of the two it is in, so a chain of words still unwinds to where
 * it started.
 */
export function useInDictionaryTab(): boolean {
  return usePathname().startsWith('/dictionary-tab')
}

export function openWordDetail(wordId: string, inTab: boolean) {
  const id = encodeURIComponent(wordId)
  if (inTab) router.push(`/dictionary-tab/word/${id}`)
  else router.push(`/word/${id}`)
}

export function openCharacterDetail(character: string, inTab: boolean) {
  const ch = encodeURIComponent(character)
  if (inTab) router.push(`/dictionary-tab/character/${ch}`)
  else router.push(`/character/${ch}`)
}

/** Back arrow and centred title, shared by both detail layouts. */
function DetailNavBar({ title }: { title: string }) {
  const inTab = useInDictionaryTab()
  return (
    <View className="flex-row items-center border-b border-dict-line bg-dict-page px-3 py-2.5">
      <View className="h-10 w-10 justify-center">
        <BackArrow
          onPress={() => {
            tapHaptic()
            // Falls back to the Dictionary *tab* rather than the standalone
            // `/dictionary` route, so a deep-linked detail screen lands
            // somewhere with the tab bar still under it.
            if (router.canGoBack()) router.back()
            else router.replace(inTab ? '/dictionary-tab' : '/my-words')
          }}
          style={{ marginLeft: -4 }}
        />
      </View>
      <Text className="flex-1 text-center font-nunito-bold text-[20px] leading-[26px] text-dict-heading">{title}</Text>
      {/* Balances the back button so the title sits truly centred. */}
      <View className="h-10 w-10" />
    </View>
  )
}

/** The plain scrolling frame, still used for the "not found" states. */
export function DetailShell({ title, children }: { title: string; children: ReactNode }) {
  /* Shifu's word-card guide can ask for a scroll to reach a card below the
     fold. The offset is tracked rather than read back, which a ScrollView
     cannot do — the same arrangement as the Dashboard's. */
  const scroll = useRef<ScrollViewInstance>(null)
  const scrollY = useRef(0)
  const tourScrollBy = useMemo(
    () => (dy: number) => scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: true }),
    [],
  )
  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-dict-page"
      style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}
    >
      <DetailNavBar title={title} />

      <ScrollView
        ref={scroll}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={32}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <TourScrollContext.Provider value={tourScrollBy}>{children}</TourScrollContext.Provider>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * A white detail card.
 *
 * Plain styles, not classes: on native, adding a word re-renders the hero
 * card, and its class-derived padding was being dropped — the card came out
 * shorter than the buttons inside it (see the comment over `DetailHero`'s
 * button row). The shadow is also now one Android actually draws: the old
 * `shadow-dict` class compiles to iOS shadow props only, so this card was flat
 * on Android all along.
 */
export function DetailCard({ children }: { children: ReactNode }) {
  return <View style={DETAIL_CARD}>{children}</View>
}

/** Height of the nav bar above: 10 + 40 + 10 padding/button plus its hairline. */
const NAV_BAR_HEIGHT = 61
/** Every dictionary column caps here and centres, like the rest of the app. */
export const DETAIL_CONTENT_MAX = 430

/**
 * The redesigned detail page: a focused learning area (`hero`) with the
 * draggable information sheet over its lower edge.
 *
 * The body's height comes from `onLayout`, with an estimate from the window
 * until (or if, on web) that arrives, so the sheet always has a size.
 */
export function DetailSheetShell({
  title,
  hero,
  sheetLabel,
  sheetHints,
  sheetHeader,
  tabs,
  children,
}: {
  title: string
  /** Rendered with the height it may use, so it can size itself to fit. */
  hero: (availableHeight: number) => ReactNode
  sheetLabel: string
  sheetHints: string[]
  /** The word block at the top of the open sheet. */
  sheetHeader: ReactNode
  tabs: SheetTab[]
  /** Modals and overlays. */
  children?: ReactNode
}) {
  const inTab = useInDictionaryTab()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  /* The whole page under the status bar: nav bar + body. */
  const estimate = windowHeight - insets.top - (inTab ? tabBarHeight(insets.bottom) : 0)
  /* Keyed on the window height: a resize that doesn't re-fire onLayout falls back to the estimate. */
  const [measured, setMeasured] = useState<{ height: number; window: number } | null>(null)
  const pageHeight = measured && measured.window === windowHeight ? measured.height : estimate
  const bodyHeight = pageHeight - NAV_BAR_HEIGHT

  /* In the tab the tab bar owns the bottom edge; standalone, the home indicator does. */
  const bottomInset = inTab ? 0 : insets.bottom
  const peek = SHEET_PEEK + bottomInset
  /* Open, the sheet covers the whole page, nav bar included; its tab closes it. */
  const expandedHeight = Math.max(peek + 160, pageHeight)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-dict-page">
      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          const height = Math.round(e.nativeEvent.layout.height)
          if (height > 0) setMeasured({ height, window: windowHeight })
        }}
      >
        <DetailNavBar title={title} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: peek + 12 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={{ width: '100%', maxWidth: DETAIL_CONTENT_MAX, alignSelf: 'center' }}>
            {hero(bodyHeight - peek - 24)}
          </View>
        </ScrollView>

        <InfoSheet
          expandedHeight={expandedHeight}
          bottomInset={bottomInset}
          label={sheetLabel}
          hints={sheetHints}
          header={sheetHeader}
          tabs={tabs}
          onBack={() => {
            tapHaptic()
            if (router.canGoBack()) router.back()
            else router.replace(inTab ? '/dictionary-tab' : '/my-words')
          }}
          contentMaxWidth={DETAIL_CONTENT_MAX}
        />
      </View>
      {children}
    </SafeAreaView>
  )
}

/** `rounded-dict bg-dict-card p-5 shadow-dict`, spelled out. */
const DETAIL_CARD = {
  borderRadius: 20,
  backgroundColor: '#FFFDFA',
  padding: 20,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 12,
  shadowOpacity: 0.05,
  elevation: 2,
} as const

export function CardTitle({ children }: { children: ReactNode }) {
  return <Text className="font-nunito-bold text-[19px] leading-[25px] text-dict-heading">{children}</Text>
}

/**
 * Plays the stroke-order animation for each character of a word in turn.
 *
 * Demo mode only — `WritingPracticeModal` is the quiz. Kept separate rather than
 * bolted onto that modal as a flag, because the quiz carries a hint button, a
 * stroke counter and a completion state that mean nothing while watching.
 *
 * Playback is on demand rather than automatic: the sheet opens showing the
 * character at rest, and the animation only runs when asked for. Auto-playing on
 * open means the first stroke is already gone by the time the sheet has finished
 * sliding up, and the one thing a learner wants here is to watch it from the
 * start — as many times as they like.
 */
export function StrokeOrderModal({ characters, onClose }: { characters: string; onClose: () => void }) {
  /** 0 = never played. Bumping it both starts a run and restarts `HanziStage`. */
  const [play, setPlay] = useState(0)
  const [finished, setFinished] = useState(false)
  const [speed, setSpeed] = useState<HanziStageSpeed>('normal')

  const playing = play > 0 && !finished

  /*
   * The resting character's size, worked out rather than left to the platform.
   *
   * This used to be a fixed 120pt with `adjustsFontSizeToFit` — which is an
   * **iOS-only** prop. On Android it does nothing at all, so `numberOfLines={1}`
   * simply clipped: a two-character word wanted 240pt of a ~330pt box and got
   * away with it, three wanted 360 and lost the last character off the edge.
   *
   * CJK glyphs are full-width, so a character's advance is very close to one em
   * — which makes `width / count` a good estimate of the largest size that fits,
   * and the 0.92 the breathing room either side. Capped at the design's 120 so a
   * single character on a tablet doesn't fill the screen, and against the window
   * height so a short device doesn't push the glyph past the card it sits in.
   *
   * `useWindowDimensions` rather than `onLayout`: the latter does not fire for
   * every view on this project's web target, and a glyph laid out at zero is a
   * blank card rather than an obviously broken one.
   */
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const face = hanziFont(useApp().settings.script)
  const glyphCount = Math.max(1, [...characters].length)
  /** Card inset (`mx-4`) plus its own padding (`px-4`), both sides. */
  const glyphBoxWidth = windowWidth - 64
  const glyphSize = Math.max(
    28,
    Math.floor(Math.min(120, ((glyphBoxWidth / glyphCount) * 0.92), windowHeight * 0.28)),
  )

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-dict-page">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="font-nunito-bold text-[19px] text-dict-heading">Stroke order</Text>
          <RaisedButton
            onPress={onClose}
            accessibilityLabel="Close stroke order"
            height={40}
            width={40}
            radius={20}
            fill={DICT_BG.card}
            border={DICT_BG.pillBorder}
            shoulder={DICT_BG.pillShoulder}
            scaleTo={0.9}
          >
            <X size={18} color={ICON_MUTED} strokeWidth={ICON_STROKE} />
          </RaisedButton>
        </View>

        <View className="mx-4 flex-1 rounded-dict border border-dict-line bg-dict-card">
          {play === 0 ? (
            // The character at rest, before the first run. Plain type rather than
            // a paused writer: nothing has to load, so the sheet never opens empty.
            <View className="flex-1 items-center justify-center px-4">
              <Text
                numberOfLines={1}
                className={`${face} text-dict-line`}
                /* Line height at 1.25× the size, as the design had it: CJK
                   glyphs fill their em box far more completely than Latin ones,
                   and a tighter ratio clips the top of a character like 謝. */
                style={{ fontSize: glyphSize, lineHeight: Math.round(glyphSize * 1.25) }}
              >
                {characters}
              </Text>
            </View>
          ) : (
            <HanziStage
              character={characters}
              mode="demo"
              speed={speed}
              showOutline
              showGuides
              resetKey={play}
              onDemoComplete={() => setFinished(true)}
            />
          )}
        </View>

        <View className="gap-3 px-4 pb-6 pt-4">
          {/*
           * Speed sits above the play button rather than inside it: it's a
           * setting for the next run, not a second way to start one. Switching
           * while a run is in flight restarts it at the new speed — the WebView
           * is configured once at creation, so there is nothing to retune, and
           * silently waiting for the current run to finish would look broken.
           */}
          <StrokeSpeedToggle
            speed={speed}
            tone="dictionary"
            onChange={(next) => {
              setSpeed(next)
              // Restart at the new speed rather than waiting out the current
              // run: the WebView is configured once at creation, so a live
              // writer can't be retuned, and doing nothing visible would read
              // as the button not working.
              if (play > 0) {
                setFinished(false)
                setPlay((n) => n + 1)
              }
            }}
          />

          <RaisedButton
            onPress={() => {
              tapHaptic()
              setFinished(false)
              setPlay((n) => n + 1)
            }}
            /*
             * Deliberately not disabled while playing. `finished` depends on the
             * writer posting back a completion, and that can simply never
             * arrive — a background tab throttling rAF, or stroke data that
             * fails to load. Leaving the button live means a press always
             * restarts the animation, so there is no state you can get stuck in.
             */
            wrapperStyle={{ alignSelf: 'stretch' }}
            height={56}
            radius={14}
            fill={DICT_BG.greenDark}
            shoulder={DICT_BG.greenDarkShoulder}
            accessibilityLabel={play === 0 ? 'View stroke order' : 'View stroke order again'}
          >
            {playing ? (
              <Pause size={20} color="#ffffff" strokeWidth={ICON_STROKE} />
            ) : play === 0 ? (
              <Play size={20} color="#ffffff" strokeWidth={ICON_STROKE} />
            ) : (
              <RotateCcw size={20} color="#ffffff" strokeWidth={ICON_STROKE} />
            )}
            <Text className="font-nunito-bold text-[17px] text-white">
              {playing ? 'Playing… tap to restart' : play === 0 ? 'View' : 'View again'}
            </Text>
          </RaisedButton>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
