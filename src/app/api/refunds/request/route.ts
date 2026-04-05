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

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 })
    }

    // Authenticate user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { ticket_id } = await request.json()

    if (!ticket_id) {
      return NextResponse.json({ success: false, message: 'Missing ticket_id' }, { status: 400 })
    }

    // Use service role for database operations
    const dbSupabase = serviceRoleKey && serviceRoleKey !== 'your_service_role_key_here'
      ? createClient(supabaseUrl, serviceRoleKey)
      : authSupabase

    // Look up the ticket and confirm ownership
    const { data: ticket, error: ticketError } = await dbSupabase
      .from('tickets')
      .select('id, show_id, user_id, stripe_session_id, status')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.user_id !== user.id) {
      return NextResponse.json({ success: false, message: 'This ticket does not belong to you' }, { status: 403 })
    }

    if (ticket.status === 'refunded') {
      return NextResponse.json({ success: false, message: 'This ticket has already been refunded' }, { status: 400 })
    }

    // Look up the show
    const { data: show, error: showError } = await dbSupabase
      .from('shows')
      .select('id, show_name, artist_name, show_date, show_time, cancellation_policy')
      .eq('id', ticket.show_id)
      .single()

    if (showError || !show) {
      return NextResponse.json({ success: false, message: 'Show not found' }, { status: 404 })
    }

    const policy = show.cancellation_policy || '72_hours'

    // No refunds policy — always deny
    if (policy === 'no_refunds') {
      return NextResponse.json({ success: false, message: 'This show has a no-refunds policy. All sales are final.' })
    }

    // Calculate hours until show
    const showDateStr = show.show_date || ''
    const showTimeStr = show.show_time || '19:00'
    const showDateTime = new Date(`${showDateStr}T${showTimeStr}:00`)

    if (isNaN(showDateTime.getTime())) {
      return NextResponse.json({ success: false, message: 'Unable to determine show date' }, { status: 500 })
    }

    const now = new Date()
    const hoursUntilShow = (showDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Apply policy
    const policyHours: Record<string, number> = {
      '72_hours': 72,
      '48_hours': 48,
      '24_hours': 24
    }

    const requiredHours = policyHours[policy] || 72

    if (hoursUntilShow < requiredHours) {
      return NextResponse.json({
        success: false,
        message: `Refunds are only available ${requiredHours}+ hours before the show. The show is in ${Math.max(0, Math.floor(hoursUntilShow))} hours.`
      })
    }

    // Issue Stripe refund
    if (ticket.stripe_session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(ticket.stripe_session_id)
        const paymentIntentId = session.payment_intent as string

        if (paymentIntentId) {
          await stripe.refunds.create({ payment_intent: paymentIntentId })
        }
      } catch (refundError) {
        console.error('[refund] Stripe refund error:', refundError)
        return NextResponse.json({ success: false, message: 'Failed to process refund with payment provider' }, { status: 500 })
      }
    }

    // Update ticket status to refunded
    const { error: updateError } = await dbSupabase
      .from('tickets')
      .update({ status: 'refunded' })
      .eq('id', ticket_id)

    if (updateError) {
      console.error('[refund] Error updating ticket status:', updateError)
    }

    // Send confirmation email
    if (resend && user.email) {
      const showDisplayName = show.show_name || show.artist_name || 'Your show'
      try {
        await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: 'Refund Confirmed — HouseShow',
          html: `
            <div style="background:#1A1410;padding:24px;font-family:Arial,sans-serif;color:#F5F0E8;">
              <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,130,10,0.25);border-radius:12px;background:rgba(44,34,24,0.45);padding:24px;">
                <h1 style="margin:0 0 8px;font-size:24px;color:#F5F0E8;">Refund Confirmed</h1>
                <p style="margin:0 0 18px;color:#8C7B6B;">Your ticket for <strong>${showDisplayName}</strong> on ${showDateStr} has been refunded.</p>
                <p style="margin:0 0 18px;color:#F5F0E8;">A <strong>full refund</strong> has been issued to your original payment method. Please allow 5–10 business days for the refund to appear.</p>
                <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(212,130,10,0.2);color:#F0A500;font-weight:700;">HouseShow</div>
              </div>
            </div>
          `
        })
      } catch (emailError) {
        console.error('[refund] Email send error:', emailError)
      }
    }

    return NextResponse.json({ success: true, message: 'Refund issued successfully. Please allow 5–10 business days for it to appear.' })
  } catch (error) {
    console.error('[refund] Fatal error:', error)
    return NextResponse.json({ success: false, message: 'An unexpected error occurred' }, { status: 500 })
  }
}
