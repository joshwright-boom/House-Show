import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

export async function POST(request: NextRequest) {
  try {
    const {
      showId,
      showName,
      showDate,
      showTime,
      venueName,
      venueAddress,
      ticketPrice,
      quantity
    } = await request.json()

    console.log('CHECKOUT REQUEST BODY:', JSON.stringify({
      showId,
      showName,
      showDate,
      showTime,
      venueName,
      venueAddress,
      ticketPrice,
      quantity
    }))

    if (!showId || !showName || !showDate || !showTime || !venueName || !venueAddress || ticketPrice === undefined || ticketPrice === null || !quantity) {
      return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing checkout details' }, { status: 400 })
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: showRecord, error: showLookupError } = await supabase
      .from('shows')
      .select('id, show_name, artist_name, show_date, show_time, venue_name, venue_address, ticket_price')
      .eq('id', showId)
      .maybeSingle()

    console.log('CHECKOUT SHOW LOOKUP:', JSON.stringify({ showId, showRecord, showLookupError }))

    const resolvedShowName = String(showName || showRecord?.show_name || showRecord?.artist_name || '').trim()
    const resolvedShowDate = String(showDate || showRecord?.show_date || '')
    const resolvedShowTime = String(showTime || showRecord?.show_time || '')
    const resolvedVenueName = String(venueName || showRecord?.venue_name || '')
    const resolvedVenueAddress = String(venueAddress || showRecord?.venue_address || '')
    const resolvedTicketPrice = Number(ticketPrice ?? showRecord?.ticket_price)
    const safeQuantity = Math.max(1, Number(quantity) || 1)
    const unitAmount = Math.round(resolvedTicketPrice * 100)

    if (!resolvedShowName || !resolvedShowDate || !resolvedShowTime || !resolvedVenueName || !resolvedVenueAddress || Number.isNaN(resolvedTicketPrice) || resolvedTicketPrice <= 0 || !Number.isFinite(unitAmount) || unitAmount <= 0) {
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
            unit_amount: unitAmount,
          },
          quantity: safeQuantity,
        },
      ],
      success_url: `${origin}/success?showId=${showId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/show/${showId}?checkout=cancelled`,
      metadata: {
        showId,
        showName: resolvedShowName,
        showDate: resolvedShowDate,
        showTime: resolvedShowTime,
        venueName: resolvedVenueName,
        venueAddress: resolvedVenueAddress,
        ticketPrice: String(resolvedTicketPrice),
        quantity: String(safeQuantity),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
