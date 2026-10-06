import { test, expect } from '@playwright/test'

test('home page loads and shows the brand and language switcher', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Mudancy' })).toBeVisible()
  await expect(page.getByTestId('lang-es')).toBeVisible()
  await expect(page.getByTestId('lang-en')).toBeVisible()
})

test('language switcher toggles UI text to Spanish and the choice survives a reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('category-filter-all')).toHaveText('All')

  await page.getByTestId('lang-es').click()
  await expect(page.getByTestId('category-filter-all')).toHaveText('Todo')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')

  await page.reload()
  await expect(page.getByTestId('category-filter-all')).toHaveText('Todo')
})

test('admin routes redirect to login when signed out', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})
