import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PHOTOGRAPHER_TERMS_PATH, needsTermsAcceptance } from '@/lib/photographer-terms'
import { loadConversations, loadThread } from '@/lib/chat'
import { markConversationRead } from '@/lib/actions/chat'
import { PageHeader } from '@/components/dashboard/page-header'
import { MessagesView } from '@/components/chat/messages-view'
import { MessageTemplatesManager } from '@/components/chat/message-templates-manager'

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
    .select('has_signed_contract, terms_version')
    .eq('user_id', user.id)
    .single()

  if (!photographerProfile) redirect('/dashboard/photographer')

  if (needsTermsAcceptance(photographerProfile)) {
    redirect(PHOTOGRAPHER_TERMS_PATH)
  }

  const conversations = await loadConversations(supabase, 'photographer', user.id)
  const selected = conversations.find((c) => c.id === conversation) ?? null
  const initialMessages = selected ? await loadThread(supabase, selected.id) : []
  if (selected) await markConversationRead(selected.id)
  const { data: templates } = await supabase
    .from('message_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

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
        templates={templates ?? []}
      />
      <div className="mt-4">
        <MessageTemplatesManager userId={user.id} initialTemplates={templates ?? []} />
      </div>
    </>
  )
}
