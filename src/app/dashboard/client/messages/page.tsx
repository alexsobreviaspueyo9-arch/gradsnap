import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadConversations, loadThread } from '@/lib/chat'
import { markConversationRead } from '@/lib/actions/chat'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesView } from '@/components/chat/messages-view'

export default async function ClientMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>
}) {
  const { conversation } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const conversations = await loadConversations(supabase, 'client', user.id)
  const selected = conversations.find((c) => c.id === conversation) ?? null
  const initialMessages = selected ? await loadThread(supabase, selected.id) : []
  if (selected) await markConversationRead(selected.id)

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
        emptyText="No chats yet. Use Message on a photographer's card or profile to start one."
      />
    </>
  )
}
