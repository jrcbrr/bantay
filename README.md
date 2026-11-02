<div align="center">
  <img src="public/icon.svg" width="88" alt="Bantay" />
  <h1>Bantay</h1>
  <p>An offline-first personal budget tracker. No account, no cloud — your money stays on your device.</p>
</div>

## Features

- **Dashboard**: cards you can reorder and hide, including balance, safe to spend, a 30-day forecast, money flow, budgets, upcoming bills, spendable vs savings, and net worth
- **Safe to spend today**: what's left until your next baon, after setting aside bills due before then
- **Privacy mode**: one tap hides every amount as `₱****`
- **Plan**: weekly or monthly category budgets, savings goals, and recurring bills and subscriptions with one-tap "Paid"
- **Wealth**: accounts grouped into spendable, savings, and credit; an assets tracker with gain or loss against what you paid
- **Activity**: search, filters, a calendar view, and a receipts inbox where you snap now and log later
- **Liquid glass UI** in light and dark mode, installable, works fully offline

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Dexie (IndexedDB) · Motion · vite-plugin-pwa · Vitest

```
src/
  app/        shell, routing, theme
  ui/         glass design system
  domain/     pure logic: balances, baon cycle, safe-to-spend, budgets, bills,
              forecast, search, calendar, assets (all unit tested)
  db/         Dexie schema + migrations, seed data, live-query hooks, actions
  features/   home (dashboard) · activity · receipts · quick-add · plan · wealth · categories · settings
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/bantay/
npm test
npm run build
```
