/*
 * Run work once the JS thread is idle — the replacement for
 * `InteractionManager.runAfterInteractions`, which React Native 0.88 removed
 * (it now throws on access). Same shape: returns `{ cancel }`.
 *
 * `requestIdleCallback` exists on native and most browsers; Safari lacks it,
 * so that falls back to a plain timeout. `timeout` caps the wait so a busy
 * thread can't hold the work back forever.
 */
export function runAfterInteractions(fn: () => void, timeout = 500): { cancel: () => void } {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback
  const cic = (globalThis as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback
  if (typeof ric === 'function') {
    const id = ric(fn, { timeout })
    return { cancel: () => cic?.(id) }
  }
  const id = setTimeout(fn, 0)
  return { cancel: () => clearTimeout(id) }
}
