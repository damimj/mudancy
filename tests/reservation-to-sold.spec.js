import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/adminAuth.js'
import { uniqueTitle } from './helpers/testData.js'
import { createTestProduct, deleteProductById } from './helpers/supabaseTestClient.js'

test.describe('Full lifecycle: visitor reserves, admin marks sold', () => {
  test('status transitions from available to reserved to sold, on both the public site and the admin panel', async ({
    page,
  }) => {
    const title = uniqueTitle('Lifecycle Product')
    const product = await createTestProduct({ title, price: 999 })

    try {
      // 1. Starts out available, on both the product page and the home grid.
      await page.goto(`/product/${product.id}`)
      await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'available')

      await page.goto('/')
      let card = page.getByTestId('product-card').filter({ hasText: title })
      await expect(card.getByTestId('status-badge')).toHaveAttribute('data-status', 'available')

      // 2. A visitor reserves it from the product page.
      await page.goto(`/product/${product.id}`)
      await page.getByTestId('reserve-button').click()
      await page.getByTestId('reserve-first-name').fill('Pete')
      await page.getByTestId('reserve-last-name').fill('Smith')
      await page.getByTestId('reserve-phone').fill('+15550100222')
      await page.getByTestId('reserve-submit').click()
      await expect(page.getByTestId('reserve-success')).toBeVisible()
      await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'reserved')
      await expect(page.getByTestId('reserve-button')).toBeDisabled()

      // 3. It shows as reserved on the home grid too.
      await page.goto('/')
      card = page.getByTestId('product-card').filter({ hasText: title })
      await expect(card.getByTestId('status-badge')).toHaveAttribute('data-status', 'reserved')

      // 4. The admin sees it as reserved, with the buyer's contact info.
      await loginAsAdmin(page)
      const row = page.getByTestId('admin-product-row').filter({ hasText: title })
      await expect(row.getByTestId('status-badge')).toHaveAttribute('data-status', 'reserved')
      await expect(row.getByTestId('admin-reserved-by')).toContainText('Pete Smith')
      await expect(row.getByTestId('admin-reserved-by')).toContainText('+15550100222')

      // 5. The admin marks it as sold.
      await row.getByTestId('admin-mark-sold').click()
      await expect(row.getByTestId('status-badge')).toHaveAttribute('data-status', 'sold')

      // 6. It shows as sold on the public product page and the home grid.
      await page.goto(`/product/${product.id}`)
      await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'sold')
      await expect(page.getByTestId('reserve-button')).toBeDisabled()

      await page.goto('/')
      card = page.getByTestId('product-card').filter({ hasText: title })
      await expect(card.getByTestId('status-badge')).toHaveAttribute('data-status', 'sold')
    } finally {
      await deleteProductById(product.id)
    }
  })
})
