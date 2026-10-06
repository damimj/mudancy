import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/adminAuth.js'
import { uniqueTitle } from './helpers/testData.js'
import { createTestProduct, deleteProductById } from './helpers/supabaseTestClient.js'

// The header totals load asynchronously and expose their numeric value in a
// data-amount attribute once loaded. Wait for real numbers first, or "before"
// could capture a not-yet-loaded value and the comparisons below would be
// against the wrong baseline.
async function readTotals(page) {
  await expect(page.getByTestId('admin-stat-estimated')).toHaveAttribute('data-amount', /^\d/)
  await expect(page.getByTestId('admin-stat-sold')).toHaveAttribute('data-amount', /^\d/)
  return {
    estimated: Number(await page.getByTestId('admin-stat-estimated').getAttribute('data-amount')),
    sold: Number(await page.getByTestId('admin-stat-sold').getAttribute('data-amount')),
  }
}

test.describe('Admin preview button and totals', () => {
  test('the eye button opens the public product page in a new tab', async ({ page, context }) => {
    const title = uniqueTitle('Preview Product')
    const product = await createTestProduct({ title })

    try {
      await loginAsAdmin(page)
      const preview = page
        .getByTestId('admin-product-row')
        .filter({ hasText: title })
        .getByTestId('admin-preview-link')

      await expect(preview).toHaveAttribute('href', `/product/${product.id}`)
      await expect(preview).toHaveAttribute('target', '_blank')

      const [newTab] = await Promise.all([context.waitForEvent('page'), preview.click()])
      await expect(newTab).toHaveURL(new RegExp(`/product/${product.id}$`))
      await expect(newTab.getByTestId('product-title')).toHaveText(title)

      // The admin tab is left untouched.
      await expect(page).toHaveURL(/\/admin$/)
    } finally {
      await deleteProductById(product.id)
    }
  })

  test('shows both totals as currency amounts', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByTestId('admin-stat-estimated')).toHaveText(/^Estimated total: \$[\d,]+\.\d{2}$/)
    await expect(page.getByTestId('admin-stat-sold')).toHaveText(/^Sold total: \$[\d,]+\.\d{2}$/)
  })

  test('the totals sit to the left of the menu, with the sold total below the estimated total', async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 900, 'The header wraps onto several lines on narrow screens.')

    await loginAsAdmin(page)
    const estimated = await page.getByTestId('admin-stat-estimated').boundingBox()
    const sold = await page.getByTestId('admin-stat-sold').boundingBox()
    const productsLink = await page.getByTestId('admin-nav-products').boundingBox()

    expect(estimated.x + estimated.width).toBeLessThanOrEqual(productsLink.x)
    expect(sold.y).toBeGreaterThan(estimated.y)
  })

  test('the totals follow product prices and statuses, including delete', async ({ page }) => {
    const title = uniqueTitle('Totals Product')
    const price = 1234.5
    await loginAsAdmin(page)
    const before = await readTotals(page)

    const product = await createTestProduct({ title, price })

    try {
      // A new available product raises the estimated total only.
      await page.reload()
      await expect.poll(async () => (await readTotals(page)).estimated).toBeCloseTo(before.estimated + price, 2)
      expect((await readTotals(page)).sold).toBeCloseTo(before.sold, 2)

      // Marking it sold raises the sold total, live, and leaves the estimate alone.
      const row = page.getByTestId('admin-product-row').filter({ hasText: title })
      await row.getByTestId('admin-mark-sold').click()
      await expect.poll(async () => (await readTotals(page)).sold).toBeCloseTo(before.sold + price, 2)
      expect((await readTotals(page)).estimated).toBeCloseTo(before.estimated + price, 2)

      // Deleting it puts both totals back where they started.
      page.once('dialog', (dialog) => dialog.accept())
      await row.getByTestId('admin-delete-button').click()
      await expect.poll(async () => (await readTotals(page)).estimated).toBeCloseTo(before.estimated, 2)
      expect((await readTotals(page)).sold).toBeCloseTo(before.sold, 2)
    } finally {
      await deleteProductById(product.id)
    }
  })
})
