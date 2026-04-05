import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

const endpointSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()

const createServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    console.log('[webhook] received request', {
      hasSignature: Boolean(signature),
      bodyLength: body.length,
      hasEndpointSecret: Boolean(endpointSecret),
    })

    if (!signature) {
      console.error('[webhook] missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
    if (!endpointSecret) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET is missing or empty')
      return NextResponse.json({ error: 'Missing endpoint secret' }, { status: 500 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('[webhook] signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    console.log('[webhook] signature verified', { eventId: event.id, eventType: event.type })

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const checkoutSession = event.data.object as Stripe.Checkout.Session
        await handleCompletedCheckoutSession(checkoutSession)
        break

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handleSuccessfulPayment(paymentIntent)
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        await handleFailedPayment(failedPayment)
        break

      default:
        console.log('[webhook] unhandled event type', { eventType: event.type, eventId: event.id })
    }

    console.log('[webhook] handled successfully', { eventId: event.id, eventType: event.type })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook] fatal handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCompletedCheckoutSession(session: Stripe.Checkout.Session) {
  const { showId, userId, quantity, liabilityAgreed, liabilityAgreedAt } = session.metadata || {}
  console.log('[webhook] checkout.session.completed metadata', {
    sessionId: session.id,
    showId,
    userId,
    quantity,
    liabilityAgreed,
    liabilityAgreedAt,
    paymentStatus: session.payment_status,
  })

  if (!showId || !userId) {
    throw new Error(`Missing checkout metadata for ticket creation. Session: ${session.id}`)
  }

  const ticketCount = Math.max(1, Number(quantity || 1))
  const ticketsToInsert = Array.from({ length: ticketCount }, () => ({
    show_id: showId,
    user_id: userId,
    liability_agreed: liabilityAgreed === 'true',
    liability_agreed_at: liabilityAgreedAt || new Date().toISOString(),
    stripe_session_id: session.id,
  }))

  try {
    const supabase = createServiceSupabase()
    console.log('[webhook] inserting tickets', { sessionId: session.id, ticketCount })
    const { error } = await supabase.from('tickets').insert(ticketsToInsert)
    if (error) {
      console.error('[webhook] error inserting tickets:', error)
      throw error
    }

    console.log('[webhook] tickets inserted', { sessionId: session.id, ticketCount })
  } catch (error) {
    console.error('[webhook] error handling checkout.session.completed:', error)
    throw error
  }
}

async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const { bookingId, musicianId, hostId } = paymentIntent.metadata

  try {
    const supabase = createServiceSupabase()
    // Update booking status to confirmed
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_intent_id: paymentIntent.id,
        payment_amount: paymentIntent.amount / 100, // Convert from cents
        paid_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking:', error)
      throw error
    }

    // Create revenue records
    const paymentAmount = paymentIntent.amount / 100
    const musicianRevenue = paymentAmount * 0.6 // 60% to musician
    const hostRevenue = paymentAmount * 0.33 // 33% to host

    // Update musician revenue
    await supabase
      .from('revenue')
      .upsert({
        user_id: musicianId,
        booking_id: bookingId,
        amount: musicianRevenue,
        type: 'musician',
        payment_intent_id: paymentIntent.id,
        created_at: new Date().toISOString(),
      })

    // Update host revenue
    await supabase
      .from('revenue')
      .upsert({
        user_id: hostId,
        booking_id: bookingId,
        amount: hostRevenue,
        type: 'host',
        payment_intent_id: paymentIntent.id,
        created_at: new Date().toISOString(),
      })

    console.log(`Payment succeeded for booking ${bookingId}`)
  } catch (error) {
    console.error('Error handling successful payment:', error)
  }
}

async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
  const { bookingId } = paymentIntent.metadata

  try {
    const supabase = createServiceSupabase()
    // Update booking status to payment_failed
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'payment_failed',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking status:', error)
    }

    console.log(`Payment failed for booking ${bookingId}`)
  } catch (error) {
    console.error('Error handling failed payment:', error)
  }
}
