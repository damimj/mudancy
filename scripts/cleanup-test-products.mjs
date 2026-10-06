// Removes leftover [E2E] products from the e2e TEST project.
//
//   node scripts/cleanup-test-products.mjs            -> only products older than 10 min
//   node scripts/cleanup-test-products.mjs --all      -> every [E2E] product right now
//   node scripts/cleanup-test-products.mjs --env .env.other
//
// Only ever touches products whose title starts with "[E2E]".
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dotenv from 'dotenv'

const args = process.argv.slice(2)
const deleteAll = args.includes('--all')
const envFlagIndex = args.indexOf('--env')
const envFile = envFlagIndex >= 0 ? args[envFlagIndex + 1] : '.env.test.local'
const STALE_AFTER_MINUTES = 10

// Prefer real process env (CI sets these from secrets); fall back to the file.
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', envFile)
if (existsSync(envPath)) dotenv.config({ path: envPath, override: false })

const { assertTestDatabase, deleteAllTestProducts, deleteStaleTestProducts } = await import(
  '../tests/helpers/supabaseTestClient.js'
)

try {
  await assertTestDatabase()
  const removed = deleteAll ? await deleteAllTestProducts() : await deleteStaleTestProducts(STALE_AFTER_MINUTES)
  const scope = deleteAll ? '' : ` older than ${STALE_AFTER_MINUTES} min`
  if (removed.length === 0) {
    console.log(`Nothing to clean up${scope}.`)
  } else {
    console.log(`Deleted ${removed.length} leftover test product(s)${scope}:`)
    for (const p of removed) console.log(` - ${p.title}`)
  }
} catch (error) {
  console.error('Cleanup failed:', error.message)
  process.exit(1)
}
