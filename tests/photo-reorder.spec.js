import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/adminAuth.js'
import { uniqueTitle } from './helpers/testData.js'
import { createTestProduct, deleteProductById } from './helpers/supabaseTestClient.js'

// Three distinct, always-loadable image URLs (same-origin, differing only by
// query string) so no real uploads are needed.
const PHOTO_A = '/favicon.svg?photo=a'
const PHOTO_B = '/favicon.svg?photo=b'
const PHOTO_C = '/favicon.svg?photo=c'

async function photoOrder(page) {
  return page.getByTestId('form-photo').evaluateAll((els) => els.map((el) => el.dataset.photoUrl.split('photo=')[1]))
}

async function expectOrder(page, expected) {
  await expect.poll(() => photoOrder(page)).toEqual(expected)
}

// Picks up the photo at `index` with the keyboard and moves it `steps` places
// to the left (negative = right), then drops it.
async function moveWithKeyboard(page, index, steps) {
  await page.getByTestId('form-photo').nth(index).focus()
  await page.keyboard.press('Space')
  const key = steps > 0 ? 'ArrowLeft' : 'ArrowRight'
  for (let i = 0; i < Math.abs(steps); i++) {
    await page.waitForTimeout(150)
    await page.keyboard.press(key)
  }
  await page.waitForTimeout(150)
  await page.keyboard.press('Space')
}

test.describe('Reordering product photos in the admin', () => {
  let product
  let title

  test.beforeEach(async ({ page }) => {
    title = uniqueTitle('Photo Order Product')
    product = await createTestProduct({ title, images: [PHOTO_A, PHOTO_B, PHOTO_C] })
    await loginAsAdmin(page)
    await page.goto(`/admin/products/${product.id}/edit`)
    await expectOrder(page, ['a', 'b', 'c'])
  })

  test.afterEach(async () => {
    if (product) await deleteProductById(product.id)
  })

  test('moving the last photo to the first place with the keyboard persists and becomes the cover', async ({
    page,
  }) => {
    await moveWithKeyboard(page, 2, 2)
    await expectOrder(page, ['c', 'a', 'b'])
    await expect(page.getByTestId('form-photo').first()).toContainText('Cover')

    await page.getByTestId('form-save').click()
    await expect(page).toHaveURL(/\/admin$/)

    // The order was saved with the product...
    await page.goto(`/admin/products/${product.id}/edit`)
    await expectOrder(page, ['c', 'a', 'b'])

    // ...and the new first photo is the cover on the product page and the grid.
    await page.goto(`/product/${product.id}`)
    await expect(page.getByAltText(title)).toHaveAttribute('src', /photo=c$/)

    await page.goto('/')
    const cardImage = page.getByTestId('product-card').filter({ hasText: title }).locator('img').first()
    await expect(cardImage).toHaveAttribute('src', /photo=c$/)
  })

  test('dragging a photo with the mouse reorders it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse dragging is a desktop interaction; touch and keyboard are covered separately.')

    const photos = page.getByTestId('form-photo')
    // Mouse coordinates are viewport-relative: the photos sit below the fold
    // on a 720px-high window, so scroll them into view before measuring.
    await photos.nth(2).scrollIntoViewIfNeeded()
    const from = await photos.nth(2).boundingBox()
    const to = await photos.nth(0).boundingBox()
    const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

    await page.mouse.move(center(from).x, center(from).y)
    await page.mouse.down()
    await page.mouse.move(center(from).x - 12, center(from).y, { steps: 5 })
    await page.mouse.move(center(to).x - 10, center(to).y, { steps: 15 })
    await page.mouse.up()

    await expectOrder(page, ['c', 'a', 'b'])
  })

  test('removing a photo with the × button works and does not start a drag', async ({ page }) => {
    await page.getByTestId('form-photo').nth(1).getByTestId('form-photo-remove').click()
    await expectOrder(page, ['a', 'c'])
  })

  test('the first photo is labelled as the cover', async ({ page }) => {
    await expect(page.getByTestId('form-photo').nth(0)).toContainText('Cover')
    await expect(page.getByTestId('form-photo').nth(1)).not.toContainText('Cover')
  })
})
