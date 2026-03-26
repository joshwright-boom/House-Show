import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const email = session.customer_details?.email || session.customer_email || null

    return NextResponse.json({ email })
  } catch (error) {
    console.error('Error fetching checkout session:', error)
    return NextResponse.json({ error: 'Failed to load checkout session' }, { status: 500 })
  }
}
