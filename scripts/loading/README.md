# Learning loader: Shifu writing

Builds the seamless loop shown while Flashcards and Mixed Drills prepare:
- `src/assets/video/loading-shifu.mp4` (810×1080, 60fps, 3.2s);
- `src/assets/images/loading/shifu-writing-still.jpg` (its first frame);
- `src/components/loading/loop.ts` (its timing, generated).

```
node scripts/loading/render.mjs                                         # full render + encode (~1 min, needs ffmpeg)
node scripts/loading/render.mjs --sheet 0,0.3,0.6 --out <dir> [--crop x,y,w,h]   # loop phases 0..1, for tuning
node scripts/loading/plate.mjs <dir>                                    # debug: the rebuilt plate and the hand mask
```

The source is `shifu-writing.webp`, the flat painting, kept here so the loop can be re-rendered.

## How the painting is brought to life

The painting is one flattened image, so nothing in it can move by itself. `plate.mjs` takes it apart:
- **hand layer:** the writing hand and the whole brush are cut out by skin and handle colour and the bristle outline, with a softened edge;
- **plate:** the painting with the hand, the brush and the painted ink squiggle removed. The holes are rebuilt by multigrid harmonic in-painting. Below the fingers, where the hole crosses level things (belt, hem, paper edge), each row is bridged straight across to keep those lines crisp.

`render.mjs` then composites each frame:
- **Hand and brush:** placed rigidly. The *brush tip's path* is what's designed (a level stroke with a gentle wave). The hand's position is solved from that path and the wrist's turn, so the ink lands exactly under the bristles.
- **Ink:** stamped along the tip's actual positions, thick where it presses and thin where it lightens. A dry brush leaves streaks across the width toward the end, with a faint wet bloom at the edge.
- **Displacement fields** (small and feathered):
  - the sleeve follows the cuff, fading out before the elbow;
  - the upper body breathes;
  - the head nods faintly and settles back, pleased, in the pause;
  - the hair ribbon sways about its knot, its tails lagging the bow.
- **Petals:** two, cut from the painting itself, drift through. Each is invisible at the loop seam.

## Why it loops seamlessly

- The loop ends where it began: the hand raised above the start of the stroke.
- Breath, nod and ribbon all run on the loop's period.
- The scroll advances one stroke-spacing during the return, so this loop's stroke ends exactly where the previous loop's stroke began. The ink never vanishes; it moves down toward the roller and fades as it rolls under.
- Measured on the source frames, last→first changes no more than any other frame pair (mean 0.019 vs 0.019–0.024). In the MP4 the seam carries only compression noise between keyframe groups, about 0.1% brightness.

## What needs real artwork to go further

This loop moves the hand and brush rigidly and lets the sleeve follow. The rebuilt area behind the hand is only ever uncovered by a few dozen pixels, and the watercolour hides that. It **would not** survive larger movement. To go beyond it (the arm reaching across the scroll, the elbow bending, fingers re-gripping, a blink or a changing smile), a designer needs to supply a layered file:

1. **The background plate:** the scene with Shifu's writing arm and the brush painted *out*, and the robe, belt and scroll behind them painted in properly. In-painting can't invent this convincingly over large areas.
2. **The writing arm in parts:** upper sleeve, forearm sleeve, hand (closed on nothing) and brush as separate layers. Each needs its own pivot (shoulder, elbow, wrist, grip), for rigging in Rive or Spine.
3. **The face in parts**, if a blink is wanted: open-eye and closed-eye states. The painting only has the closed, smiling eyes.
4. **The hair ribbon as its own layer,** with what's behind it painted in, so it can swing further than a gentle sway.

Either deliverable can replace this loop with no change to the app:
- **a Rive file** (needs `rive-react-native` and a dev build); or
- **a 3:4 white-ivory (#FAF9F6) video that loops on itself.** `ShifuWritingLoop.tsx` and `loop.ts` are the only places that know about it.
