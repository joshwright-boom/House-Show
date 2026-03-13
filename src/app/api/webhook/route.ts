import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handleSuccessfulPayment(paymentIntent)
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        await handleFailedPayment(failedPayment)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const { bookingId, musicianId, hostId } = paymentIntent.metadata

  try {
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
    const musicianRevenue = paymentAmount * 0.7 // 70% to musician
    const hostRevenue = paymentAmount * 0.3 // 30% to host

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
