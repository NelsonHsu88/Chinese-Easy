#!/usr/bin/env node
/*
 * Refuses a release build whose environment is missing something the bundle
 * cannot be built without.
 *
 * ── Why this is not the check in lib/supabase.ts ─────────────────────────────
 * That one is a *runtime* check and it is deliberately soft: until `.env` is
 * filled in, `isSupabaseConfigured` is false and the app runs signed-out rather
 * than crashing, so an empty `.env` does not brick the project for anybody
 * working on another part of it. That is right for a dev machine and wrong for a
 * store release, where the same softness means a build that looks fine, installs
 * fine, opens fine, and cannot sign anybody in — because `EXPO_PUBLIC_*` values
 * are inlined at bundle time and were simply not there.
 *
 * Nothing in the pipeline noticed that. This does.
 *
 * ── Wiring ──────────────────────────────────────────────────────────────────
 * Runs as `eas-build-pre-install`, which EAS executes on the builder before
 * installing dependencies — early enough that a misconfigured build fails in
 * seconds instead of after a twenty-minute native compile. Also runnable by hand:
 *
 *     node scripts/assertBuildEnv.mjs production
 *
 * On a local `expo start` it does not run at all, which is intended: the whole
 * point of the soft runtime path is that development works without credentials.
 */

/*
 * EAS sets EAS_BUILD_PROFILE to the profile being built. Absent (a local run),
 * fall back to the first argument, then to 'development' — the permissive case,
 * because a script that guesses "production" and fails would block the very
 * local runs it is supposed to leave alone.
 */
const profile = process.env.EAS_BUILD_PROFILE ?? process.argv[2] ?? 'development'

/**
 * Variables that must be present and non-empty, per profile.
 *
 * Only the ones whose absence produces a *broken* build. The AdMob unit ids are
 * deliberately absent from this list: `.env.example` documents that leaving them
 * empty is a supported state where placements simply render nothing, which is
 * the correct behaviour for a release cut before the ad units exist.
 */
const REQUIRED = {
  development: [],
  preview: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
  production: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
}

/**
 * Values that must *never* reach a bundle.
 *
 * `EXPO_PUBLIC_` inlines a value into the shipped JavaScript, so a service_role
 * key given that prefix is a public admin key that bypasses Row Level Security
 * for everybody. `.env.example` warns about it in prose; this makes the warning
 * enforceable. The check is on the name and on the value shape, because the
 * mistake that matters is pasting the wrong key into the right variable.
 */
const FORBIDDEN_NAME = /^EXPO_PUBLIC_.*(SERVICE_ROLE|SECRET|PRIVATE_KEY)/i

function looksLikeServiceRole(value) {
  // Supabase's own two formats: the new `sb_secret_…` prefix, and a legacy JWT
  // whose payload names the service_role claim.
  if (value.startsWith('sb_secret_')) return true
  if (!value.startsWith('eyJ')) return false
  try {
    const [, payload] = value.split('.')
    if (!payload) return false
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded).role === 'service_role'
  } catch {
    return false
  }
}

const missing = (REQUIRED[profile] ?? []).filter((name) => !process.env[name]?.trim())

const leaked = Object.entries(process.env)
  .filter(([name, value]) => {
    if (!value?.trim()) return false
    if (FORBIDDEN_NAME.test(name)) return true
    return name.startsWith('EXPO_PUBLIC_') && looksLikeServiceRole(value)
  })
  .map(([name]) => name)

if (missing.length === 0 && leaked.length === 0) {
  console.log(`[env] ${profile}: OK`)
  process.exit(0)
}

console.error(`\n[env] Refusing to build profile "${profile}".\n`)

if (missing.length > 0) {
  console.error('  Missing (required, and inlined at bundle time — a build without')
  console.error('  them installs and opens but cannot sign anybody in):')
  for (const name of missing) console.error(`    - ${name}`)
  console.error('\n  Set them with:  eas env:create --environment ' + profile + '\n')
}

if (leaked.length > 0) {
  console.error('  PUBLIC variable holding what looks like a secret. The')
  console.error('  EXPO_PUBLIC_ prefix ships this value to every phone:')
  for (const name of leaked) console.error(`    - ${name}`)
  console.error('\n  A service_role key bypasses Row Level Security entirely. It')
  console.error('  belongs on a server, or nowhere. Rotate it now if this ever built.\n')
}

process.exit(1)
