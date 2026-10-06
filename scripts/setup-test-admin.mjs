// Prepares the admin of the e2e TEST project: adds TEST_ADMIN_EMAIL to the
// admins table and creates the matching auth user (no password: the tests sign
// in with one-time links generated through the service role key).
//
//   node scripts/setup-test-admin.mjs [--env .env.test.local]
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dotenv from 'dotenv'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const envFlagIndex = args.indexOf('--env')
const envFile = envFlagIndex >= 0 ? args[envFlagIndex + 1] : '.env.test.local'
const envPath = join(__dirname, '..', envFile)
if (existsSync(envPath)) dotenv.config({ path: envPath, override: false })

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POSTGRES_URL_NON_POOLING, TEST_ADMIN_EMAIL } = process.env
if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !POSTGRES_URL_NON_POOLING || !TEST_ADMIN_EMAIL) {
  console.error(
    `Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POSTGRES_URL_NON_POOLING / TEST_ADMIN_EMAIL (env or ${envFile}).`
  )
  process.exit(1)
}

const email = TEST_ADMIN_EMAIL.trim().toLowerCase()
const connectionString = POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]+/, '')
const isLocal = /@(127\.0\.0\.1|localhost)[:/]/.test(connectionString)
const db = new pg.Client({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } })

try {
  await db.connect()
  // The signup trigger only lets listed addresses create an account, so the
  // e-mail must be in the admins table before the auth user is created.
  await db.query('insert into admins (email) values ($1) on conflict do nothing', [email])
} finally {
  await db.end()
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { error } = await supabase.auth.admin.createUser({ email, email_confirm: true })
if (error && !/already|registered|exists/i.test(error.message)) {
  console.error('Could not create the test admin user:', error.message)
  process.exit(1)
}
console.log(`Test admin ready: ${email}`)
