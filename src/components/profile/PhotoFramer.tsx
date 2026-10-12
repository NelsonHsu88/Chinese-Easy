import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Image, Animated, PanResponder, Pressable, useWindowDimensions, type GestureResponderEvent } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { Check, Minus, Plus } from 'lucide-react-native'
import { clampFraming, coverScale, cropFor, type AvatarCrop, type Framing, type PickedPhoto } from '../../lib/photoFraming'
import { tickHaptic } from '../../lib/haptics'
import { ProfileButton } from './parts'
import { profColors as c, profSpacing as s, profType as t, profRadius, profShadow } from './tokens'

/*
 * Framing a new profile photo: the photo under a circle, dragged to position
 * and pinched (or −/+) to zoom, then Save. It replaces the platform's own crop
 * screen, whose only ways out were "Crop" and a back arrow.
 *
 * Drawn as an overlay inside Edit Profile's own Modal rather than as a second
 * Modal: stacking one native modal on another is unreliable across platforms,
 * and an overlay also keeps the edit form exactly as it was underneath.
 *
 * All the arithmetic — what the circle may show, and which pixels that is —
 * lives in `lib/photoFraming.ts`, where it is tested. This file only turns
 * touches into a `Framing` and draws it. Gestures use RN's `PanResponder` and
 * `Animated`, not Gesture Handler and Reanimated, which do not drive on this
 * project's web target.
 */

/** How much the area around the circle shows of the rest of the photo. */
const MARGIN = 22
/** One press of − or +. */
const ZOOM_STEP = 1.25

interface Props {
  photo: PickedPhoto
  onCancel: () => void
  /** The photo (with its measured size) and the square to cut from it. */
  onSave: (photo: PickedPhoto, crop: AvatarCrop) => Promise<void>
}

