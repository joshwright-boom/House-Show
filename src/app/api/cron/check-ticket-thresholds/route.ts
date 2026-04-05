import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null
const fromEmail = process.env.RESEND_FROM_EMAIL || 'HouseShow <onboarding@resend.dev>'

const createServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceSupabase()
    const now = new Date()

    // Query all shows with a minimum ticket threshold that are still on sale
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, show_name, artist_name, show_date, show_time, venue_name, min_tickets, threshold_hours, artist_user_id, host_user_id')
      .in('status', ['open', 'on_sale'])
      .not('min_tickets', 'is', null)

    if (showsError) {
      console.error('[cron] Error querying shows:', showsError)
      return NextResponse.json({ error: 'Failed to query shows' }, { status: 500 })
    }

    if (!shows || shows.length === 0) {
      return NextResponse.json({ message: 'No shows with minimum ticket thresholds', checked: 0 })
    }

    let canceledCount = 0

    for (const show of shows) {
      const thresholdHours = show.threshold_hours || 48
      const showDateStr = show.show_date
      const showTimeStr = show.show_time || '19:00'

      // Parse show date and time
      const showDateTime = new Date(`${showDateStr}T${showTimeStr}:00`)
      if (isNaN(showDateTime.getTime())) {
        console.error('[cron] Invalid show date/time for show:', show.id, showDateStr, showTimeStr)
        continue
      }

      // Calculate the deadline: show_date minus threshold_hours
      const deadline = new Date(showDateTime.getTime() - thresholdHours * 60 * 60 * 1000)

      // If we haven't passed the deadline yet, skip
      if (now < deadline) {
        continue
      }

      // Count tickets sold for this show
      const { count: ticketCount, error: countError } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('show_id', show.id)

      if (countError) {
        console.error('[cron] Error counting tickets for show:', show.id, countError)
        continue
      }

      const soldTickets = ticketCount || 0

      // If ticket count meets the minimum, skip
      if (soldTickets >= show.min_tickets) {
        continue
      }

      console.log(`[cron] Show ${show.id} has ${soldTickets}/${show.min_tickets} tickets — auto-canceling`)

      // === CANCEL SEQUENCE ===

      // 1. Update show status to auto_canceled
      const { error: updateError } = await supabase
        .from('shows')
        .update({ status: 'auto_canceled' })
        .eq('id', show.id)

      if (updateError) {
        console.error('[cron] Error updating show status:', show.id, updateError)
        continue
      }

      // 2. Get all tickets with their stripe session IDs and buyer emails
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, user_id, stripe_session_id')
        .eq('show_id', show.id)

      if (ticketsError || !tickets) {
        console.error('[cron] Error fetching tickets for show:', show.id, ticketsError)
        continue
      }

      // 3. Refund each unique Stripe checkout session
      const refundedSessions = new Set<string>()
      for (const ticket of tickets) {
        if (!ticket.stripe_session_id || refundedSessions.has(ticket.stripe_session_id)) {
          continue
        }
        refundedSessions.add(ticket.stripe_session_id)

        try {
          // Retrieve the checkout session to get the payment intent
          const session = await stripe.checkout.sessions.retrieve(ticket.stripe_session_id)
          const paymentIntentId = session.payment_intent as string

          if (paymentIntentId) {
            await stripe.refunds.create({ payment_intent: paymentIntentId })
            console.log(`[cron] Refunded payment intent ${paymentIntentId} for session ${ticket.stripe_session_id}`)
          }
        } catch (refundError) {
          console.error(`[cron] Error refunding session ${ticket.stripe_session_id}:`, refundError)
        }
      }

      // 4. Send emails to ticket buyers
      const buyerUserIds = Array.from(new Set(tickets.map(t => t.user_id)))
      const buyerEmails: string[] = []

      for (const userId of buyerUserIds) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userId)
          if (userData?.user?.email) {
            buyerEmails.push(userData.user.email)
          }
        } catch (emailError) {
          console.error(`[cron] Error fetching email for user ${userId}:`, emailError)
        }
      }

      const showDisplayName = show.show_name || show.artist_name || 'Your show'
      const showDate = show.show_date || ''

      if (resend) {
        // Email each ticket buyer
        for (const email of buyerEmails) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: email,
              subject: 'Show Canceled — Full Refund Issued',
              html: `
                <div style="background:#1A1410;padding:24px;font-family:Arial,sans-serif;color:#F5F0E8;">
                  <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,130,10,0.25);border-radius:12px;background:rgba(44,34,24,0.45);padding:24px;">
                    <h1 style="margin:0 0 8px;font-size:24px;color:#F5F0E8;">Show Canceled</h1>
                    <p style="margin:0 0 18px;color:#8C7B6B;">We're sorry — <strong>${showDisplayName}</strong> on ${showDate} didn't meet the minimum ticket requirement and has been automatically canceled.</p>
                    <p style="margin:0 0 18px;color:#F5F0E8;">A <strong>full refund</strong> has been issued to your original payment method. Please allow 5–10 business days for the refund to appear.</p>
                    <p style="margin:0;color:#8C7B6B;">We hope to see you at a future HouseShow!</p>
                    <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(212,130,10,0.2);color:#F0A500;font-weight:700;">HouseShow</div>
                  </div>
                </div>
              `
            })
          } catch (emailError) {
            console.error(`[cron] Error sending cancellation email to ${email}:`, emailError)
          }
        }

        // Email the artist
        if (show.artist_user_id) {
          try {
            const { data: artistData } = await supabase.auth.admin.getUserById(show.artist_user_id)
            if (artistData?.user?.email) {
              await resend.emails.send({
                from: fromEmail,
                to: artistData.user.email,
                subject: 'Show Canceled — Minimum Tickets Not Met',
                html: `
                  <div style="background:#1A1410;padding:24px;font-family:Arial,sans-serif;color:#F5F0E8;">
                    <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,130,10,0.25);border-radius:12px;background:rgba(44,34,24,0.45);padding:24px;">
                      <h1 style="margin:0 0 8px;font-size:24px;color:#F5F0E8;">Show Canceled</h1>
                      <p style="margin:0 0 18px;color:#8C7B6B;"><strong>${showDisplayName}</strong> on ${showDate} did not meet the minimum ticket requirement of ${show.min_tickets} tickets and has been automatically canceled.</p>
                      <p style="margin:0 0 18px;color:#F5F0E8;">All ticket holders have been fully refunded.</p>
                      <p style="margin:0;color:#8C7B6B;">You can create a new show anytime from your dashboard.</p>
                      <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(212,130,10,0.2);color:#F0A500;font-weight:700;">HouseShow</div>
                    </div>
                  </div>
                `
              })
            }
          } catch (emailError) {
            console.error(`[cron] Error sending artist cancellation email:`, emailError)
          }
        }

        // Email the venue host
        if (show.host_user_id) {
          try {
            const { data: hostData } = await supabase.auth.admin.getUserById(show.host_user_id)
            if (hostData?.user?.email) {
              await resend.emails.send({
                from: fromEmail,
                to: hostData.user.email,
                subject: 'Show Canceled — Minimum Tickets Not Met',
                html: `
                  <div style="background:#1A1410;padding:24px;font-family:Arial,sans-serif;color:#F5F0E8;">
                    <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,130,10,0.25);border-radius:12px;background:rgba(44,34,24,0.45);padding:24px;">
                      <h1 style="margin:0 0 8px;font-size:24px;color:#F5F0E8;">Show Canceled</h1>
                      <p style="margin:0 0 18px;color:#8C7B6B;"><strong>${showDisplayName}</strong> on ${showDate} did not meet the minimum ticket requirement of ${show.min_tickets} tickets and has been automatically canceled.</p>
                      <p style="margin:0 0 18px;color:#F5F0E8;">All ticket holders have been fully refunded.</p>
                      <p style="margin:0;color:#8C7B6B;">You can schedule a new show anytime from your dashboard.</p>
                      <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(212,130,10,0.2);color:#F0A500;font-weight:700;">HouseShow</div>
                    </div>
                  </div>
                `
              })
            }
          } catch (emailError) {
            console.error(`[cron] Error sending host cancellation email:`, emailError)
          }
        }
      }

      canceledCount++
    }

    return NextResponse.json({
      message: `Checked ${shows.length} shows, canceled ${canceledCount}`,
      checked: shows.length,
      canceled: canceledCount
    })
  } catch (error) {
    console.error('[cron] Fatal error:', error)
    return NextResponse.json({ error: 'Cron handler failed' }, { status: 500 })
  }
}
