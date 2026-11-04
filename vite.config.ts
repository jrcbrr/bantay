/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'
import cascadeLayers from '@csstools/postcss-cascade-layers'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'
import type { Plugin as PostcssPlugin } from 'postcss'
import { fileURLToPath, URL } from 'node:url'

// Oldest phones we support. Tailwind v4 on its own needs iOS 16.4+, so the CSS is
// rewritten below for these, and plugin-legacy adds JS polyfills.
const browsers = ['iOS >= 14', 'Safari >= 14', 'Chrome >= 80', 'ChromeAndroid >= 80', 'Samsung >= 13', 'Firefox >= 80']

// Older Safari/Chrome don't know `dvh`; put a `vh` line before it as a fallback.
const dvhFallback: PostcssPlugin = {
  postcssPlugin: 'dvh-fallback',
  Declaration(decl) {
    if (!decl.value.includes('dvh')) return
    const fallback = decl.value.replace(/dvh\b/g, 'vh')
    const prev = decl.prev()
    if (prev?.type === 'decl' && prev.prop === decl.prop && prev.value === fallback) return
    decl.cloneBefore({ value: fallback })
  },
}

// Served from https://<user>.github.io/bantay/
const base = process.env.BASE_PATH ?? '/bantay/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    legacy({ targets: browsers, modernTargets: browsers, modernPolyfills: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Bantay',
        short_name: 'Bantay',
        description: 'Offline-first personal budget tracker.',
        theme_color: '#0a0a0b',
        background_color: '#0a0a0b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  css: {
    // Browsers before iOS 15.4 / Chrome 99 ignore everything inside @layer, which is all of Tailwind v4.
    postcss: { plugins: [cascadeLayers(), dvhFallback] },
    lightningcss: { targets: browserslistToTargets(browserslist(browsers)) },
  },
  build: {
    // Lightning CSS lowers modern colors (oklch, color-mix), nesting, `inset`, etc. for the targets above.
    cssMinify: 'lightningcss',
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
