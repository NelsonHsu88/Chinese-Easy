/*
 * The launch intro's palette and timing. Colours are sampled from the app icon
 * (`assets/images/icon.png`) so the wave reads as Shifu's robe washing over the
 * screen rather than a generic blue.
 */
export const launchColors = {
  /* Must match the icon's own background — the silk strands carry pieces of
     it, invisible only while they sit on exactly this white. */
  page: '#FFFFFF',
  robeDeep: '#1254A5',
  robe: '#1D6ECC',
  robeBright: '#2F7FE0',
  robeLight: '#4998E7',
  robeMist: '#9CC8F5',
  scrollGold: '#E9B949',
  foam: '#FFFFFF',
  /* Highlights: the light sweep's peak, the front crest's edge, the ball's glint. */
  sheen: 'rgba(255,255,255,0.55)',
  sheenClear: 'rgba(255,255,255,0)',
  crestEdge: 'rgba(255,255,255,0.6)',
  glint: 'rgba(255,255,255,0.75)',
} as const

export const launchTiming = {
  /* The silk, lock-in effects and the writing all run on one clock (ms). */
  introMs: 3350,
  /* Rings of silk around the logo's centre; the innermost is cut in two, the
     rest in three. Strands set off one at a time, inner ring first. */
  strandRings: 7,
  strandFirstMs: 60,
  /* When the last strand sets off; earlier ones bunch towards the start. */
  strandSpreadMs: 980,
  strandFlightMs: 760,
  /* How close to the viewer a strand starts (its scale). */
  strandNearScale: 3.3,
  lockInMs: 1680,
  /* The ball drops in and starts writing while the last strands settle. */
  writeAtMs: 1150,
  /* The wave waits for the intro *and* the app, whichever is later. */
  waveMs: 1150,
  /* Forces an animation's end value if its callback never comes (hidden tab). */
  backstopMs: 300,
} as const
