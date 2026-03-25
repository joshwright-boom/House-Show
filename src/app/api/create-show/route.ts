import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const getMissingColumnName = (message?: string | null) => {
  if (!message) return null

  const match = message.match(/'([^']+)'/)
  return match?.[1] || null
}

const omitKey = <T extends Record<string, any>>(object: T, key: string) => {
  const { [key]: _removed, ...rest } = object
  return rest
}

const insertShowWithFallback = async (adminSupabase: any, initialPayload: Record<string, any>) => {
  let payload = { ...initialPayload }
  let attempts = 0

  while (attempts < 12) {
    const { error } = await adminSupabase.from('shows').insert(payload as any)

    if (!error) {
      return { error: null }
    }

    const missingColumn = getMissingColumnName(error.message)
    const isMissingColumnError = error.message?.includes('column') && missingColumn

    if (!isMissingColumnError || !missingColumn || !(missingColumn in payload)) {
      return { error }
    }

    payload = omitKey(payload, missingColumn)
    attempts += 1
  }

  return {
    error: {
      message: 'Show creation failed after removing unsupported show columns.'
    }
  }
}

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

    if (profile.user_type !== 'host') {
      return NextResponse.json({ error: 'Only host accounts can publish shows.' }, { status: 403 })
    }

    let requestDraft: {
      id: string
      host_id: string
      musician_id: string
      proposed_date?: string
      show_date?: string
      status?: string
    } | null = null

    if (requestId) {
      const { data: bookingRequest, error: requestError } = await dbSupabase
        .from('booking_requests')
        .select('id, host_id, musician_id, proposed_date, show_date, status')
        .eq('id', requestId)
        .single()

      if (requestError || !bookingRequest) {
        return NextResponse.json({ error: requestError?.message || 'Booking request not found.' }, { status: 404 })
      }

      if (bookingRequest.host_id !== user.id) {
        return NextResponse.json({ error: 'Only the host who sent this invitation can create the show.' }, { status: 403 })
      }

      requestDraft = bookingRequest
    }

    const commonShowData = {
      show_name: formData?.show_name,
      artist_name: artist_name || null,
      venue_name: formData?.venue_name,
      venue_address: formData?.venue_address,
      ticket_price: Number.parseFloat(formData?.ticket_price || '0'),
      show_description: formData?.show_description || '',
      genre_preference: formData?.genre_preference || 'Any',
      host_id: user.id,
      status: 'open',
      created_at: new Date().toISOString()
    }

    const musicianId = requestDraft?.musician_id || selectedMusicianId || null
    const maxCapacity = Number.parseInt(formData?.max_capacity || '0', 10)
    const normalizedDate = normalizeDateForInsert(formData?.date || requestDraft?.show_date || requestDraft?.proposed_date || null)

    if (!normalizedDate) {
      return NextResponse.json({ error: 'Show date is missing. Please choose a date before publishing.' }, { status: 400 })
    }

    const datePayloads = [
      { ...commonShowData, show_date: normalizedDate },
      { ...commonShowData, event_date: normalizedDate },
      { ...commonShowData, scheduled_date: normalizedDate },
      { ...commonShowData, show_date: normalizedDate }
    ]

    const timePayloads = datePayloads.flatMap(payload => [
      { ...payload, time: formData?.time },
      { ...payload, show_time: formData?.time }
    ])

    const capacityPayloads = timePayloads.flatMap(payload => [
      { ...payload, max_capacity: maxCapacity },
      { ...payload, capacity: maxCapacity }
    ])

    const showPayloads = capacityPayloads.flatMap(payload => [
      { ...payload, artist_user_id: musicianId },
      { ...payload, artist_id: musicianId },
      { ...payload, musician_id: musicianId }
    ])

    console.log('Incoming form data:', JSON.stringify(formData))

    let insertError: { message?: string } | null = null

    for (const payload of showPayloads) {
      const { error } = await insertShowWithFallback(dbSupabase, payload)

      if (!error) {
        insertError = null
        break
      }

      insertError = error
    }

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
      .eq('host_id', user.id)
      .eq('venue_address', commonShowData.venue_address)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lookupError || !createdShow) {
      return NextResponse.json({ error: lookupError?.message || 'Show created but could not be loaded.' }, { status: 500 })
    }

    return NextResponse.json({ showId: createdShow.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected show creation error.' },
      { status: 500 }
    )
  }
}
