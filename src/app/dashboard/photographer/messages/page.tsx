import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadConversations, loadThread } from '@/lib/chat'
import { markConversationRead } from '@/lib/actions/chat'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesView } from '@/components/chat/messages-view'

export default async function PhotographerMessagesPage({
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

  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('has_signed_contract')
    .eq('user_id', user.id)
    .single()

  if (!photographerProfile) redirect('/dashboard/photographer')

  if (!photographerProfile.has_signed_contract) {
    redirect('/onboarding/photographer/contract')
  }

  const conversations = await loadConversations(supabase, 'photographer', user.id)
  const selected = conversations.find((c) => c.id === conversation) ?? null
  const initialMessages = selected ? await loadThread(supabase, selected.id) : []
  if (selected) await markConversationRead(selected.id)

  return (
    <>
      <PageHeader
        title="Messages"
        description="Talk to your clients about their sessions."
      />
      <MessagesView
        basePath="/dashboard/photographer/messages"
        currentUserId={user.id}
        conversations={conversations}
        selected={selected}
        initialMessages={initialMessages}
        emptyText="No chats yet. When a client messages you, the chat shows up here."
      />
    </>
  )
}
