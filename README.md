<div align="center">
  <img src="public/icon.svg" width="88" alt="Bantay" />
  <h1>Bantay</h1>
  <p>An offline-first personal budget tracker. No account, no cloud — your money stays on your device.</p>
</div>

## Features

- **Wallets** — cash, GCash, banks, credit cards; spending deducts from the account that paid
- **Quick add** with templates (baon, fare, lunch)
- **Safe to spend today** — what's left until your next baon, spread across the remaining days
- **Liquid glass UI** in light and dark, installable as an app, works without internet

On the roadmap: budgets & goals, recurring bills & subscriptions, credit card installments, debts & IOUs, natural-language entry (`mcdo 189 cash`), insights, backup & PIN lock.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Dexie (IndexedDB) · Motion · vite-plugin-pwa · Vitest

```
src/
  app/        shell, routing, theme
  ui/         glass design system
  domain/     pure money logic (balances, allowance cycle, safe-to-spend) — unit tested
  db/         Dexie schema, seed data, live-query hooks
  features/   home · activity · quick-add · budget · wallets · settings
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/bantay/
npm test
npm run build
```
