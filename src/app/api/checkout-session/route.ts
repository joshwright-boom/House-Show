import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
} as any)

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    if (!token || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const email = session.customer_details?.email || session.customer_email || null
    const quantity = session.metadata?.quantity || '1'

    return NextResponse.json({ email, quantity })
  } catch (error) {
    console.error('Error fetching checkout session:', error)
    return NextResponse.json({ error: 'Failed to load checkout session' }, { status: 500 })
  }
}
