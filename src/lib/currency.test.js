import { describe, expect, it } from 'vitest'
import { formatPrice, formatTotal, sumPrices } from './currency'

describe('formatPrice', () => {
  it('formats an amount without decimals in the given locale', () => {
    expect(formatPrice(1500, 'USD', 'en-US')).toBe('$1,500')
    expect(formatPrice(1500, 'EUR', 'en-US')).toBe('€1,500')
  })

  it('follows the locale conventions', () => {
    expect(formatPrice(1500, 'EUR', 'es')).toMatch(/1\.?500\s?€/)
  })

  it('returns an empty string for missing amounts', () => {
    expect(formatPrice(null)).toBe('')
    expect(formatPrice(undefined)).toBe('')
    expect(formatPrice('')).toBe('')
  })

  it('defaults to the configured currency (USD)', () => {
    expect(formatPrice(0)).toBe('$0')
  })
})

describe('formatTotal', () => {
  it('keeps the cents', () => {
    expect(formatTotal(1234.5, 'USD', 'en-US')).toBe('$1,234.50')
    expect(formatTotal(0, 'USD', 'en-US')).toBe('$0.00')
  })

  it('treats missing or invalid amounts as zero', () => {
    expect(formatTotal(null, 'USD', 'en-US')).toBe('$0.00')
    expect(formatTotal(undefined, 'USD', 'en-US')).toBe('$0.00')
    expect(formatTotal('abc', 'USD', 'en-US')).toBe('$0.00')
  })
})

describe('sumPrices', () => {
  it('adds up every product price', () => {
    expect(sumPrices([{ price: 1000 }, { price: 250.5 }, { price: '49.5' }])).toBe(1300)
  })

  it('ignores missing prices and handles an empty list', () => {
    expect(sumPrices([{ price: null }, {}, { price: 10 }])).toBe(10)
    expect(sumPrices([])).toBe(0)
  })
})
