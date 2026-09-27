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
      €${input.depositAmount.toFixed(2)} deposit.</p>
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
      balance of <strong>€${input.balanceAmount.toFixed(2)}</strong> is now due.</p>
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
      €${input.balanceAmount.toFixed(2)} balance. This booking is now fully paid.</p>
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
      €${input.depositAmount.toFixed(2)} deposit has been refunded in full and
      should appear on your statement in a few business days.</p>
    `),
  }
}
