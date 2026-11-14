import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/resend'
import { newMessageEmail } from '@/lib/email-templates'
import { SITE_URL } from '@/lib/site'

function firstName(name: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || null
}

// Server only. claim_message_notification (service role) applies the rules:
// skip if the recipient already read the latest message, at most one email
// per conversation and recipient every 30 minutes. Never throws: a failed
// email must not affect the message, which is already saved.
export async function notifyMessageRecipient(messageId: string, senderId: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('claim_message_notification', {
      p_message_id: messageId,
      p_sender_id: senderId,
    })
    if (error) {
      console.error('Claiming message notification failed:', error)
      return
    }

    const target = data?.[0]
    if (!target?.recipient_email) return

    const email = newMessageEmail({
      recipientName: firstName(target.recipient_name) ?? 'there',
      senderName: firstName(target.sender_name) ?? 'Someone',
      link: `${SITE_URL}/dashboard/${target.recipient_role}/messages?conversation=${target.conversation_id}`,
    })
    await sendEmail({ to: target.recipient_email, ...email })
  } catch (err) {
    console.error('Message notification failed:', err)
  }
}
