// Formats an ISO date string ("YYYY-MM-DD", as produced by <input type="date">)
// for the given locale, e.g. "Nov 1, 2026" / "1 nov 2026". Parsed and formatted
// in UTC so the displayed day never shifts due to the visitor's timezone.
export function formatDate(isoDate, locale = 'en-US') {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}
