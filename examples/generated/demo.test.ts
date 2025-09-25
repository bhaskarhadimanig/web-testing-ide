import { test, expect, Page, Browser } from '@playwright/test'

test.describe('Demo Recording Phase 2', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize({"width":1280,"height":720})
  })

  test('Demo Recording Phase 2', async () => {
    await page.goto('https://demo.playwright.dev', { timeout: 30000 })
    await page.click('text=Get started', { timeout: 30000 })
    await page.goto('https://demo.playwright.dev/docs/intro', { timeout: 30000 })
  })
})
