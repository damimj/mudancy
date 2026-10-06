import { describe, expect, it } from 'vitest'
import { formatDate } from './date'

describe('formatDate', () => {
  it('formats an ISO date for the locale without shifting the day', () => {
    expect(formatDate('2026-11-01', 'en-US')).toBe('Nov 1, 2026')
    expect(formatDate('2026-01-31', 'en-US')).toBe('Jan 31, 2026')
    expect(formatDate('2026-11-01', 'es')).toMatch(/^1 nov\.? 2026$/)
  })

  it('returns an empty string for missing or malformed dates', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
    expect(formatDate('nonsense')).toBe('')
  })
})
