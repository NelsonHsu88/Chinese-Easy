import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { emailError, fieldForServerError, logInErrors, signUpErrors } from '../authForm'

/*
 * The sign-up form's inline errors. Each message is drawn under its own box,
 * so the field a check lands on matters as much as the check itself.
 */

const valid = { name: 'Mei', email: 'mei@example.com', password: 'longenough', confirm: 'longenough' }

describe('signUpErrors', () => {
  test('a complete, consistent form has no errors', () => {
    assert.deepEqual(signUpErrors(valid), {})
  })

  test('mismatched passwords are reported on the confirm field only', () => {
    assert.deepEqual(signUpErrors({ ...valid, confirm: 'different1' }), { confirm: 'Passwords don’t match' })
  })

  test('a short password is reported on the password field', () => {
    const errors = signUpErrors({ ...valid, password: 'short', confirm: 'short' })
    assert.deepEqual(Object.keys(errors), ['password'])
  })

  test('every problem is reported at once', () => {
    const errors = signUpErrors({ name: ' ', email: 'nope', password: 'short', confirm: 'other' })
    assert.deepEqual(Object.keys(errors).sort(), ['confirm', 'email', 'name', 'password'])
  })
})

describe('emailError', () => {
  test('accepts ordinary addresses, with surrounding spaces', () => {
    for (const email of ['a@b.co', ' first.last+tag@sub.example.org ']) assert.equal(emailError(email), undefined)
  })

  test('rejects addresses missing a part', () => {
    for (const email of ['', 'name', 'name@', 'name@site', '@site.com', 'na me@site.com']) {
      assert.ok(emailError(email), email)
    }
  })
})

test('logInErrors does not apply sign-up length rules', () => {
  assert.deepEqual(logInErrors({ email: 'mei@example.com', password: 'x' }), {})
})

test('fieldForServerError keeps credential failures off any one field', () => {
  assert.equal(fieldForServerError('That email and password don’t match an account.'), null)
  assert.equal(fieldForServerError('There’s already an account with that email. Try logging in.'), 'email')
  assert.equal(fieldForServerError('That password has appeared in a data breach. Please choose another.'), 'password')
})
