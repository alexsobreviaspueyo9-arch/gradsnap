import { PreviewBar } from '@/components/admin/preview-bar'

export default function ClientPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PreviewBar role="client" />
      {children}
    </>
  )
}
