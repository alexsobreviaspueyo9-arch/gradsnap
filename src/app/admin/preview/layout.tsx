import { PreviewModeProvider } from '@/components/preview/preview-mode'

// Everything under /admin/preview renders the real dashboard components in
// read-only preview mode (see components/preview/preview-mode.tsx).
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <PreviewModeProvider>{children}</PreviewModeProvider>
}
