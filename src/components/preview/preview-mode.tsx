'use client'

import { createContext, useContext } from 'react'
import { DASHBOARD_BASE, PREVIEW_BASE } from '@/lib/routing'
import type { UserRole } from '@/types/database'

// Only the admin preview (/admin/preview/**) renders the provider. Inside it,
// the real dashboard components skip every write, realtime subscription and
// trackEvent and change only their local state. Outside it (real users)
// nothing changes.
const PreviewModeContext = createContext(false)

export function PreviewModeProvider({ children }: { children: React.ReactNode }) {
  return <PreviewModeContext value={true}>{children}</PreviewModeContext>
}

export function usePreviewMode(): boolean {
  return useContext(PreviewModeContext)
}

// Base path for in-app links, so preview links stay inside the preview.
export function useDashboardBase(role: UserRole): string {
  return usePreviewMode() ? PREVIEW_BASE[role] : DASHBOARD_BASE[role]
}
