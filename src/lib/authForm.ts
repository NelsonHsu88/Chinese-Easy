import { MIN_PASSWORD_LENGTH } from './passwordRules'

/*
 * The sign-up and log-in forms' field checks, as data the screen draws under
 * each box.
 *
 * Every field is checked at once, so a learner who presses the button sees
 * everything that needs fixing in one pass rather than one complaint at a time.
 * Only what can be known locally is checked here; whether an address already
 * has an account, or a password matches, is the server's answer.
 */

export type AuthField = 'name' | 'email' | 'password' | 'confirm'
export type FieldErrors = Partial<Record<AuthField, string>>

export interface AuthFormValues {
  name: string
  email: string
  password: string
  confirm: string
}

/*
 * Deliberately loose: something@something.something, no spaces. A strict
 * pattern only ever rejects somebody's real address; the confirmation email
 * is the real check.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailError(email: string): string | undefined {
  const trimmed = email.trim()
  if (trimmed.length === 0) return 'Enter your email address'
  if (!EMAIL_SHAPE.test(trimmed)) return 'Enter a valid email address, like name@example.com'
  return undefined
}

export function signUpErrors(values: AuthFormValues): FieldErrors {
  const errors: FieldErrors = {}
  if (values.name.trim().length === 0) errors.name = 'Enter your name'
  const email = emailError(values.email)
  if (email) errors.email = email
  if (values.password.length === 0) errors.password = 'Choose a password'
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  if (values.confirm.length === 0) errors.confirm = 'Re-enter your password'
  else if (values.confirm !== values.password) errors.confirm = 'Passwords don’t match'
  return errors
}

export function logInErrors(values: Pick<AuthFormValues, 'email' | 'password'>): FieldErrors {
  const errors: FieldErrors = {}
  const email = emailError(values.email)
  if (email) errors.email = email
  if (values.password.length === 0) errors.password = 'Enter your password'
  return errors
}

/**
 * Which field a server error belongs under, if any. Errors about the account
 * as a whole ("that email and password don't match") stay under the form, as
 * naming one field would tell a stranger which half was right.
 */
export function fieldForServerError(message: string): AuthField | null {
  const m = message.toLowerCase()
  if (m.includes('already an account') || m.includes('valid email') || m.includes('already used')) return 'email'
  if (m.includes('password') && !m.includes('email and password')) return 'password'
  return null
}
