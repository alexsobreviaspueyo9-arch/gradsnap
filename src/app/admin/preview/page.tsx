import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { PREVIEW_BASE } from '@/lib/routing'

export default async function PreviewIndexPage() {
  await requireAdmin()
  redirect(PREVIEW_BASE.photographer)
}
