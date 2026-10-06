import { describe, expect, it } from 'vitest'
import { localizeCategory, localizeProduct } from './translations'

const product = {
  id: 'p1',
  product_translations: [
    { lang: 'en', title: 'Chair', description: 'A chair', condition: 'New' },
    { lang: 'es', title: 'Silla', description: 'Una silla', condition: 'Nueva' },
  ],
}

describe('localizeProduct', () => {
  it('uses the translation for the requested language', () => {
    expect(localizeProduct(product, 'es', 'en')).toMatchObject({ title: 'Silla', description: 'Una silla' })
    expect(localizeProduct(product, 'en', 'en')).toMatchObject({ title: 'Chair', condition: 'New' })
  })

  it('falls back to the default language when the requested one is missing', () => {
    const onlyEnglish = { id: 'p2', product_translations: [{ lang: 'en', title: 'Lamp', description: '', condition: '' }] }
    expect(localizeProduct(onlyEnglish, 'es', 'en').title).toBe('Lamp')
  })

  it('falls back to any available language when the default is missing too', () => {
    const onlySpanish = { id: 'p3', product_translations: [{ lang: 'es', title: 'Mesa', description: '', condition: '' }] }
    expect(localizeProduct(onlySpanish, 'en', 'en').title).toBe('Mesa')
  })

  it('ignores translations with a blank title', () => {
    const blank = {
      id: 'p4',
      product_translations: [
        { lang: 'es', title: '  ', description: 'x', condition: '' },
        { lang: 'en', title: 'Desk', description: '', condition: '' },
      ],
    }
    expect(localizeProduct(blank, 'es', 'en').title).toBe('Desk')
  })

  it('returns empty strings when there are no translations at all', () => {
    expect(localizeProduct({ id: 'p5' }, 'en', 'en')).toMatchObject({ title: '', description: '', condition: '' })
  })
})

describe('localizeCategory', () => {
  const category = {
    slug: 'kitchen',
    category_translations: [
      { lang: 'en', name: 'Kitchen' },
      { lang: 'es', name: 'Cocina' },
    ],
  }

  it('picks the name for the requested language', () => {
    expect(localizeCategory(category, 'es', 'en').name).toBe('Cocina')
  })

  it('falls back to the slug when no translation exists', () => {
    expect(localizeCategory({ slug: 'misc' }, 'en', 'en').name).toBe('misc')
  })
})
