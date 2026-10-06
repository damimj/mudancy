import { createClient } from '@supabase/supabase-js'
import { expect } from '@playwright/test'

// Admins sign in with an e-mailed one-time link, which a test can't open. So we
// do what the link would do: ask the TEST project (via the service role key) to
// generate one, exchange it for a real session, and hand that session to the
// browser exactly where the Supabase client keeps it. No password anywhere.
let sessionPromise = null

async function mintAdminSession() {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const email = process.env.TEST_ADMIN_EMAIL
  if (!url || !anonKey || !serviceKey || !email) {
    throw new Error(
      'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / TEST_ADMIN_EMAIL. ' +
        'Copy .env.test.example to .env.test.local and fill them in.'
    )
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false } }

  const { data: link, error: linkError } = await createClient(url, serviceKey, options).auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) throw new Error(`Could not generate a test sign-in link: ${linkError.message}`)

  const { data, error } = await createClient(url, anonKey, options).auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink',
  })
  if (error || !data.session) throw new Error(`Could not sign in the test admin: ${error?.message}`)
  return data.session
}

export function loginAsAdmin(page) {
  return signInWithSession(page, '/admin')
}

async function signInWithSession(page, path) {
  sessionPromise ??= mintAdminSession()
  const session = await sessionPromise
  const storageKey = `sb-${new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`

  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify(session)])
  await page.goto(path)
  await expect(page).toHaveURL(/\/admin$/)
}
