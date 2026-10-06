// All products created by tests carry this prefix in their title. This makes
// them trivially distinguishable from real inventory, lets assertions scope
// to "my test's own data" even when other data exists concurrently, and
// gives the cleanup helpers something reliable to search/delete by.
export const TEST_PREFIX = '[E2E]'

// Every `playwright test` invocation gets one id (set in playwright.config.js)
// that is embedded in each title it creates. The end-of-run teardown deletes
// exactly this run's products, so it can never touch another run's data
// (e.g. a local run overlapping with CI against the same database).
export const RUN_ID = process.env.E2E_RUN_ID || 'manual'

let counter = 0

export function uniqueTitle(base) {
  counter += 1
  return `${TEST_PREFIX} ${base} ${RUN_ID}-${counter}-${Math.floor(Math.random() * 100000)}`
}
