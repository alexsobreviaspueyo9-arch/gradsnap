import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadConversations, loadThread } from '@/lib/chat'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesView } from '@/components/chat/messages-view'

export default async function PhotographerMessagesPage({
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
  const selected = conversations.find((c) => c.id === booking) ?? null
  const initialMessages = selected ? await loadThread(supabase, selected.id) : []

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
        emptyText="No chats yet. When you confirm a booking, a chat with that client opens here."
      />
    </>
  )
}
