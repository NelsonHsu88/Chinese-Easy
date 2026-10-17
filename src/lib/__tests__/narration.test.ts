import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createNarrationFollower, createRateEstimator } from '../narration'

// Every test fixes its own clock: positions are computed from the times passed in.
const T0 = 1_000_000
const TEXT = '小明今天很高興，他去公園看花。花很漂亮，他很喜歡。'

test('nothing moves before the voice starts', () => {
  const f = createNarrationFollower(TEXT, 0, createRateEstimator(4), T0)
  assert.equal(f.position(T0 + 2000), 0)
  f.started(T0 + 2000)
  assert.equal(f.position(T0 + 2000), 0)
  assert.ok(f.position(T0 + 2500) > 0)
})

test('the line rests at a comma instead of reading straight through it', () => {
  const rate = createRateEstimator(4)
  const f = createNarrationFollower(TEXT, 0, rate, T0)
  f.started(T0)
  // Seven characters at 4/s is 1.75s; the comma (index 7) costs a pause before index 8.
  const atComma = f.position(T0 + 1900)
  assert.ok(atComma <= 7, `ran past the comma: ${atComma}`)
})

test('a boundary slightly behind the line never pulls it backwards', () => {
  const f = createNarrationFollower(TEXT, 0, createRateEstimator(6), T0)
  f.started(T0)
  const ahead = f.position(T0 + 800)
  f.boundary(Math.max(0, ahead - 2), T0 + 800)
  assert.equal(f.position(T0 + 800), ahead)
})

test('a boundary far behind the line does correct it', () => {
  const f = createNarrationFollower(TEXT, 0, createRateEstimator(14), T0)
  f.started(T0)
  const ahead = f.position(T0 + 1500)
  assert.ok(ahead > 10)
  f.boundary(1, T0 + 1500)
  assert.equal(f.position(T0 + 1500), 1)
})

test('a voice that reports once a sentence is not parked at the first comma', () => {
  const f = createNarrationFollower(TEXT, 0, createRateEstimator(4), T0)
  f.started(T0)
  f.boundary(0, T0)
  // Next report skips the comma: a sentence-level reporter.
  f.boundary(15, T0 + 4200)
  f.boundary(15, T0 + 4200)
  // From 15 the next clause ends at 18 (before ，); a sentence reporter may run to 23.
  const later = f.position(T0 + 4200 + 1800)
  assert.ok(later > 18, `held at the clause: ${later}`)
})

test('a clause-level reporter is held inside the clause it is in', () => {
  const f = createNarrationFollower(TEXT, 0, createRateEstimator(10), T0)
  f.started(T0)
  f.boundary(0, T0)
  f.boundary(3, T0 + 700)
  // Fast estimate, but the next clause break is at 7.
  assert.ok(f.position(T0 + 5000) <= 6)
})

test('boundaries teach the estimator the real speed', () => {
  const rate = createRateEstimator(4)
  const f = createNarrationFollower(TEXT, 0, rate, T0)
  f.started(T0)
  f.boundary(0, T0)
  f.boundary(6, T0 + 1000)
  assert.ok(rate.perSecond() > 4, `${rate.perSecond()}`)
})
