# Shifu turnaround — art spec for the celebration's 360° spin

**Status:** waiting on artwork. The current celebration
(`src/components/celebration/LessonCompletionCelebration.tsx`) stays as it is until this arrives. At the top of its jump it makes a small twist, about a third of a turn, not a spin.

## Why the current animation looks flat

Every Shifu image the project has faces the viewer:
- the ten pose sheets in `Photos for Reference/ChatGPT Image/SHIFU Derivates/`;
- the nine in-app images under `src/assets/images/`;
- the app icon;
- the jump cut-out `src/assets/images/celebration/shifu-jump.png`.

There is no profile, no back view, no layered rig, no sprite sheet and no 3D model. The celebration can only move that one flat painting: lift it, squash it, tilt it. Any rotation of a flat card keeps his face toward us, and his beard, sleeves and ribbon can't trail behind because they are painted into the same picture.

Nothing in code can show a side or back that was never drawn. A believable 360° turn needs the views below.

## What to make

Use the **jumping pose of `shifu-jump.png`**:
- the brush raised in **his right hand** (screen left);
- his left fist up;
- his right knee lifted.

Show the same character, the same costume and the same proportions throughout, at about 2.8 heads tall, cute and slightly chibi. Use the same soft watercolour as the painting it came from, `great-job-reference.webp`.

See `turnaround-template.png` for the layout, scale, axis and pivot.

**Optional rough guide:** `shifu3d.blend` is a simple 3D blockout in this pose. Turn its `Shifu_Root` empty to any angle and render it to see where the arms, brush, beard, sleeves and ribbon fall. Use it for **volumes and placement only**: its look was rejected, so paint over the painting's style, not this model's.

### Direction

He turns toward **his own left**: counter-clockwise, seen from above. So his face swings to screen right first.

### The eight key views

| Angle | What we see | Must show |
| --- | --- | --- |
| 0° | Front | Exactly the current art |
| 45° | Front three-quarter, face toward screen right | Both eyes (far eye foreshortened), beard swinging slightly left, brush arm coming toward us |
| 90° | **His right profile** | Nose, beard and topknot in profile; brush arm nearest us; fist arm behind the body |
| 135° | Rear three-quarter | Right shoulder, back of the head, the ear, beard tip just visible past the cheek |
| 180° | **Back** | Back of the robe and sash knot, the hair's back and the rear of the topknot, the ribbon bow and its tails; brush raised on screen right (his right hand), fist on screen left. No face. |
| 225° | Rear three-quarter | Left shoulder, back of the head |
| 270° | **His left profile** | Raised fist nearest us, brush arm behind the body, face toward screen left |
| 315° | Front three-quarter, face toward screen left | Coming back round to front |

The brush **never changes hands**, and the ribbon is always tied at the back-right of the topknot.

### In-betweens

There are **24 spin frames, one every 15°** (00 = 0°, 01 = 15° … 23 = 345°). Playback eases them over about 750ms, roughly 32fps.

Twelve frames (30° steps) is the minimum that still reads as a turn. Twenty-four is what makes it smooth.

### Follow-through (where it stops looking like a card)

- In every spin frame, the **beard, sleeve ends and ribbon tails lag the body by 15–20°**. They swing out a little from the turn.
- In frames 21–23 (315–345°) the body slows, and the beard and sleeves catch up and slightly overshoot.

### Extra frames (recommended)

| Frames | What |
| --- | --- |
| `crouch-0…1` | Front. Knees bend, arms dip, beard and sleeves settle down. |
| `takeoff-0…1` | Front, stretching up, arms rising, sleeves trailing down. |
| `land-0…2` | Front. Impact squash, then sleeves, beard and ribbon settle. The last frame equals the current art. |

The jump height, the squash and stretch, and the shadow are added in code, so the frames don't need to move up and down.

### Timing

The whole sequence fits in the current screen's length (about 2.2s to Continue); nothing is added after it.

