import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadConversations, loadThread } from '@/lib/chat'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesView } from '@/components/chat/messages-view'

export default async function ClientMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>
}) {
  const { booking } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const conversations = await loadConversations(supabase, 'client', user.id)
  const selected = conversations.find((c) => c.id === booking) ?? null
  const initialMessages = selected ? await loadThread(supabase, selected.id) : []

  return (
    <>
      <PageHeader
        title="Messages"
        description="Talk to your photographer about your session."
      />
      <MessagesView
        basePath="/dashboard/client/messages"
        currentUserId={user.id}
        conversations={conversations}
        selected={selected}
        initialMessages={initialMessages}
        emptyText="No chats yet. A chat with your photographer opens here as soon as they confirm your booking."
      />
    </>
  )
}
