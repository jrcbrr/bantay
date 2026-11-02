import { createHashRouter, Navigate } from 'react-router'
import { Shell } from './Shell.tsx'
import { HomePage } from '@/features/home/HomePage.tsx'
import { ActivityPage } from '@/features/activity/ActivityPage.tsx'
import { PlanPage } from '@/features/plan/PlanPage.tsx'
import { WealthPage } from '@/features/wealth/WealthPage.tsx'
import { SettingsPage } from '@/features/settings/SettingsPage.tsx'
import { CategoriesPage } from '@/features/categories/CategoriesPage.tsx'
import { TemplatesPage } from '@/features/templates/TemplatesPage.tsx'
import { InsightsPage } from '@/features/insights/InsightsPage.tsx'

// Hash routing so deep links work on GitHub Pages and fully offline.
export const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'wealth', element: <WealthPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/categories', element: <CategoriesPage /> },
      { path: 'settings/templates', element: <TemplatesPage /> },
      // Old routes from before the rework
      { path: 'budget', element: <Navigate to="/plan" replace /> },
      { path: 'wallets', element: <Navigate to="/wealth" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
