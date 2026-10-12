/*
 * delete-account — deletes the calling learner's account, and nothing else.
 *
 * Why this is a server function at all: deleting a row in `auth.users` needs
 * the service_role key, which bypasses Row Level Security and must never be in
 * the app (see assertBuildEnv.mjs). Here it lives in Supabase's own runtime,
 * injected as an environment variable, and never leaves the server.
 *
 * Why it is safe to expose: the function takes **no input**. Whose account to
 * delete is read from the caller's own access token, verified against
 * Supabase Auth with `getUser` — never from a body field. There is no way to
 * name somebody else's account, so there is nothing to validate and nothing to
 * forge.
 *
 * Every table in supabase/migrations references `auth.users` with
 * `on delete cascade`, so deleting the user removes all of their synced rows
 * in the same statement. Nothing else needs cleaning up.
 *
 * Deploy:   npx supabase functions deploy delete-account
 */

import { createClient } from 'npm:@supabase/supabase-js@2.112.3'

/* The web build calls this from a browser. Auth is a bearer token, never a
   cookie, so a wildcard origin grants nothing a caller doesn't already hold. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  /* A state change never rides on GET — a link preview or prefetch must not be
     able to delete an account. */
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'unauthorized' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    console.error('delete-account: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set')
    return json({ error: 'server_misconfigured' }, 500)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  /* `getUser(token)` asks Supabase Auth to validate the token — signature,
     expiry, and that the user still exists. Decoding the JWT locally would
     accept a token for an account that has already been deleted. */
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return json({ error: 'unauthorized' }, 401)

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) {
    /* Details go to the function's logs, not to the client. */
    console.error('delete-account: deleteUser failed', deleteError.message)
    return json({ error: 'delete_failed' }, 500)
  }

  return json({ ok: true }, 200)
})
