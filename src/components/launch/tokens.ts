/*
 * The launch intro's palette and timing. Colours are sampled from the app icon
 * (`assets/images/icon.png`) so the wave reads as Shifu's robe washing over the
 * screen rather than a generic blue. The silk and the writing are baked into
 * the video (scripts/launch/scene.mjs holds their colours and timing).
 */
export const launchColors = {
  /* Pure white, like the video's page and the native splash: white survives
     the video's YUV round trip exactly, so the video's edges never show. */
  page: '#FFFFFF',
  robeDeep: '#1254A5',
  robe: '#1D6ECC',
  robeBright: '#2F7FE0',
  robeLight: '#4998E7',
  robeMist: '#9CC8F5',
  foam: '#FFFFFF',
  /** The front crest's bright edge. */
  crestEdge: 'rgba(255,255,255,0.6)',
} as const

export const launchTiming = {
  /* The wave waits for the video *and* the app, whichever is later. */
  waveMs: 1150,
  /* Forces an animation's end value if its callback never comes (hidden tab). */
  backstopMs: 300,
} as const
