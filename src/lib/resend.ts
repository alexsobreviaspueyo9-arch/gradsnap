import { Resend } from 'resend'

// gradsnap.app is verified in Resend; the same sender is used by Supabase SMTP.
const FROM = 'GradSnap <no-reply@gradsnap.app>'

export async function sendEmail(input: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const { error } = await resend.emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  })

  if (error) {
    console.error('Resend send failed:', error)
  }
}
