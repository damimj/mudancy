import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/adminAuth.js'
import { uniqueTitle } from './helpers/testData.js'
import { createTestProduct, deleteProductById, deleteProductsByTitle } from './helpers/supabaseTestClient.js'

test.describe('Translated products', () => {
  test('a product shows its title in the visitor language and falls back when a translation is missing', async ({
    page,
  }) => {
    const english = uniqueTitle('Bilingual Chair EN')
    const spanish = uniqueTitle('Bilingual Chair ES')
    const onlyEnglish = uniqueTitle('English Only Lamp')

    const bilingual = await createTestProduct({
      translations: { en: { title: english }, es: { title: spanish } },
    })
    const single = await createTestProduct({ translations: { en: { title: onlyEnglish } } })

    try {
      await page.goto('/')
      await expect(page.getByTestId('product-card').filter({ hasText: english })).toBeVisible()
      await expect(page.getByTestId('product-card').filter({ hasText: spanish })).toHaveCount(0)

      await page.getByTestId('lang-es').click()
      await expect(page.getByTestId('product-card').filter({ hasText: spanish })).toBeVisible()
      await expect(page.getByTestId('product-card').filter({ hasText: english })).toHaveCount(0)
      // No Spanish text for this one: it still appears, in English.
      await expect(page.getByTestId('product-card').filter({ hasText: onlyEnglish })).toBeVisible()

      await page.goto(`/product/${bilingual.id}`)
      await expect(page.getByTestId('product-title')).toHaveText(spanish)
      await page.getByTestId('lang-en').click()
      await expect(page.getByTestId('product-title')).toHaveText(english)
    } finally {
      await deleteProductById(bilingual.id)
      await deleteProductById(single.id)
    }
  })

  test('the admin form saves one translation per language', async ({ page }) => {
    const english = uniqueTitle('Form Desk EN')
    const spanish = uniqueTitle('Form Desk ES')

    try {
      await loginAsAdmin(page)
      await page.goto('/admin/products/new')
      await page.getByTestId('form-price').fill('50')

      await page.getByTestId('form-lang-en').click()
      await page.getByTestId('form-title').fill(english)
      await page.getByTestId('form-description').fill('English description')

      await page.getByTestId('form-lang-es').click()
      await expect(page.getByTestId('form-title')).toHaveValue('')
      await page.getByTestId('form-title').fill(spanish)
      await page.getByTestId('form-description').fill('Descripción en español')

      await page.getByTestId('form-save').click()
      await expect(page).toHaveURL(/\/admin$/)
      await expect(page.getByTestId('admin-product-row').filter({ hasText: english })).toBeVisible()

      // Re-open the product: both languages were stored.
      await page.getByTestId('admin-product-row').filter({ hasText: english }).getByTestId('admin-edit-link').click()
      await page.getByTestId('form-lang-en').click()
      await expect(page.getByTestId('form-title')).toHaveValue(english)
      await page.getByTestId('form-lang-es').click()
      await expect(page.getByTestId('form-title')).toHaveValue(spanish)
      await expect(page.getByTestId('form-description')).toHaveValue('Descripción en español')
    } finally {
      await deleteProductsByTitle(english)
    }
  })

  test('a title in just one language is enough to save', async ({ page }) => {
    const spanish = uniqueTitle('Solo Español')

    try {
      await loginAsAdmin(page)
      await page.goto('/admin/products/new')
      await page.getByTestId('form-price').fill('10')
      await page.getByTestId('form-lang-es').click()
      await page.getByTestId('form-title').fill(spanish)
      await page.getByTestId('form-save').click()
      await expect(page).toHaveURL(/\/admin$/)
      // The admin UI is in English and has no English text: falls back to Spanish.
      await expect(page.getByTestId('admin-product-row').filter({ hasText: spanish })).toBeVisible()
    } finally {
      await deleteProductsByTitle(spanish)
    }
  })
})
