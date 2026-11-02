import { createHashRouter } from 'react-router'
import { Shell } from './Shell.tsx'
import { HomePage } from '@/features/home/HomePage.tsx'
import { ActivityPage } from '@/features/activity/ActivityPage.tsx'
import { BudgetPage } from '@/features/budget/BudgetPage.tsx'
import { WalletsPage } from '@/features/wallets/WalletsPage.tsx'
import { SettingsPage } from '@/features/settings/SettingsPage.tsx'
import { CategoriesPage } from '@/features/categories/CategoriesPage.tsx'

// Hash routing so deep links work on GitHub Pages and fully offline.
export const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'budget', element: <BudgetPage /> },
      { path: 'wallets', element: <WalletsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/categories', element: <CategoriesPage /> },
    ],
  },
])
