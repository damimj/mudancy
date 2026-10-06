import { assertTestDatabase, deleteStaleTestProducts } from './supabaseTestClient.js'

// Sweeps orphans left by earlier runs that were killed mid-way (timeout,
// cancelled CI job, laptop closed...). Only touches products older than 10
// minutes, so a run that is still in progress elsewhere is safe.
export default async function globalSetup() {
  await assertTestDatabase()

  const removed = await deleteStaleTestProducts(10)
  if (removed.length > 0) {
    console.warn(`[e2e] Removed ${removed.length} stale test product(s) from earlier runs:`)
    for (const product of removed) console.warn(`  - ${product.title}`)
  }
}
