import { test, expect } from '@playwright/test'
import { uniqueTitle } from './helpers/testData.js'
import { createTestProduct, deleteProductById } from './helpers/supabaseTestClient.js'

test.describe('Browsing and reserving a product', () => {
  test('navigating from the home grid to a product and reserving it', async ({ page }) => {
    const title = uniqueTitle('Reservable Product')
    const product = await createTestProduct({ title, price: 1234 })

    try {
      await page.goto('/')
      const card = page.getByTestId('product-card').filter({ hasText: title })
      await expect(card).toBeVisible()
      await expect(card.getByTestId('status-badge')).toHaveAttribute('data-status', 'available')

      await card.click()
      await expect(page).toHaveURL(new RegExp(`/product/${product.id}`))
      await expect(page.getByTestId('product-title')).toHaveText(title)
      await expect(page.getByTestId('product-price')).toContainText('1,234')

      const reserveButton = page.getByTestId('reserve-button')
      await expect(reserveButton).toBeEnabled()
      await reserveButton.click()

      await page.getByTestId('reserve-first-name').fill('Ana')
      await page.getByTestId('reserve-last-name').fill('García')
      await page.getByTestId('reserve-phone').fill('+15550100111')
      await page.getByTestId('reserve-submit').click()

      await expect(page.getByTestId('reserve-success')).toBeVisible()
      await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'reserved')
      await expect(reserveButton).toBeDisabled()
    } finally {
      await deleteProductById(product.id)
    }
  })

  test('the reservation form requires name, last name and phone', async ({ page }) => {
    const title = uniqueTitle('Validation Product')
    const product = await createTestProduct({ title })

    try {
      await page.goto(`/product/${product.id}`)
      await page.getByTestId('reserve-button').click()
      await page.getByTestId('reserve-submit').click()

      // No fields filled in — the form must not submit, and should stay open.
      await expect(page.getByTestId('reserve-first-name')).toBeVisible()
      await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'available')
    } finally {
      await deleteProductById(product.id)
    }
  })

  test('a reserved product cannot be reserved again', async ({ page }) => {
    const title = uniqueTitle('Already Reserved Product')
    const product = await createTestProduct({ title, status: 'reserved' })

    try {
      await page.goto(`/product/${product.id}`)
      await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'reserved')
      await expect(page.getByTestId('reserve-button')).toBeDisabled()
    } finally {
      await deleteProductById(product.id)
    }
  })
})
