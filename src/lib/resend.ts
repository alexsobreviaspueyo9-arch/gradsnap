import { Resend } from 'resend'

// TODO: switch to a verified domain sender once one is set up.
const FROM = 'GradSnap <onboarding@resend.dev>'

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
