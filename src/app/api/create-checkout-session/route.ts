import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

export async function POST(request: NextRequest) {
  try {
    const { showId, showName, ticketPrice, quantity } = await request.json()

    if (!showId || !showName || !ticketPrice || !quantity) {
      return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.houseshow.net'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${showName} Ticket`,
            },
            unit_amount: Math.round(Number(ticketPrice) * 100),
          },
          quantity: Number(quantity),
        },
      ],
      success_url: `${origin}/show/${showId}?checkout=success`,
      cancel_url: `${origin}/show/${showId}?checkout=cancelled`,
      metadata: {
        showId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
