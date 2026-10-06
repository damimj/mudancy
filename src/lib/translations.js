// Products and categories store one translation row per language. These
// helpers pick the right row for the visitor's language, falling back to the
// shop's default language and then to whatever language exists, so an item
// that has only been written in one language still shows up everywhere.

function pickRow(rows, lang, defaultLang, isUsable) {
  if (!rows?.length) return null
  const usable = rows.filter(isUsable)
  return (
    usable.find((row) => row.lang === lang) ||
    usable.find((row) => row.lang === defaultLang) ||
    usable[0] ||
    null
  )
}

export function localizeProduct(product, lang, defaultLang) {
  if (!product) return product
  const row = pickRow(product.product_translations, lang, defaultLang, (r) => r.title?.trim())
  return {
    ...product,
    title: row?.title ?? '',
    description: row?.description ?? '',
    condition: row?.condition ?? '',
  }
}

export function localizeCategory(category, lang, defaultLang) {
  if (!category) return category
  const row = pickRow(category.category_translations, lang, defaultLang, (r) => r.name?.trim())
  return { ...category, name: row?.name ?? category.slug }
}
