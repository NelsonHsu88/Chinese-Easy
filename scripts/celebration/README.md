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
