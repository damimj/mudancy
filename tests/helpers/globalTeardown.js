import { deleteLeftoverProductsForThisRun } from './supabaseTestClient.js'

// Runs once after every test finished (pass or fail). Individual tests clean
// up after themselves; this is the backstop for anything they missed. Throws
// if it had to remove something, so a cleanup bug fails the run instead of
// being quietly papered over.
export default async function globalTeardown() {
  const removed = await deleteLeftoverProductsForThisRun()
  if (removed.length > 0) {
    const titles = removed.map((product) => `  - ${product.title}`).join('\n')
    throw new Error(`Tests left ${removed.length} product(s) behind (now removed):\n${titles}`)
  }
}
