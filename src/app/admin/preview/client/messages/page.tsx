import { requireAdmin } from '@/lib/admin'
import { PREVIEW_BASE } from '@/lib/routing'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesView } from '@/components/chat/messages-view'
import { previewThread, viewers } from '@/app/admin/preview/preview-data'

export default async function ClientMessagesPreview({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>
}) {
  await requireAdmin()
  const { userId, conversations } = viewers.client
  const { selected, messages } = previewThread(conversations, (await searchParams).booking)
  return (
    <>
      <PageHeader title="Messages" description="Talk to your photographer about your session." />
      <MessagesView
        basePath={`${PREVIEW_BASE.client}/messages`}
        currentUserId={userId}
        conversations={conversations}
        selected={selected}
        initialMessages={messages}
        emptyText="No chats yet. A chat with your photographer opens here as soon as they confirm your booking."
      />
    </>
  )
}
