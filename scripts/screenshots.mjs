// Takes phone-sized screenshots of the built app (used by the screenshots workflow).
// Usage: node scripts/screenshots.mjs http://localhost:4173/bantay/ out-dir
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:4173/bantay/'
const out = process.argv[3] ?? 'shots'
mkdirSync(out, { recursive: true })

const phones = [
  { name: 'small-360', width: 360, height: 760 },
  { name: 'regular-412', width: 412, height: 900 },
]
const pages = ['', 'activity', 'plan', 'wealth', 'insights', 'settings']

const browser = await chromium.launch()
for (const phone of phones) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({
      viewport: { width: phone.width, height: phone.height },
      deviceScaleFactor: 2,
      colorScheme: scheme,
      hasTouch: true,
      isMobile: true,
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    // Add a little sample data so cards aren't empty.
    if (scheme === 'light') {
      for (const [amount, chip] of [['150', 'Baon'], ['189', 'Meals'], ['13', 'Transport']]) {
        await page.getByRole('button', { name: 'Add transaction' }).last().click()
        if (chip === 'Baon') await page.getByRole('button', { name: 'Income', exact: true }).click()
        await page.getByPlaceholder('0', { exact: true }).fill(amount)
        await page.getByRole('button', { name: chip, exact: true }).last().click()
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await page.waitForTimeout(400)
      }
    }

    for (const p of pages) {
      await page.goto(`${base}#/${p}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${out}/${phone.name}-${scheme}-${p || 'home'}.png`, fullPage: true })
    }
    // The + sheet
    await page.goto(`${base}#/`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Add transaction' }).last().click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${out}/${phone.name}-${scheme}-add.png` })
    if (errors.length) console.log(phone.name, scheme, 'page errors:', errors)
    await ctx.close()
  }
}
await browser.close()
console.log('done')