| Phase | Length | Frames used | Code adds |
| --- | --- | --- | --- |
| Anticipation | 150–200ms | `crouch-0…1` | Slight squash; shadow widens and darkens |
| Jump | 200–300ms | `takeoff-0…1`, then spin 00 | Lift and stretch; feet visibly leave the ground; shadow lightens and softens |
| Spin | 650–900ms (aim for 750) | spin 00 → 23, then 00 again (exactly one turn) | Ease in-out, so 90°, 180° and 270° each hold long enough to read; a little float at the top |
| Landing | 150–250ms | `land-0…2` | Impact squash; shadow sharpens; **haptic and fanfare on the first contact frame** |
| Celebration | 250–400ms | last `land` frame (= current art) | Gold marks, petals, "Great job!", tiles and Continue on their existing cues |

The turn must finish **before** the feet touch: frame 00 (front) is showing at contact.

### Acceptance checks (before it goes into the app)

Lay the frames out in a contact sheet and check:

1. **0° / 360°** match `shifu-jump.png` exactly.
2. **90° and 270°** are true profiles: one eye, nose and beard silhouetted, topknot seen side-on.
3. **180°** shows no face at all: the back of the robe and sash knot, the back of the hair and topknot, and the ribbon bow and tails.
4. The **brush stays in his right hand** in every frame; the ribbon stays tied to the topknot; the pendant stays at the sash.
5. No extra or missing fingers; no limb crosses through the body; the beard is visible past the cheek in the three-quarter views and doesn't vanish between frames.
6. Head-to-body ratio, robe colours and line weight are the same in every frame (check the 0°, 90°, 180° and 270° frames side by side at the same size).
7. Played at speed, the sheet reads as one continuous turn with no pose jumps, and the follow-through lag is visible.

On a phone, the whole jump (topknot to raised brush to feet) must fit in the stage the screen already reserves above "Great job!". The canvas and scale above are chosen so it does.

## Canvas and delivery

- **Canvas:** 900 × 1100 px, **identical for every frame**, transparent background. No paper texture and no shadow.
- **Pivot:** (450, 1060), the ground contact under his planted foot. The body axis is the vertical through x = 450.
- **Scale:** bun top to sole is 1000 px at 0°, and every frame uses the same scale. Don't refit a frame to its canvas.
- **Files:** PNG-32, sRGB:
  - `shifu-spin-00.png` … `shifu-spin-23.png`;
  - `shifu-crouch-0.png`, `-1`;
  - `shifu-takeoff-0.png`, `-1`;
  - `shifu-land-0.png` … `-2`.
- **Sources:** the layered files (PSD or Procreate) for at least the eight key views.
- **Colours:** match `shifu-jump.png` exactly: robe blues, ivory linings, skin, the blue ribbon, the jade pendant, the brush. Hold the colours side by side; don't recolour by eye.

## Two ways to get there

**A — Painted turnaround (recommended).** An illustrator paints the eight key views, then in-betweens and follow-through. This is the most faithful to the watercolour look.

**B — Stylised 3D model.** Model and rig Shifu in Blender with painted textures and a watercolour/toon shader (soft ramp, darkened edges, paper-free). Animate the crouch, jump and turn, then render the same frames on the same canvas with a long, near-orthographic lens.
- **Pros:** geometry stays consistent automatically, and more frames are free.
- **Risks:** it can drift toward a plastic 3D look. Judge the 0° render against `shifu-jump.png` before rendering the rest.

## How it goes into the app when the frames arrive

1. **Bake the stage into a video.** Render the character stage into a 60fps H.264 video over the page colour, with the faint mountains baked in: Shifu's crouch, jump, the 24-frame spin, landing and shadow. This is the pattern the loading loop uses (`scripts/loading/`).
   - It is hardware-decoded and deterministic.
   - It is smooth even while the app is busy.
   - It uses a few MB of memory, against about 35MB for an equivalent sprite sheet held in memory.
2. **Draw the still underneath.** The still of the last frame sits under the video, so the hand-off is invisible. `expo-video` is already installed and works on iOS, Android and web.
3. **Keep the live layers.** "Great job!", the result tiles, Continue, the gold marks and the petals stay as they are. Their Animated clock starts when the video starts playing, and the landing haptic and fanfare stay on the touchdown frame.
4. **Reduced motion:** the final still, then the existing simple reveal.
5. **Unchanged:** the layout zones, XP, results and Continue navigation.
