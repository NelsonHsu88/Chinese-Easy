# Launch intro renderer

Builds `src/assets/video/launch-intro.mp4` (Shifu assembled from silk, then
"Chinese Easy" handwritten) and `src/components/launch/lockup.ts` (the last
frame as geometry, for the app's seamless handoff).

```
node scripts/launch/render.mjs                    # full render + encode (~1.5 min, needs ffmpeg on PATH)
node scripts/launch/render.mjs --sheet 0.5,1.5,2.5 --out <dir>   # contact sheet while tuning
node scripts/launch/layers.mjs <dir>              # debug: the layer split, tinted
node scripts/launch/handwriting.mjs <dir>         # debug: centre lines and stroke order
```

Re-run the full render after changing anything here or the app icon.

## Files

| File | Does |
| --- | --- |
| `layers.mjs` | Splits the flat icon into robe, garment, hand, scroll, beard, face, hair and hair ribbon. It classes each pixel by colour family, then assigns it to a layer by region. The layers partition the icon exactly, so stacked they *are* the logo. |
| `ttf.mjs` | Minimal TrueType reader (no font library in the project). |
| `handwriting.mjs` | Reduces Caveat Bold "Chinese Easy" to pen strokes: centre lines (distance transform + Zhang–Suen thinning + tracing) in writing order, each point carrying the stroke's half-width. |
| `scene.mjs` | The choreography: a pure function from time to SVG. Silk is modelled as 3D ribbons with perspective, twist, flutter, curl shading, depth sorting, soft shadows and near-lens blur. |
| `render.mjs` | Rasterises frames (sharp, worker threads) and encodes H.264 (yuv420p, High@4.2, 900×1950 @ 60fps). |

## Why a pre-rendered video

- **Runtime SVG/Animated:** the silk needs hundreds of shaded polygons per frame, blur and shadow filters. On React Native that runs on the JS thread, right while the app is hydrating, so it would stutter.
- **Skia + Reanimated:** could draw it at runtime, but adds a large native dependency, and on web needs a CanvasKit (WASM) download before the first frame.
- **Rendering offline:** gives full quality for any effect, and the hardware decodes a 1 MB video at a steady 60fps whatever the JS thread is doing.

The page is pure white because white survives the YUV round trip exactly. The video's edges therefore vanish on any screen shape, and the last frame hands over to the real logo and vector wordmark drawn underneath.

## What the flat icon can't give — needs a designer

The icon is one flattened illustration. This build derives everything it can from it honestly:
- The robe is laid down by the silk.
- The garment shows between the folds.
- The beard sweeps in on a wipe with a small rotation.
- The hair gathers to the bun.
- The hair ribbon loops in.
- The face fades in.

What it **cannot** do without new artwork:

1. **True cloth morphing.** In this build, silk ribbons lay down robe panels and melt into them. For the silk to physically *deform into* the exact robe shapes, a designer needs:
   - the robe redrawn as separate vector panels (left mass, right mass, front sweep, collar, two sleeves), each a closed path;
   - matching open "ribbon" paths, so a tool can morph one into the other (Rive, or After Effects + Lottie with shape morphing).
2. **Anything hidden behind something else.** No layer has art for what sits behind it — under the beard, behind the scroll, inside the sleeves. The choreography only moves layers *into* place, so holes never show. Anything that slides past another element needs the occluded art painted in.
3. **A beard or hair that *flows* (bends) into place,** rather than wiping in, needs them as vector strands rigged with bones (Rive or Spine).
4. **A real eye-blink or smile,** if wanted, needs the face parts as separate layers.
5. **Physically simulated silk** (true folds and self-collision) is a Blender cloth simulation, rendered on white. It would drop straight into this pipeline in place of `scene.mjs`'s silk, using the same video handoff.

**If a designer takes this on**, give them:
- `assets/images/icon.png`;
- the layer split from `layers.mjs`;
- the timing in `scene.mjs`'s header.

Ask for one of these back:
- **a Rive file**, which needs `rive-react-native` plus a dev build; or
- **a white-background video at 900×1950 @ 60fps** that ends on the exact icon placed at `LOGO_RECT`, with the wordmark at `wordLayout`. This drops in with no app changes.
