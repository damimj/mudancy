// @ts-check
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// The e2e suite runs against its OWN Supabase project (see .env.test.example).
// Deliberately NOT .env.local, which holds your real shop's credentials. In CI
// there is no file: the same variables come from the E2E_* GitHub secrets.
dotenv.config({ path: '.env.test.local' })

const TEST_PORT = 5174

// One id per run, inherited by the worker processes. It is embedded in every
// test product's title so the end-of-run teardown can remove exactly this
// run's leftovers (see tests/helpers/testData.js).
process.env.E2E_RUN_ID ??= String(Date.now())

// Tests write real (clearly [E2E]-prefixed, always cleaned up) rows to the
// separate test database, so we run everything on one worker: with a shared
// database, parallel workers could race on the same tables. The global setup
// refuses to run unless that database carries the e2e marker, so this suite
// can never write to your real shop's database.
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/helpers/globalSetup.js',
  globalTeardown: './tests/helpers/globalTeardown.js',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    // The UI picks its language from the browser, so pin it for stable assertions.
    locale: 'en-US',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // A dedicated dev server on its own port, always started fresh with the TEST
  // database credentials. Never reuse an already-running `npm run dev`: that
  // one is wired to your real data. (Vite gives variables that already exist
  // in the environment priority over .env files.)
  webServer: {
    command: `npm run dev -- --port ${TEST_PORT} --strictPort`,
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
  },
})
