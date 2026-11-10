import { PreviewBar } from '@/components/admin/preview-bar'

export default function PhotographerPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PreviewBar role="photographer" />
      {children}
    </>
  )
}
