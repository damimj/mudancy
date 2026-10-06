// Optional convenience: runs a SQL file (default: supabase-schema.sql) against
// a Supabase Postgres database from your terminal. Reads POSTGRES_URL_NON_POOLING
// from .env.local, or from the file given with --env (e.g. --env .env.test.local
// for the separate e2e test project). Neither file is committed.
// You don't need this to deploy Mudancy: pasting the SQL in the Supabase SQL
// Editor does the same thing.
//
//   node scripts/run-sql.mjs [file.sql] [--env .env.test.local]
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const envFlagIndex = args.indexOf('--env')
const envFile = envFlagIndex >= 0 ? args.splice(envFlagIndex, 2)[1] : '.env.local'

function loadEnvLocal() {
  const path = join(__dirname, '..', envFile)
  const content = readFileSync(path, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) {
      let value = match[2]
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      env[match[1]] = value
    }
  }
  return env
}

const env = loadEnvLocal()
const connectionString = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL
if (!connectionString) {
  console.error(`POSTGRES_URL_NON_POOLING not found in ${envFile}`)
  process.exit(1)
}

const sqlPath = args[0] || join(__dirname, '..', 'supabase-schema.sql')
const sql = readFileSync(sqlPath, 'utf8')

const cleanedConnectionString = connectionString.replace(/[?&]sslmode=[^&]+/, '')
// A local Supabase (supabase start) has no SSL; hosted projects require it.
const isLocal = /@(127\.0\.0\.1|localhost)[:/]/.test(cleanedConnectionString)
const client = new pg.Client({
  connectionString: cleanedConnectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log(`Applied ${sqlPath} using ${envFile} successfully.`)
} catch (err) {
  console.error('Failed to run SQL:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
