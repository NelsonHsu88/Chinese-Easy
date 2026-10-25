# Completion celebration art

`cutout.mjs` cuts the jumping Shifu out of the "Great job!" painting (`great-job-reference.webp`) into `src/assets/images/celebration/shifu-jump.png` (675×828, transparent):

```
node scripts/celebration/cutout.mjs [debugDir]   # debugDir gets the cut-out over dark and over ivory
```

1. **Outline:** a hand-traced outline leaves out the scenery: mountains, trees, the sparkle marks and the ground shadow.
2. **Opacity:** inside the outline, each pixel's opacity is its distance from the paper colour. The paper colour is the median of the band just outside the outline.
3. **Solid silhouette:** close the gaps, fill every enclosed area, and keep the largest piece. This makes the cream linings, beard and hair solid however near to paper they are, and drops stray specks.

The cut-out is used by `components/celebration/LessonCompletionCelebration.tsx`. If you re-run this, update `SHIFU_ART` in `components/celebration/tokens.ts`.

## What the celebration can't do yet: a real 360° spin

Every Shifu image the project has faces the viewer, so there's nothing to show his side or back. At the top of the jump he makes a small twist instead, which is honest about the art.

The full turnaround is specified in **`TURNAROUND_SPEC.md`**, with **`turnaround-template.png`** for scale, axis and pivot. It covers:
- the eight key views and 24 spin frames;
- follow-through;
- canvas and pivot;
- delivery format;
- how it goes into the app.

## 3D version (Blender, work in progress)

A 3D Shifu with a real jump and full turn lives in `shifu3d_v*.blend`, built by the scripts in `blender/`. Each step writes a new file, so earlier versions stay intact:

| Script | Input → output | What it does |
|---|---|---|
| `blender/animate.py` | `v2` → `v3` | First rig (pivot empties) and jump/turn animation. |
| `blender/refine.py` | `v3` → `v4` | Fuses stuck-together pieces into seamless surfaces, adds more subdivision, and adds eyes with blinks and happy-arc squints. |
| `blender/animate_v5.py` | `v4` → `v5` | Leg rig (hips, IK legs, planted feet), a full animation pass (anticipation, gravity arc, eased spin, two-foot landing, finale), spring follow-through on the beard, brush and bow, a responsive contact shadow, and soft AO. |
| `blender/render.py` | any → PNG frames | Transparent 900×1100 frames. The cloth simulates from frame 1, so it has settled before the first rendered frame. |

```
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b scripts/celebration/shifu3d_v5.blend \
    --python scripts/celebration/blender/render.py -- <out_dir> 40 216
```

The action runs from frame 40 to 216 at 60fps (2.95s). Frames 1–39 are cloth pre-roll and are never shown. The celebration page is `#FAF9F6` with petals around Shifu, so an app integration needs the transparent frames (or a WebM with alpha on Android and web). An opaque MP4 only works where its background matches the page exactly. The app doesn't use any of this yet.
