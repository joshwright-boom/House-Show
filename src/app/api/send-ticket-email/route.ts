import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(request: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured.' }, { status: 500 })
    }

    const {
      email,
      showName,
      showDate,
      showTime,
      venueName,
      venueAddress,
      sessionId,
      quantity
    } = await request.json()

    if (!email || !showName || !showDate || !showTime || !venueName || !venueAddress || !sessionId || !quantity) {
      return NextResponse.json({ error: 'Missing email details.' }, { status: 400 })
    }

    const ticketUrl = `https://houseshow.net/ticket/${sessionId}`
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'HouseShow <onboarding@resend.dev>'

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your ticket to ${showName} 🎵`,
      html: `
        <div style="background:#1A1410;padding:24px;font-family:Arial,sans-serif;color:#F5F0E8;">
          <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,130,10,0.25);border-radius:12px;background:rgba(44,34,24,0.45);padding:24px;">
            <h1 style="margin:0 0 8px;font-size:30px;color:#F5F0E8;">You're going to the show!</h1>
            <p style="margin:0 0 18px;color:#8C7B6B;">Thanks for supporting live music with HouseShow.</p>
            <div style="border:1px solid rgba(212,130,10,0.25);border-radius:10px;padding:16px;background:rgba(26,20,16,0.4);margin-bottom:18px;">
              <div style="color:#F0A500;font-weight:700;font-size:18px;margin-bottom:8px;">${showName}</div>
              <div style="margin-bottom:6px;">${showDate} at ${showTime}</div>
              <div style="margin-bottom:6px;">${venueName}</div>
              <div style="margin-bottom:6px;">${venueAddress}</div>
              <div style="margin-top:10px;">Tickets: ${quantity}</div>
            </div>
            <p style="margin:0 0 10px;">QR Ticket Link:</p>
            <p style="margin:0 0 12px;">
              <a href="${ticketUrl}" style="color:#D4820A;text-decoration:none;font-weight:700;">${ticketUrl}</a>
            </p>
            <p style="margin:0;color:#8C7B6B;">Show this QR code at the door.</p>
            <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(212,130,10,0.2);color:#F0A500;font-weight:700;">HouseShow</div>
          </div>
        </div>
      `
    })

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to send ticket email.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending ticket email:', error)
    return NextResponse.json({ error: 'Failed to send ticket email.' }, { status: 500 })
  }
}