export function PhotoFramer({ photo, onCancel, onSave }: Props) {
  const { width: windowWidth } = useWindowDimensions()
  /* The card is at most 400 wide with s.xl padding; the circle fills what is left. */
  const area = Math.min(windowWidth - s.screen * 2, 400) - s.xl * 2
  const frame = area - MARGIN * 2

  /* The picker usually reports the size; when it does not, measure it. */
  const [size, setSize] = useState(photo.width > 0 && photo.height > 0 ? { w: photo.width, h: photo.height } : null)
  useEffect(() => {
    if (size) return
    Image.getSize(
      photo.uri,
      (w, h) => setSize({ w, h }),
      () => setSize({ w: 1, h: 1 }),
    )
  }, [photo.uri, size])

  const [saving, setSaving] = useState(false)

  /* The live framing lives in a ref (gestures read it every frame) and is drawn
     through Animated values, so a drag never re-renders the component. */
  const framing = useRef<Framing>({ zoom: 1, x: 0, y: 0 })
  const tx = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(0)).current
  const zoom = useRef(new Animated.Value(1)).current

  const apply = (next: Framing) => {
    if (!size) return
    const f = clampFraming(size.w, size.h, frame, next)
    framing.current = f
    tx.setValue(f.x)
    ty.setValue(f.y)
    zoom.setValue(f.zoom)
  }
  // `apply` closes over `size` and `frame`; the responder below reads it through a ref.
  const applyRef = useRef(apply)
  applyRef.current = apply

  const gesture = useRef({ startX: 0, startY: 0, startZoom: 1, baseDx: 0, baseDy: 0, startDistance: 0, pinching: false })

  const responder = useMemo(() => {
    const touchDistance = (e: GestureResponderEvent) => {
      const touches = e.nativeEvent.touches
      if (!touches || touches.length < 2) return 0
      return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)
    }
    /* Re-anchors the gesture to wherever the photo is now, so going from one
       finger to two (or back) never makes it jump. */
    const anchor = (dx: number, dy: number) => {
      const g = gesture.current
      g.startX = framing.current.x
      g.startY = framing.current.y
      g.startZoom = framing.current.zoom
      g.baseDx = dx
      g.baseDy = dy
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture: the sheet's ScrollView must not take a drag over the photo.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        gesture.current.pinching = false
        anchor(0, 0)
      },
      onPanResponderMove: (e, gs) => {
        const g = gesture.current
        const distance = touchDistance(e)
        if (distance > 0) {
          if (!g.pinching) {
            g.pinching = true
            g.startDistance = distance
            anchor(gs.dx, gs.dy)
            return
          }
          applyRef.current({ ...framing.current, zoom: g.startZoom * (distance / g.startDistance) })
          return
        }
        if (g.pinching) {
          g.pinching = false
          anchor(gs.dx, gs.dy)
        }
        applyRef.current({ ...framing.current, x: g.startX + gs.dx - g.baseDx, y: g.startY + gs.dy - g.baseDy })
      },
    })
  }, [])

  const step = (factor: number) => {
    tickHaptic()
    apply({ ...framing.current, zoom: framing.current.zoom * factor })
  }

  const save = async () => {
    if (!size || saving) return
    setSaving(true)
    const measured = { ...photo, width: size.w, height: size.h }
    await onSave(measured, cropFor(size.w, size.h, frame, framing.current))
    setSaving(false)
  }

  /* The photo at the size that just covers the circle; zoom scales from there. */
  const base = size ? coverScale(size.w, size.h, frame) : 0
  const shownW = size ? size.w * base : 0
  const shownH = size ? size.h * base : 0
  const r = frame / 2
  const mid = area / 2
  /* The shade: the whole area with the circle cut out of it (even-odd fill). */
  const shade = `M0 0H${area}V${area}H0Z M${mid - r} ${mid} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0Z`

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', padding: s.screen }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim }} />
      <View
        style={{ alignSelf: 'center', width: '100%', maxWidth: 400, backgroundColor: c.background, borderRadius: 24, borderWidth: 1, borderColor: c.border, padding: s.xl, ...profShadow }}
      >
        <Text className="font-lora-bold" accessibilityRole="header" style={{ ...t.section, color: c.navy }}>
          Frame your photo
        </Text>
        <Text className="font-lora" style={{ ...t.tag, color: c.slate, marginTop: 4 }}>
          Drag to move it. Pinch, or use − and +, to zoom.
        </Text>

        <View
          {...responder.panHandlers}
          accessibilityLabel="Photo framing area. Drag to move the photo."
          style={{ width: area, height: area, marginTop: s.lg, alignSelf: 'center', overflow: 'hidden', borderRadius: profRadius.medium, backgroundColor: c.tile }}
        >
          {size && (
            <Animated.Image
              source={{ uri: photo.uri }}
              resizeMode="cover"
              style={{
                position: 'absolute',
                width: shownW,
                height: shownH,
                left: mid - shownW / 2,
                top: mid - shownH / 2,
                transform: [{ translateX: tx }, { translateY: ty }, { scale: zoom }],
              }}
            />
          )}
          <Svg width={area} height={area} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }}>
            <Path d={shade} fill={c.framerShade} fillRule="evenodd" />
            <Circle cx={mid} cy={mid} r={r} fill="none" stroke={c.jade} strokeWidth={2} />
          </Svg>
        </View>

        <View className="flex-row items-center justify-center" style={{ gap: s.lg, marginTop: s.md }}>
          <ZoomButton label="Zoom out" onPress={() => step(1 / ZOOM_STEP)} icon={Minus} />
          <ZoomButton label="Zoom in" onPress={() => step(ZOOM_STEP)} icon={Plus} />
        </View>

        <View className="flex-row" style={{ gap: s.sm, marginTop: s.lg }}>
          <ProfileButton label="Cancel" tone="quiet" onPress={onCancel} />
          <View style={{ flex: 1, opacity: size && !saving ? 1 : 0.45 }} pointerEvents={size && !saving ? 'auto' : 'none'}>
            <View className="flex-row">
              <ProfileButton label={saving ? 'Saving…' : 'Save'} icon={Check} tone="primary" onPress={save} />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

function ZoomButton({ label, onPress, icon: Icon }: { label: string; onPress: () => void; icon: typeof Plus }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="items-center justify-center active:opacity-60"
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}
    >
      <Icon size={20} color={c.jadeDark} strokeWidth={2.2} />
    </Pressable>
  )
}
