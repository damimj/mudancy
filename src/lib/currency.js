import { CURRENCY } from '../config'

export function formatPrice(amount, currency = CURRENCY, locale = 'en-US') {
  if (amount === null || amount === undefined || amount === '') return ''
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

// Admin dashboard totals keep their cents.
export function formatTotal(amount, currency = CURRENCY, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount) || 0)
}

export function sumPrices(products) {
  return products.reduce((sum, product) => sum + (Number(product.price) || 0), 0)
}
