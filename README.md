<div align="center">
  <img src="public/icon.svg" width="88" alt="Bantay" />
  <h1>Bantay</h1>
  <p><b>Your money, watched closely.</b><br/>An offline-first personal budget tracker. No account, no cloud: your data stays on your device.</p>
  <p>
    <a href="https://jrcbrr.github.io/bantay/"><b>Open the app →</b></a>
  </p>
  <p>
    <img alt="CI" src="https://github.com/jrcbrr/bantay/actions/workflows/ci.yml/badge.svg" />
    <img alt="Deploy" src="https://github.com/jrcbrr/bantay/actions/workflows/deploy.yml/badge.svg" />
  </p>
</div>

## Features

**Everyday**
- **Quick add** with account and category chips, templates for one-tap entries, and **auto-categorize rules** (type "jollibee" in the note and Meals gets picked; it learns from you)
- **Undo** after adding, editing, deleting or marking a bill paid
- **Editable quick templates** for things you log every day (baon, fare, lunch)
- **Safe to spend today**: what's left until your next baon, after setting aside bills due before then. The "No baon today" switch covers holidays and days without class.
- **Receipts inbox**: snap a receipt now and log it later. The photo stays attached to the transaction.

**Home dashboard**: cards you can reorder and hide (drag to reorder), covering balance, safe to spend, a 30-day forecast, money flow, budgets, upcoming bills, spendable vs savings, net worth, and recent activity.

**Plan**
- Weekly or monthly category budgets, each with its history
- **Event budgets** for field trips, Christmas or birthdays
- **Ipon challenge**: 52 weeks, daily, or custom, with a tick-off grid
- **Wishlist** with "days of saving" estimates, and a **Can I afford it?** check
- **Round-up savings**: spare change from each expense goes to savings
- Savings goals, either linked to an account or updated by hand, with milestone celebrations
- Recurring bills and subscriptions with one-tap *Paid*

**Wealth**
- Accounts grouped into spendable, savings, and credit
- Credit cards with due dates, credit limit, and installment plans (e.g. 12 months at 0%)
- Debts and IOUs, both ways, with partial repayments
- An assets tracker showing gain or loss against what you paid

**Insights**: monthly recap and year in review, where your money went, trends vs last month, income vs spending charts, baon by week, cost per school day, biggest expenses, and no-spend streaks

**Activity**: search (notes, categories, accounts, amounts), filters, and a calendar view with daily totals

**Privacy and safety**
- Privacy mode hides every amount as `₱****`
- PIN lock, stored as a PBKDF2 hash. It keeps others out but doesn't encrypt your data.
- JSON backup and restore (validated before anything is replaced) and CSV export for spreadsheets
- **Archive old years** into summaries to keep the app fast. Balances stay exact.

Liquid glass UI in light and dark mode with a choice of accent colors. Installable, and works fully offline.

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · Dexie (IndexedDB) · Zustand · Motion · Zod · vite-plugin-pwa · Vitest

```
src/
  app/        shell, routing, theme, privacy mode, PIN lock, sheet state
  ui/         glass design system and form primitives
  domain/     pure logic, all unit tested:
              balances · baon cycle · safe to spend · budgets · recurring bills
              forecast · search · calendar · assets · credit & debts
  db/         Dexie schema and migrations, seed data, live-query hooks,
              actions, backup format
  features/   home · activity · receipts · quick-add · plan · wealth
              categories · templates · settings
```

All money is stored as whole centavos, so totals never drift by a centavo. Business rules live in `domain/` as plain functions with no React or database code, which keeps them easy to test.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/bantay/
npm test
npm run build
```

Every push to `main` runs CI (typecheck, lint, tests, build) and deploys to GitHub Pages.

## Made by

**John Rudolph**

- Email: [johnrudolph2010@gmail.com](mailto:johnrudolph2010@gmail.com)
- Instagram: [@jrcbrr_](https://instagram.com/jrcbrr_)
