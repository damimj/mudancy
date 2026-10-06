import { test, expect } from '@playwright/test'
import { uniqueTitle } from './helpers/testData.js'
import { createTestProduct, deleteProductById, getCategoryIdBySlug } from './helpers/supabaseTestClient.js'

test.describe('Product grid and category filters', () => {
  let furnitureProduct
  let kitchenProduct
  const furnitureTitle = uniqueTitle('Grid Furniture Item')
  const kitchenTitle = uniqueTitle('Grid Kitchen Item')

  test.beforeAll(async () => {
    const furnitureCategoryId = await getCategoryIdBySlug('furniture')
    const kitchenCategoryId = await getCategoryIdBySlug('kitchen')
    furnitureProduct = await createTestProduct({ title: furnitureTitle, category_id: furnitureCategoryId })
    kitchenProduct = await createTestProduct({ title: kitchenTitle, category_id: kitchenCategoryId })
  })

  test.afterAll(async () => {
    await deleteProductById(furnitureProduct.id)
    await deleteProductById(kitchenProduct.id)
  })

  test('the grid shows products and the category filter chips are visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('product-grid')).toBeVisible()
    await expect(page.getByTestId('category-filter-all')).toBeVisible()
    await expect(page.getByTestId('category-filter-furniture')).toBeVisible()
    await expect(page.getByTestId('category-filter-kitchen')).toBeVisible()

    await expect(page.getByTestId('product-card').filter({ hasText: furnitureTitle })).toBeVisible()
    await expect(page.getByTestId('product-card').filter({ hasText: kitchenTitle })).toBeVisible()
  })

  test('selecting a category filters the grid to only that category', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('category-filter-furniture').click()

    await expect(page.getByTestId('product-card').filter({ hasText: furnitureTitle })).toBeVisible()
    await expect(page.getByTestId('product-card').filter({ hasText: kitchenTitle })).toHaveCount(0)
  })

  test('selecting "All" again shows every category\'s products', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('category-filter-kitchen').click()
    await expect(page.getByTestId('product-card').filter({ hasText: furnitureTitle })).toHaveCount(0)

    await page.getByTestId('category-filter-all').click()
    await expect(page.getByTestId('product-card').filter({ hasText: furnitureTitle })).toBeVisible()
    await expect(page.getByTestId('product-card').filter({ hasText: kitchenTitle })).toBeVisible()
  })

  test('the page never scrolls horizontally, at the current viewport size', async ({ page }) => {
    await page.goto('/')
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  test('clicking a product card from the grid opens its product page', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('product-card').filter({ hasText: furnitureTitle }).click()
    await expect(page.getByTestId('product-title')).toHaveText(furnitureTitle)
  })
})
