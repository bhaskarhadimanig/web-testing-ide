import { test, expect } from '@playwright/test'

test.describe('Web Testing IDE', () => {
  test('should display welcome message', async ({ page }) => {
    await page.goto('https://demo.playwright.dev')
    await expect(page).toHaveTitle(/Playwright/)
  })

  test('should be able to navigate demo site', async ({ page }) => {
    await page.goto('https://demo.playwright.dev')
    await page.click('text=Get started')
    await expect(page).toHaveURL(/.*intro/)
  })
})
