import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { INITIAL_TOUR, TOUR_STEPS, normalizeTour, tourAfterAction, type TourState } from '../tour'
import { placeTooltip, scrollToReveal, type Bounds } from '../tourPlacement'

/*
 * The guided tour's rules that a screenshot would not show breaking: what an
 * old install's stored value turns into, which actions move which steps, and
 * that a tooltip always lands on screen and off its target — on a small phone
 * as well as a large one.
 */

describe('normalizeTour', () => {
  test('a never-written key is a tour not yet offered', () => {
    assert.deepEqual(normalizeTour(undefined), INITIAL_TOUR)
  })

  test("the old tour's stored null means it already ran — not offered again unasked", () => {
    assert.deepEqual(normalizeTour(null), { status: 'completed', step: null })
  })

  test('an interrupted old tour (a step index) is offered the new one', () => {
    assert.deepEqual(normalizeTour(7), INITIAL_TOUR)
  })

  test('a tour in progress when the app closed is offered again, not resumed mid-step', () => {
    assert.deepEqual(normalizeTour({ status: 'in_progress', step: 'save' }), INITIAL_TOUR)
  })

  test('completed and dismissed stick', () => {
    assert.deepEqual(normalizeTour({ status: 'dismissed', step: null }), { status: 'dismissed', step: null })
    assert.deepEqual(normalizeTour({ status: 'completed', step: 'review' }), { status: 'completed', step: null })
  })

  test('garbage is treated as not offered rather than thrown on', () => {
    assert.deepEqual(normalizeTour('yes'), INITIAL_TOUR)
    assert.deepEqual(normalizeTour({ status: 'weird' }), INITIAL_TOUR)
  })
})

describe('tourAfterAction', () => {
  const at = (step: TourState['step']): TourState => ({ status: 'in_progress', step })

  test('adding a word finishes the Save step', () => {
    assert.deepEqual(tourAfterAction(at('save'), 'word:add'), at('review'))
  })

  test("adding from the Dashboard's word card skips straight past Save", () => {
    assert.deepEqual(tourAfterAction(at('new-words'), 'word:add'), at('review'))
  })

  test('an add on a step that is not waiting for one changes nothing', () => {
    assert.deepEqual(tourAfterAction(at('home'), 'word:add'), at('home'))
    assert.deepEqual(tourAfterAction(at('review'), 'word:add'), at('review'))
  })

  test('nothing moves a tour that is not running', () => {
    for (const status of ['not_started', 'completed', 'dismissed'] as const) {
      const state: TourState = { status, step: null }
      assert.equal(tourAfterAction(state, 'word:add'), state)
    }
  })

  test('the tour is four steps and ends at Review', () => {
    assert.deepEqual(
      TOUR_STEPS.map((s) => s.id),
      ['home', 'new-words', 'save', 'review'],
    )
  })
})

/* Window sizes of the smallest and largest phones the app is laid out for. */
const SMALL: Bounds = { top: 28, bottom: 640 - 64 - 10, width: 360 }
const LARGE: Bounds = { top: 67, bottom: 932 - 92 - 10, width: 430 }

describe('placeTooltip', () => {
  const card = { width: 328, height: 150 }
  const opts = { gap: 16, margin: 16 }

  const inBounds = (b: Bounds, p: { x: number; y: number }) => {
    assert.ok(p.y >= b.top, `top ${p.y} < ${b.top}`)
    assert.ok(p.y + card.height <= b.bottom, `bottom ${p.y + card.height} > ${b.bottom}`)
    assert.ok(p.x >= 16 && p.x + card.width <= b.width - 16 + 0.001, `x ${p.x}`)
  }

  for (const [name, bounds] of [['small', SMALL], ['large', LARGE]] as const) {
    test(`${name} phone: a target near the top gets its card below, clear of it`, () => {
      const target = { x: 12, y: bounds.top + 40, width: bounds.width - 24, height: 170 }
      const p = placeTooltip({ target, card, bounds, ...opts })
      assert.equal(p.side, 'below')
      assert.ok(p.y >= target.y + target.height + 16)
      inBounds(bounds, p)
    })

    test(`${name} phone: a target near the bottom flips its card above`, () => {
      const target = { x: 12, y: bounds.bottom - 200, width: bounds.width - 24, height: 190 }
      const p = placeTooltip({ target, card, bounds, ...opts })
      assert.equal(p.side, 'above')
      assert.ok(p.y + card.height <= target.y - 16)
      inBounds(bounds, p)
    })

    test(`${name} phone: no target centres the card`, () => {
      const p = placeTooltip({ target: null, card, bounds, ...opts })
      assert.equal(p.side, 'center')
      inBounds(bounds, p)
    })
  }

  test('a target too tall for either side still leaves the card on screen', () => {
    const target = { x: 0, y: SMALL.top + 60, width: 360, height: 420 }
    const p = placeTooltip({ target, card, bounds: SMALL, ...opts })
    inBounds(SMALL, p)
  })

  test('a narrow target near the edge does not push the card off screen', () => {
    const target = { x: 300, y: 200, width: 50, height: 40 }
    const p = placeTooltip({ target, card, bounds: SMALL, ...opts })
    inBounds(SMALL, p)
  })
})

describe('scrollToReveal', () => {
  test('a target already in view needs no scroll', () => {
    assert.equal(scrollToReveal({ x: 0, y: 200, width: 300, height: 150 }, SMALL, 24), 0)
  })

  test('a target below the fold scrolls up just far enough', () => {
    const target = { x: 0, y: 500, width: 300, height: 190 }
    const dy = scrollToReveal(target, SMALL, 24)
    assert.ok(dy > 0)
    assert.ok(target.y + target.height - dy <= SMALL.bottom - 24)
  })

  test('never scrolls the top of a tall target out of view to show its bottom', () => {
    const target = { x: 0, y: 300, width: 300, height: 600 }
    const dy = scrollToReveal(target, SMALL, 24)
    assert.ok(target.y - dy >= SMALL.top + 24)
  })
})
