import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = 'HouseShow <noreply@houseshow.net>'

interface BookingRequestEmailParams {
  to: string
  artistName: string
  proposedDate: string
  message?: string
  dealSummary: string
}

interface BookingDecisionEmailParams {
  to: string
  hostName: string
  artistName: string
  proposedDate: string
  decision: 'accepted' | 'declined'
}

export async function sendNewBookingRequestEmail(params: BookingRequestEmailParams) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured, skipping booking request email')
    return { success: false, error: 'Email not configured' }
  }

  const formattedDate = formatDate(params.proposedDate)

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `New booking request from ${params.artistName}`,
    html: `
      <div style="background:#1A1410;padding:24px;font-family:Arial,sans-serif;color:#F5F0E8;">
        <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,130,10,0.25);border-radius:12px;background:rgba(44,34,24,0.45);padding:24px;">
          <h1 style="margin:0 0 8px;font-size:26px;color:#F5F0E8;">New Booking Request</h1>
          <p style="margin:0 0 18px;color:#8C7B6B;">You have a new show request on HouseShow.</p>
          <div style="border:1px solid rgba(212,130,10,0.25);border-radius:10px;padding:16px;background:rgba(26,20,16,0.4);margin-bottom:18px;">
            <div style="color:#F0A500;font-weight:700;font-size:18px;margin-bottom:8px;">${params.artistName}</div>
            <div style="margin-bottom:6px;">Proposed date: ${formattedDate}</div>
            <div style="margin-bottom:6px;">${params.dealSummary}</div>
            ${params.message ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(212,130,10,0.15);"><strong>Message:</strong> ${escapeHtml(params.message)}</div>` : ''}
          </div>
          <p style="margin:0 0 18px;color:#8C7B6B;">Log in to your dashboard to accept or decline this request.</p>
          <a href="https://www.houseshow.net/bookings" style="display:inline-block;background:linear-gradient(135deg,#D4820A,#F0A500);color:#1A1410;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;">View Request</a>
          <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(212,130,10,0.2);color:#F0A500;font-weight:700;">HouseShow</div>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error('[email] Failed to send booking request email:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function sendBookingDecisionEmail(params: BookingDecisionEmailParams) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured, skipping booking decision email')
    return { success: false, error: 'Email not configured' }
  }

  const formattedDate = formatDate(params.proposedDate)
  const accepted = params.decision === 'accepted'
  const subject = accepted
    ? `Your booking request was accepted by ${params.hostName}!`
    : `Update on your booking request with ${params.hostName}`

  const statusText = accepted
    ? 'Great news — your booking request has been accepted!'
    : 'Unfortunately, your booking request was declined.'

  const ctaText = accepted ? 'View Your Bookings' : 'Find More Venues'
  const ctaUrl = accepted
    ? 'https://www.houseshow.net/bookings'
    : 'https://www.houseshow.net/venue-radar'

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html: `
      <div style="background:#1A1410;padding:24px;font-family:Arial,sans-serif;color:#F5F0E8;">
        <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,130,10,0.25);border-radius:12px;background:rgba(44,34,24,0.45);padding:24px;">
          <h1 style="margin:0 0 8px;font-size:26px;color:#F5F0E8;">Booking ${accepted ? 'Accepted' : 'Declined'}</h1>
          <p style="margin:0 0 18px;color:#8C7B6B;">${statusText}</p>
          <div style="border:1px solid rgba(212,130,10,0.25);border-radius:10px;padding:16px;background:rgba(26,20,16,0.4);margin-bottom:18px;">
            <div style="color:#F0A500;font-weight:700;font-size:18px;margin-bottom:8px;">${escapeHtml(params.hostName)}</div>
            <div style="margin-bottom:6px;">Proposed date: ${formattedDate}</div>
          </div>
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4820A,#F0A500);color:#1A1410;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;">${ctaText}</a>
          <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(212,130,10,0.2);color:#F0A500;font-weight:700;">HouseShow</div>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error('[email] Failed to send booking decision email:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

function formatDate(value: string): string {
  if (!value) return 'Date TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
