import { NextRequest, NextResponse } from 'next/server'

const notificationWebhookUrl = process.env.NOTIFICATION_WEBHOOK_URL

export async function POST(request: NextRequest) {
  try {
    const { emails, showName, showDate, showUrl } = await request.json()

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ ok: false, error: 'No recipient emails provided.' }, { status: 400 })
    }

    if (!notificationWebhookUrl) {
      console.warn('NOTIFICATION_WEBHOOK_URL is not configured. Skipping email dispatch.')
      return NextResponse.json({ ok: false, warning: 'Notification webhook not configured.' }, { status: 200 })
    }

    for (const email of emails) {
      await fetch(notificationWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Your HouseShow is live: ${showName}`,
          text: `Your show is now live.\n\nShow: ${showName}\nDate: ${showDate}\nLink: ${showUrl}`,
          html: `<p>Your show is now live.</p><p><strong>Show:</strong> ${showName}<br/><strong>Date:</strong> ${showDate}<br/><strong>Link:</strong> <a href="${showUrl}">${showUrl}</a></p>`
        })
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unexpected notification error.' },
      { status: 500 }
    )
  }
}
