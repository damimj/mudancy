import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/adminAuth.js'
import { uniqueTitle } from './helpers/testData.js'
import {
  createTestProduct,
  deleteProductById,
  deleteProductsByTitle,
  getCategoryIdBySlug,
} from './helpers/supabaseTestClient.js'

test.describe('Admin product CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('creates a product with all fields and it shows correctly in admin and on the public site', async ({
    page,
  }) => {
    const title = uniqueTitle('Full Product')
    const categoryId = await getCategoryIdBySlug('electronics')
    let productId

    try {
      await page.goto('/admin/products/new')
      await page.getByTestId('form-title').fill(title)
      await page.getByTestId('form-description').fill('A full description for the e2e test product.')
      await page.getByTestId('form-condition').fill('9 months old, like new')
      await page.getByTestId('form-available-from').fill('2026-11-01')
      await page.getByTestId('form-original-link').fill('https://example.com/product')
      await page.getByTestId('form-price').fill('4200')
      await page.getByTestId('form-category').selectOption(categoryId)
      await page.getByTestId('form-save').click()

      await expect(page).toHaveURL(/\/admin$/)
      const row = page.getByTestId('admin-product-row').filter({ hasText: title })
      await expect(row).toBeVisible()
      await expect(row.getByTestId('status-badge')).toHaveAttribute('data-status', 'available')
      await expect(row).toContainText('4,200')

      // Grab the id so we can clean up even if a later assertion fails.
      productId = await row.getAttribute('data-product-id')

      // Verify on the public site too.
      await page.goto('/')
      const card = page.getByTestId('product-card').filter({ hasText: title })
      await expect(card).toBeVisible()
      await card.click()

      await expect(page).toHaveURL(new RegExp(`/product/${productId}`))
      await expect(page.getByTestId('product-title')).toHaveText(title)
      await expect(page.getByTestId('product-price')).toContainText('4,200')
      await expect(page.getByTestId('product-available-from')).toContainText('Nov 1, 2026')
      await expect(page.getByTestId('product-condition')).toContainText('9 months old, like new')
      await expect(page.getByTestId('product-description')).toContainText('A full description')
      const link = page.getByTestId('original-link')
      await expect(link).toHaveAttribute('href', 'https://example.com/product')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(page.getByTestId('reserve-button')).toBeEnabled()
    } finally {
      await deleteProductsByTitle(title)
    }
  })

  test('edits an existing product and the changes persist', async ({ page }) => {
    const originalTitle = uniqueTitle('Editable Product')
    const updatedTitle = uniqueTitle('Edited Product')
    const categoryBefore = await getCategoryIdBySlug('furniture')
    const categoryAfter = await getCategoryIdBySlug('kitchen')

    const product = await createTestProduct({
      title: originalTitle,
      price: 500,
      category_id: categoryBefore,
    })

    try {
      await page.goto(`/admin/products/${product.id}/edit`)
      await expect(page.getByTestId('form-title')).toHaveValue(originalTitle)

      await page.getByTestId('form-title').fill(updatedTitle)
      await page.getByTestId('form-price').fill('750')
      await page.getByTestId('form-category').selectOption(categoryAfter)
      await page.getByTestId('form-save').click()

      await expect(page).toHaveURL(/\/admin$/)
      const row = page.getByTestId('admin-product-row').filter({ hasText: updatedTitle })
      await expect(row).toBeVisible()
      await expect(row).toContainText('750')
      await expect(page.getByTestId('admin-product-row').filter({ hasText: originalTitle })).toHaveCount(0)

      // Re-open the edit form and confirm the category change was saved.
      await row.getByTestId('admin-edit-link').click()
      await expect(page.getByTestId('form-category')).toHaveValue(categoryAfter)
    } finally {
      await deleteProductById(product.id)
    }
  })

  test('deletes a product from the admin list', async ({ page }) => {
    const title = uniqueTitle('Deletable Product')
    const product = await createTestProduct({ title })

    try {
      await page.goto('/admin')
      const row = page.getByTestId('admin-product-row').filter({ hasText: title })
      await expect(row).toBeVisible()

      page.once('dialog', (dialog) => dialog.accept())
      await row.getByTestId('admin-delete-button').click()

      await expect(page.getByTestId('admin-product-row').filter({ hasText: title })).toHaveCount(0)

      // And it's gone from the public catalog too.
      await page.goto('/')
      await expect(page.getByTestId('product-card').filter({ hasText: title })).toHaveCount(0)
    } finally {
      // Normally already deleted through the UI; this only matters if that failed.
      await deleteProductById(product.id)
    }
  })

  test('blocks submitting the form without a title', async ({ page }) => {
    await page.goto('/admin/products/new')
    await page.getByTestId('form-price').fill('100')
    await page.getByTestId('form-save').click()

    // Native HTML5 validation blocks the submit — we never navigate away.
    await expect(page).toHaveURL(/\/admin\/products\/new$/)
    const isValid = await page.getByTestId('form-title').evaluate((el) => el.checkValidity())
    expect(isValid).toBe(false)
  })

  test('blocks submitting the form without a price', async ({ page }) => {
    await page.goto('/admin/products/new')
    await page.getByTestId('form-title').fill(uniqueTitle('No Price Product'))
    await page.getByTestId('form-save').click()

    await expect(page).toHaveURL(/\/admin\/products\/new$/)
    const isValid = await page.getByTestId('form-price').evaluate((el) => el.checkValidity())
    expect(isValid).toBe(false)
  })

  test('rejects a negative price', async ({ page }) => {
    await page.goto('/admin/products/new')
    await page.getByTestId('form-title').fill(uniqueTitle('Negative Price Product'))
    await page.getByTestId('form-price').fill('-50')
    await page.getByTestId('form-save').click()

    await expect(page).toHaveURL(/\/admin\/products\/new$/)
    const isValid = await page.getByTestId('form-price').evaluate((el) => el.checkValidity())
    expect(isValid).toBe(false)
  })

  test('rejects an invalid original link but accepts a valid one', async ({ page }) => {
    await page.goto('/admin/products/new')
    await page.getByTestId('form-title').fill(uniqueTitle('Link Validation Product'))
    await page.getByTestId('form-price').fill('100')

    await page.getByTestId('form-original-link').fill('not-a-url')
    let isValid = await page.getByTestId('form-original-link').evaluate((el) => el.checkValidity())
    expect(isValid).toBe(false)

    await page.getByTestId('form-original-link').fill('https://www.ikea.com/cz/en/p/example')
    isValid = await page.getByTestId('form-original-link').evaluate((el) => el.checkValidity())
    expect(isValid).toBe(true)
  })

  test('allows the form to be submitted without optional fields', async ({ page }) => {
    const title = uniqueTitle('Minimal Product')

    try {
      await page.goto('/admin/products/new')
      await page.getByTestId('form-title').fill(title)
      await page.getByTestId('form-price').fill('0')
      await page.getByTestId('form-save').click()

      await expect(page).toHaveURL(/\/admin$/)
      const row = page.getByTestId('admin-product-row').filter({ hasText: title })
      await expect(row).toBeVisible()
    } finally {
      await deleteProductsByTitle(title)
    }
  })
})
