import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendNewBookingRequestEmail, sendBookingDecisionEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Auth check
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    if (!token || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!serviceRoleKey) {
      console.warn('[notify-booking-request] SUPABASE_SERVICE_ROLE_KEY not configured, cannot resolve emails')
      return NextResponse.json({ ok: false, warning: 'Service role key not configured' }, { status: 200 })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    const body = await request.json()
    const { type } = body

    if (type === 'new_request') {
      return await handleNewRequest(adminSupabase, body)
    }

    if (type === 'decision') {
      return await handleDecision(adminSupabase, body)
    }

    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
  } catch (error) {
    console.error('[notify-booking-request] error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}

async function handleNewRequest(
  adminSupabase: any,
  body: {
    hostProfileId?: string
    hostUserId?: string
    artistName: string
    proposedDate: string
    message?: string
    dealSummary: string
  }
) {
  const { hostProfileId, hostUserId, artistName, proposedDate, message, dealSummary } = body

  if ((!hostProfileId && !hostUserId) || !artistName || !proposedDate || !dealSummary) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve to auth user_id: either via host_profiles.id or directly
  let resolvedUserId: string | null = hostUserId || null

  if (!resolvedUserId && hostProfileId) {
    const { data: hostProfile } = await adminSupabase
      .from('host_profiles')
      .select('user_id')
      .eq('id', hostProfileId)
      .maybeSingle()

    resolvedUserId = hostProfile?.user_id || null
  }

  if (!resolvedUserId) {
    console.warn('[notify-booking-request] Could not resolve host user_id:', { hostProfileId, hostUserId })
    return NextResponse.json({ ok: false, warning: 'Host not found' }, { status: 200 })
  }

  const { data: hostAuth } = await adminSupabase.auth.admin.getUserById(resolvedUserId)
  const hostEmail = hostAuth?.user?.email

  if (!hostEmail) {
    console.warn('[notify-booking-request] No email found for host user:', resolvedUserId)
    return NextResponse.json({ ok: false, warning: 'Host email not found' }, { status: 200 })
  }

  const result = await sendNewBookingRequestEmail({
    to: hostEmail,
    artistName,
    proposedDate,
    message,
    dealSummary,
  })

  return NextResponse.json({ ok: result.success })
}

async function handleDecision(
  adminSupabase: any,
  body: {
    musicianProfileId: string
    hostName: string
    proposedDate: string
    decision: 'accepted' | 'declined'
  }
) {
  const { musicianProfileId, hostName, proposedDate, decision } = body

  if (!musicianProfileId || !hostName || !proposedDate || !decision) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve artist_profiles.id -> artist_profiles.user_id -> auth email
  const { data: artistProfile } = await adminSupabase
    .from('artist_profiles')
    .select('user_id, name')
    .eq('id', musicianProfileId)
    .maybeSingle()

  if (!artistProfile?.user_id) {
    console.warn('[notify-booking-request] Could not resolve artist user_id for artist_profile:', musicianProfileId)
    return NextResponse.json({ ok: false, warning: 'Artist not found' }, { status: 200 })
  }

  const { data: artistAuth } = await adminSupabase.auth.admin.getUserById(artistProfile.user_id)
  const artistEmail = artistAuth?.user?.email

  if (!artistEmail) {
    console.warn('[notify-booking-request] No email found for artist user:', artistProfile.user_id)
    return NextResponse.json({ ok: false, warning: 'Artist email not found' }, { status: 200 })
  }

  const result = await sendBookingDecisionEmail({
    to: artistEmail,
    hostName,
    artistName: artistProfile.name || 'Artist',
    proposedDate,
    decision,
  })

  return NextResponse.json({ ok: result.success })
}
