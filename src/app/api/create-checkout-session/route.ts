import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

export async function POST(request: NextRequest) {
  try {
    const { showId, quantity, userId } = await request.json()

    if (!showId || !quantity || !userId) {
      return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: showRecord, error: showLookupError } = await supabase
      .from('shows')
      .select('artist_name, ticket_price')
      .eq('id', showId)
      .single()

    console.log('CHECKOUT SHOW LOOKUP:', JSON.stringify({
      showId,
      showRecord,
      showLookupError
    }))

    if (showLookupError || !showRecord) {
      return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    }

    const resolvedShowName = showRecord.artist_name
    const resolvedTicketPrice = showRecord.ticket_price

    if (!resolvedShowName || resolvedTicketPrice === undefined || resolvedTicketPrice === null || Number.isNaN(Number(resolvedTicketPrice))) {
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
              name: `${resolvedShowName} Ticket`,
            },
            unit_amount: Math.round(Number(resolvedTicketPrice) * 100),
          },
          quantity: Number(quantity),
        },
      ],
      success_url: `${origin}/success?showId=${showId}`,
      cancel_url: `${origin}/show/${showId}?checkout=cancelled`,
      metadata: {
        showId,
        userId,
        quantity: String(quantity),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
