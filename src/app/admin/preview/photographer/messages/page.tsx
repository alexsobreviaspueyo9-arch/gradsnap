import { requireAdmin } from '@/lib/admin'
import { PREVIEW_BASE } from '@/lib/routing'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesView } from '@/components/chat/messages-view'
import { previewThread, viewers } from '@/app/admin/preview/preview-data'

export default async function PhotographerMessagesPreview({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>
}) {
  await requireAdmin()
  const { userId, conversations } = viewers.photographer
  const { selected, messages } = previewThread(conversations, (await searchParams).booking)
  return (
    <>
      <PageHeader title="Messages" description="Talk to your clients about their sessions." />
      <MessagesView
        basePath={`${PREVIEW_BASE.photographer}/messages`}
        currentUserId={userId}
        conversations={conversations}
        selected={selected}
        initialMessages={messages}
        emptyText="No chats yet. When you confirm a booking, a chat with that client opens here."
      />
    </>
  )
}
