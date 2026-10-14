/**
 * The shortest password the app accepts. Above Supabase's floor of 6, which is
 * too low for an account that holds years of progress — set the same number
 * under Authentication → Providers → Email → "Minimum password length" so the
 * server enforces it too, since anyone can call the API directly.
 */
export const MIN_PASSWORD_LENGTH = 8

/** bcrypt, which Supabase hashes with, ignores everything past 72 bytes. */
export const MAX_PASSWORD_LENGTH = 72
