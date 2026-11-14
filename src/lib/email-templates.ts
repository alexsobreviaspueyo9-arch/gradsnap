import { formatDateHeading } from '@/lib/date'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

// Names are typed by users, so they must never reach the email as raw HTML.
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="margin-bottom: 4px;">GradSnap</h2>
      ${bodyHtml}
    </div>
  `
}

function sessionTime(date: string, startTime: string): string {
  return `${formatDateHeading(date)} at ${startTime.slice(0, 5)}`
}

export function newBookingRequestEmail(input: {
  photographerName: string
  clientName: string
  date: string
  startTime: string
  depositAmount: number
}): { subject: string; html: string } {
  return {
    subject: 'New booking request',
    html: wrapper(`
      <p>Hi ${escapeHtml(input.photographerName)},</p>
      <p><strong>${escapeHtml(input.clientName)}</strong> just booked a session with you on
      <strong>${sessionTime(input.date, input.startTime)}</strong> and paid a
      $${input.depositAmount.toFixed(2)} deposit.</p>
      <p>Confirm or cancel it from your GradSnap bookings dashboard.</p>
    `),
  }
}

export function bookingConfirmedEmail(input: {
  clientName: string
  photographerName: string
  date: string
  startTime: string
}): { subject: string; html: string } {
  return {
    subject: 'Your session is confirmed',
    html: wrapper(`
      <p>Hi ${escapeHtml(input.clientName)},</p>
      <p><strong>${escapeHtml(input.photographerName)}</strong> confirmed your session on
      <strong>${sessionTime(input.date, input.startTime)}</strong>.</p>
      <p>See you then!</p>
    `),
  }
}

export function sessionCompletedBalanceEmail(input: {
  clientName: string
  photographerName: string
  balanceAmount: number
  paymentLinkUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'Your session is complete — balance due',
    html: wrapper(`
      <p>Hi ${escapeHtml(input.clientName)},</p>
      <p>${escapeHtml(input.photographerName)} marked your session as complete. The remaining
      balance of <strong>$${input.balanceAmount.toFixed(2)}</strong> is now due.</p>
      <p><a href="${escapeHtml(input.paymentLinkUrl)}">Pay the remaining balance</a></p>
    `),
  }
}

export function balanceReceivedEmail(input: {
  photographerName: string
  clientName: string
  balanceAmount: number
}): { subject: string; html: string } {
  return {
    subject: 'Balance received',
    html: wrapper(`
      <p>Hi ${escapeHtml(input.photographerName)},</p>
      <p><strong>${escapeHtml(input.clientName)}</strong> just paid the remaining
      $${input.balanceAmount.toFixed(2)} balance. This booking is now fully paid.</p>
    `),
  }
}

export function bookingCancelledRefundedEmail(input: {
  clientName: string
  photographerName: string
  depositAmount: number
}): { subject: string; html: string } {
  return {
    subject: 'Booking cancelled — deposit refunded',
    html: wrapper(`
      <p>Hi ${escapeHtml(input.clientName)},</p>
      <p>${escapeHtml(input.photographerName)} cancelled your booking. Your
      $${input.depositAmount.toFixed(2)} deposit has been refunded in full and
      should appear on your statement in a few business days.</p>
    `),
  }
}

// Chat notification. Never includes the message itself, only who wrote.
export function newMessageEmail(input: {
  recipientName: string
  senderName: string
  link: string
}): { subject: string; html: string; text: string } {
  const sender = input.senderName.replace(/[\r\n]+/g, ' ')
  const senderHtml = escapeHtml(sender)
  const why = `You're getting this because ${sender} messaged you in your GradSnap inbox.`
  return {
    subject: `${sender} sent you a message on GradSnap`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1d1d1f;">
        <p style="margin: 0 0 24px; font-size: 20px; font-weight: 600;">GradSnap</p>
        <p style="margin: 0 0 12px; font-size: 16px;">Hi ${escapeHtml(input.recipientName)},</p>
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">
          ${senderHtml} sent you a new message on GradSnap. Don&#39;t leave them waiting &mdash; reply from your inbox.
        </p>
        <a href="${escapeHtml(input.link)}" style="display: inline-block; padding: 12px 24px; border-radius: 999px; background: #4d34d5; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">View message</a>
        <p style="margin: 32px 0 0; font-size: 12px; line-height: 1.5; color: #636366;">
          This is an automated message, please don&#39;t reply to this email.<br />
          ${escapeHtml(why)}
        </p>
      </div>
    `,
    text: [
      'GradSnap',
      '',
      `Hi ${input.recipientName},`,
      '',
      `${sender} sent you a new message on GradSnap. Don't leave them waiting — reply from your inbox.`,
      '',
      `View message: ${input.link}`,
      '',
      "This is an automated message, please don't reply to this email.",
      why,
    ].join('\n'),
  }
}
