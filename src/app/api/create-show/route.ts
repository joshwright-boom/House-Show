import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const normalizeDateForInsert = (value?: string | null) => {
  if (!value) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (isoMatch) return isoMatch[1]

  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return value
}

const buildShowSlug = (showName?: string | null) => {
  const base = (showName || 'show')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `${base || 'show'}-${randomPart}`
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables are not configured on the server.' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token.' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, formData, selectedMusicianId, artist_name } = body || {}

    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: authData, error: authError } = await authSupabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Unable to verify user.' }, { status: 401 })
    }

    const user = authData.user

    const hasServiceRole = !!serviceRoleKey && serviceRoleKey !== 'your_service_role_key_here'
    const dbSupabase = hasServiceRole
      ? createClient(supabaseUrl, serviceRoleKey)
      : authSupabase

    const { data: profile, error: profileError } = await dbSupabase
      .from('profiles')
      .select('id, user_type')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: profileError?.message || 'Profile not found.' }, { status: 403 })
    }

    if (profile.user_type !== 'host' && profile.user_type !== 'musician') {
      return NextResponse.json({ error: 'Only host or musician accounts can publish shows.' }, { status: 403 })
    }

    let requestDraft: {
      id: string
      host_id: string
      musician_id: string
      show_date?: string
      venue_address?: string
      ticket_price?: number
    } | null = null

    if (requestId) {
      const { data: bookingRequest, error: requestError } = await dbSupabase
        .from('booking_requests')
        .select('id, host_id, musician_id, show_date, venue_address, ticket_price')
        .eq('id', requestId)
        .single()

      if (requestError || !bookingRequest) {
        return NextResponse.json({ error: requestError?.message || 'Booking request not found.' }, { status: 404 })
      }

      if (bookingRequest.host_id !== user.id && bookingRequest.musician_id !== user.id) {
        return NextResponse.json({ error: 'Only the host or musician on this booking can create the show.' }, { status: 403 })
      }

      requestDraft = bookingRequest
    }

    const normalizedDate = normalizeDateForInsert(formData?.date || requestDraft?.show_date || null)

    if (!normalizedDate) {
      return NextResponse.json({ error: 'Show date is missing. Please choose a date before publishing.' }, { status: 400 })
    }

    let bookingId: string | null = null

    if (requestDraft?.id) {
      const bookingLookupColumns = ['booking_request_id', 'request_id', 'id']

      for (const column of bookingLookupColumns) {
        const { data: bookingRecord, error: bookingLookupError } = await dbSupabase
          .from('bookings')
          .select('id')
          .eq(column, requestDraft.id)
          .limit(1)
          .maybeSingle()

        if (!bookingLookupError && bookingRecord?.id) {
          bookingId = bookingRecord.id
          break
        }
      }
    }

    const hostUserId = requestDraft?.host_id || user.id
    const artistUserId = requestDraft?.musician_id || selectedMusicianId || user.id

    const showInsertPayload = {
      artist_name: (artist_name || formData?.artist_name || '').trim(),
      venue_name: formData?.venue_name,
      venue_address: formData?.venue_address,
      show_date: normalizedDate,
      show_time: formData?.time,
      ticket_price: parseFloat(formData?.ticket_price),
      status: 'on_sale',
      artist_user_id: artistUserId,
      host_user_id: hostUserId,
      slug: buildShowSlug(formData?.show_name),
      booking_id: bookingId
    }

    if (!showInsertPayload.artist_name) {
      return NextResponse.json({ error: 'Artist name is required.' }, { status: 400 })
    }

    console.log('Incoming form data:', JSON.stringify(formData))

    const { error: insertError } = await dbSupabase
      .from('shows')
      .insert(showInsertPayload as any)

    if (insertError) {
      if (!hasServiceRole && insertError.message?.includes('row-level security')) {
        return NextResponse.json(
          {
            error:
              'Show creation is blocked because the Supabase server key is missing in Vercel and the live shows table is rejecting browser-auth inserts. Add SUPABASE_SERVICE_ROLE_KEY in Vercel to finish this flow.'
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: insertError.message || 'Unable to create show.' }, { status: 400 })
    }

    const { data: createdShow, error: lookupError } = await dbSupabase
      .from('shows')
      .select('*')
      .eq('host_user_id', user.id)
      .eq('venue_address', showInsertPayload.venue_address)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lookupError || !createdShow) {
      return NextResponse.json({ error: lookupError?.message || 'Show created but could not be loaded.' }, { status: 500 })
    }

    try {
      const emailRecipients = new Set<string>()
      if (authData.user?.email) {
        emailRecipients.add(authData.user.email)
      }

      if (hasServiceRole) {
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey!)
        const participantIds = [hostUserId, artistUserId].filter(Boolean) as string[]
        for (const participantId of participantIds) {
          const { data: accountData } = await adminSupabase.auth.admin.getUserById(participantId)
          if (accountData?.user?.email) {
            emailRecipients.add(accountData.user.email)
          }
        }
      }

      if (emailRecipients.size > 0) {
        await fetch(new URL('/api/notify-show-published', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails: Array.from(emailRecipients),
            showName: formData?.show_name || showInsertPayload.artist_name,
            showDate: normalizedDate,
            showUrl: `https://www.houseshow.net/show/${createdShow.slug || showInsertPayload.slug}`
          })
        })
      }
    } catch (notificationError) {
      console.error('Show published notification error:', notificationError)
    }

    return NextResponse.json({ showId: createdShow.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected show creation error.' },
      { status: 500 }
    )
  }
}
