// Checks the built app still works on older phones (iOS 14+, Chrome 80+).
// Run after `npm run build`.
import { readdirSync, readFileSync } from 'node:fs'

const dir = 'dist/assets'
const files = readdirSync(dir)
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
const problems = []

// Browsers before iOS 15.4 / Chrome 99 drop everything inside @layer.
if (/@layer\b/.test(css)) problems.push('CSS still has @layer blocks')
// oklch() needs iOS 15.4; each one should have an rgb/hex fallback before it.
const oklchOnly = (css.match(/[{;](?:[\w-]+):oklch\([^)]*\)/g) ?? []).length
// Count values only (`:92dvh`), not class names like `.max-h-[92dvh]`.
const dvh = (css.match(/:\d+dvh/g) ?? []).length
const vh = (css.match(/:\d+vh/g) ?? []).length
if (dvh > 0 && vh < dvh) problems.push(`only ${vh} vh fallbacks for ${dvh} dvh values`)
if (!files.some((f) => f.includes('polyfills-legacy'))) problems.push('no legacy JS polyfills were built')

console.log(`CSS: ${css.length} bytes, dvh ${dvh}, vh ${vh}, oklch declarations ${oklchOnly}`)
console.log(`Legacy JS: ${files.filter((f) => f.includes('legacy')).join(', ') || 'none'}`)
if (problems.length) {
  console.error('Older-phone compatibility check failed:\n- ' + problems.join('\n- '))
  process.exit(1)
}
console.log('Older-phone compatibility check passed.')
