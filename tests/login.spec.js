import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/adminAuth.js'

test.describe('Admin login', () => {
  test('the login page asks for an email only: there is no password field', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByTestId('login-email')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
  })

  test('the login page can be switched to Spanish', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByTestId('lang-es').click()
    await expect(page.getByRole('heading', { name: 'Acceso de administrador' })).toBeVisible()
  })

  test('a signed-in admin reaches the panel, can switch language there, and can log out', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByTestId('admin-nav-products')).toHaveText('Products')

    await page.getByTestId('lang-es').click()
    await expect(page.getByTestId('admin-nav-products')).toHaveText('Productos')

    await page.getByTestId('admin-logout').click()
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
