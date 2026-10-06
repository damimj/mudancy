// Node-side Supabase client used by tests for fast setup/teardown of data
// that isn't itself under test (e.g. seeding a product before testing the
// public reservation flow). It uses the TEST project's service role key, so
// it bypasses RLS: the admin UI's own permissions are exercised by the
// browser tests, which sign in as a real admin (see adminAuth.js).
import { createClient } from '@supabase/supabase-js'
import { RUN_ID, TEST_PREFIX, uniqueTitle } from './testData.js'

let client = null

export function getServiceClient() {
  if (!client) {
    const url = process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error(
        'Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy .env.test.example to .env.test.local and fill them in.'
      )
    }
    client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}

// Hard stop against writing to the wrong database: the test project carries a
// one-row marker table (scripts/test-db-marker.sql) that a real shop does not
// have. If the configured Supabase doesn't have it, abort before anything is
// created, whatever the environment variables say.
export async function assertTestDatabase() {
  const { data, error } = await getServiceClient()
    .from('e2e_environment')
    .select('name')
    .eq('name', 'test')
    .maybeSingle()
  if (error || !data) {
    throw new Error(
      'Refusing to run: the configured Supabase project is not the e2e TEST database ' +
        '(marker table "e2e_environment" is missing). Check .env.test.local or the E2E_* CI secrets — ' +
        'they must NOT point at your real shop.'
    )
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getCategoryIdBySlug(slug) {
  const { data, error } = await getServiceClient().from('categories').select('id').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

// Creates a product with its translations. `translations` maps a language code
// to { title, description, condition }; by default a single English one is made.
export async function createTestProduct({ title, translations, ...overrides } = {}) {
  const db = getServiceClient()
  const { data: product, error } = await db
    .from('products')
    .insert({ price: 100, currency: 'USD', images: [], status: 'available', ...overrides })
    .select()
    .single()
  if (error) throw error

  const rows = Object.entries(
    translations ?? {
      en: {
        title: title ?? uniqueTitle('Test Product'),
        description: 'Created by a Playwright test — safe to delete.',
      },
    }
  ).map(([lang, fields]) => ({ product_id: product.id, lang, ...fields }))

  const { error: translationError } = await db.from('product_translations').insert(rows)
  if (translationError) {
    await db.from('products').delete().eq('id', product.id)
    throw translationError
  }
  return { ...product, title: rows[0].title }
}

// Deletes a product and PROVES it is gone: re-reads the row instead of trusting
// the response, and retries on transient failures. Throws if it still exists —
// a leftover test product must be loud, never silent.
export async function deleteProductById(id, { attempts = 4 } = {}) {
  const db = getServiceClient()
  let lastProblem = 'unknown'

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { error: deleteError } = await db.from('products').delete().eq('id', id)
    const { data: stillThere, error: readError } = await db.from('products').select('id').eq('id', id).maybeSingle()

    if (!deleteError && !readError && !stillThere) return
    lastProblem = deleteError?.message || readError?.message || 'the row still exists after delete'
    await sleep(300 * attempt)
  }

  throw new Error(`Could not delete test product ${id}: ${lastProblem}`)
}

// Products created through the UI have a title in some language and an id
// that isn't known up front: find them through their translation rows.
export async function deleteProductsByTitle(title) {
  const { data, error } = await getServiceClient().from('product_translations').select('product_id').eq('title', title)
  if (error) throw new Error(`Looking up test products failed: ${error.message}`)
  for (const { product_id } of data ?? []) await deleteProductById(product_id)
}

// Removes every product with a translation title matching `pattern` (and
// optionally created before `cutoff`). Returns [{ id, title }] of what it removed.
async function sweep(pattern, cutoff) {
  const db = getServiceClient()
  let query = db
    .from('product_translations')
    .select('product_id, title, products!inner(created_at)')
    .like('title', pattern)
  if (cutoff) query = query.lt('products.created_at', cutoff)
  const { data, error } = await query
  if (error) throw new Error(`Test product sweep failed: ${error.message}`)

  const found = new Map()
  for (const row of data ?? []) if (!found.has(row.product_id)) found.set(row.product_id, row.title)
  for (const id of found.keys()) await deleteProductById(id)
  return [...found].map(([id, title]) => ({ id, title }))
}

// End-of-run safety net: removes whatever THIS run created and somehow left
// behind. Matches on the run id, so concurrent runs are untouched.
export function deleteLeftoverProductsForThisRun() {
  return sweep(`${TEST_PREFIX}%${RUN_ID}-%`)
}

// Start-of-run safety net: removes orphans from earlier runs that were killed
// before they could clean up. Age-based so a run that is still in flight
// (e.g. CI at the same time as a local run) is never affected.
export function deleteStaleTestProducts(olderThanMinutes = 10) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString()
  return sweep(`${TEST_PREFIX}%`, cutoff)
}

export function deleteAllTestProducts() {
  return sweep(`${TEST_PREFIX}%`)
}
