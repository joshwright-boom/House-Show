'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BookingRequest {
  id: string
  host_id: string
  musician_id?: string
  musician_name?: string
  requester_name?: string
  venue_name?: string | null
  created_at: string
  proposed_date: string
  show_date?: string
  venue_address: string
  ticket_price: number | null
  host_split: number | null
  musician_split: number | null
  proposed_host_pct?: number | null
  proposed_musician_pct?: number | null
  proposed_platform_pct?: number | null
  minimum_guarantee?: number | null
  message: string
  status: 'pending' | 'accepted' | 'declined' | 'negotiating'
}

interface HostShow {
  id: string
  host_id: string
  artist_user_id?: string | null
  date: string
  venue_address: string
}

interface TicketShow {
  ticketId: string
  showId: string
  artistName: string
  showDate: string
  venueName: string
  fullAddress?: string | null
  status?: string | null
}

const getShowDateValue = (show: Record<string, any>) =>
  show.date || show.show_date || show.event_date || show.scheduled_date || ''

const getShowArtistId = (show: Record<string, any>) =>
  show.artist_user_id || show.musician_id || null

const getShowHostId = (show: Record<string, any>) =>
  show.host_user_id || show.host_id || null

const getRequestDateValue = (request: BookingRequest) =>
  request.show_date || request.proposed_date || ''

const DEFAULT_COUNTER_SPLIT = {
  musician: 60,
  host: 33,
  platform: 7
}

const LOCKED_PLATFORM_PCT = DEFAULT_COUNTER_SPLIT.platform
const NEGOTIABLE_SPLIT_TOTAL = 100 - LOCKED_PLATFORM_PCT

const parseSplitValue = (value: string) => Number.parseInt(value, 10) || 0

const getCounterOfferTotal = (values: { musician: string; host: string; platform: string }) =>
  parseSplitValue(values.musician) + parseSplitValue(values.host) + parseSplitValue(values.platform)

const ACTIVE_VIEW_KEY = 'houseshow_active_view'

export default function Dashboard() {
  // Required migration:
  // ALTER TABLE booking_requests
  // ADD COLUMN proposed_musician_pct INTEGER,
  // ADD COLUMN proposed_host_pct INTEGER,
  // ADD COLUMN proposed_platform_pct INTEGER;
  const [user, setUser] = useState<{ id: string; email?: string; user_type?: string } | null>(null)
  const [activeView, setActiveView] = useState<'musician' | 'host'>('musician')
  const [hasArtistProfile, setHasArtistProfile] = useState(false)
  const [hasHostProfile, setHasHostProfile] = useState(false)
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])
  const [hostRequests, setHostRequests] = useState<BookingRequest[]>([])
  const [hostShows, setHostShows] = useState<HostShow[]>([])
  const [musicianShows, setMusicianShows] = useState<HostShow[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [hostRequestsLoading, setHostRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [hostRequestsError, setHostRequestsError] = useState<string | null>(null)
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)
  const [expandedBookingRequestId, setExpandedBookingRequestId] = useState<string | null>(null)
  const [activeCounterOfferId, setActiveCounterOfferId] = useState<string | null>(null)
  const [counterOfferValues, setCounterOfferValues] = useState({
    musician: String(DEFAULT_COUNTER_SPLIT.musician),
    host: String(DEFAULT_COUNTER_SPLIT.host),
    platform: String(DEFAULT_COUNTER_SPLIT.platform)
  })
  const [counterOfferError, setCounterOfferError] = useState<string | null>(null)
  const [ticketShows, setTicketShows] = useState<TicketShow[]>([])
  const [ticketShowsLoading, setTicketShowsLoading] = useState(true)
  const [refundLoading, setRefundLoading] = useState<Record<string, boolean>>({})
  const [refundMessages, setRefundMessages] = useState<Record<string, { success: boolean; message: string }>>({})
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [emailNotificationsLoading, setEmailNotificationsLoading] = useState(false)
  const [artistProfileName, setArtistProfileName] = useState<string | null>(null)
  const [tourDatesCopied, setTourDatesCopied] = useState(false)
  const counterOfferTotal = getCounterOfferTotal(counterOfferValues)
  const isCounterOfferTotalValid = counterOfferTotal === 100

  const handleRefundRequest = async (ticketId: string) => {
    setRefundLoading(prev => ({ ...prev, [ticketId]: true }))
    setRefundMessages(prev => { const next = { ...prev }; delete next[ticketId]; return next })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setRefundMessages(prev => ({ ...prev, [ticketId]: { success: false, message: 'Please log in' } }))
        return
      }

      const response = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ticket_id: ticketId })
      })

      const result = await response.json()
      setRefundMessages(prev => ({ ...prev, [ticketId]: { success: result.success, message: result.message } }))

      if (result.success) {
        setTicketShows(prev => prev.map(t => t.ticketId === ticketId ? { ...t, status: 'refunded' } : t))
      }
    } catch (err) {
      setRefundMessages(prev => ({ ...prev, [ticketId]: { success: false, message: 'Failed to request refund' } }))
    } finally {
      setRefundLoading(prev => ({ ...prev, [ticketId]: false }))
    }
  }

  const loadMusicianBookingRequests = async (authUserId: string) => {
    try {
      const { data: musicianProfile, error: musicianProfileError } = await supabase
        .from('artist_profiles')
        .select('id, minimum_guarantee')
        .eq('user_id', authUserId)
        .maybeSingle()

      if (musicianProfileError) {
        console.error('Musician profile lookup error:', musicianProfileError)
        setRequestsError(musicianProfileError.message || 'Unable to load musician profile')
        setBookingRequests([])
        return null
      }

      if (!musicianProfile?.id) {
        setRequestsError(null)
        setBookingRequests([])
        return null
      }

      console.log('Loading musician incoming booking requests:', {
        musicianProfileId: musicianProfile.id
      })
      const { data: requests, error } = await supabase
        .from('booking_requests')
        .select('id, created_at, venue_address, proposed_date, ticket_price, host_split, musician_split, proposed_host_pct, proposed_musician_pct, proposed_platform_pct, guaranteed_minimum, message, status, host_id, musician_id')
        .eq('musician_id', musicianProfile.id)
        .or('status.eq.pending,status.eq.negotiating')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Booking requests error:', error)
        setRequestsError(error.message || 'Unknown booking request error')
        setBookingRequests([])
        return musicianProfile
      }

      const requestsList = requests || []
      const hostIds = Array.from(
        new Set(
          requestsList
            .map((request: any) => request.host_id)
            .filter(Boolean)
        )
      ) as string[]

      let hostNameById: Record<string, string> = {}
      let venueNameByHostId: Record<string, string> = {}

      if (hostIds.length > 0) {
        console.log('Loading host profiles for musician booking requests:', { hostIds })
        const { data: hostProfiles, error: hostProfilesError } = await supabase
          .from('host_profiles')
          .select('id, user_id, venue_name')
          .in('id', hostIds)

        if (hostProfilesError) {
          console.error('Booking requests host profile lookup error:', hostProfilesError)
        } else {
          const hostUserIds = Array.from(
            new Set((hostProfiles || []).map((profile: any) => profile.user_id).filter(Boolean))
          )

          let hostUserNameById: Record<string, string> = {}

          if (hostUserIds.length > 0) {
            const { data: profileRows, error: profilesError } = await supabase
              .from('profiles')
              .select('id, name')
              .in('id', hostUserIds)

            if (profilesError) {
              console.error('Booking requests host user profile lookup error:', profilesError)
            } else {
              hostUserNameById = (profileRows || []).reduce((acc: Record<string, string>, profile: any) => {
                acc[profile.id] = profile.name || 'Host'
                return acc
              }, {})
            }
          }

          hostNameById = (hostProfiles || []).reduce((acc: Record<string, string>, profile: any) => {
            acc[profile.id] = hostUserNameById[profile.user_id] || 'Host'
            return acc
          }, {})
          venueNameByHostId = (hostProfiles || []).reduce((acc: Record<string, string>, profile: any) => {
            acc[profile.id] = profile.venue_name || 'Venue TBD'
            return acc
          }, {})
        }
      }

      const normalizedRequests = requestsList.map((request: any) => ({
        ...request,
        requester_name: hostNameById[request.host_id] || 'Host',
        venue_name: venueNameByHostId[request.host_id] || 'Venue TBD',
        minimum_guarantee: musicianProfile.minimum_guarantee ?? null
      }))

      normalizedRequests.forEach((request: any) => {
        console.log('Musician booking request venue name:', {
          requestId: request.id,
          venueName: request.venue_name
        })
      })

      setRequestsError(null)
      setBookingRequests(normalizedRequests)
      return musicianProfile
    } catch (error) {
      console.error('Error loading booking requests:', error)
      setRequestsError(error instanceof Error ? error.message : 'Unknown booking request error')
      setBookingRequests([])
      return null
    } finally {
      setRequestsLoading(false)
    }
  }

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const [profileResult, artistResult, hostResult] = await Promise.all([
        supabase.from('profiles').select('user_type, email_notifications').eq('id', user.id).single(),
        supabase.from('artist_profiles').select('id, name').eq('user_id', user.id).maybeSingle(),
        supabase.from('host_profiles').select('id').eq('user_id', user.id).maybeSingle(),
      ])

      setEmailNotifications(profileResult.data?.email_notifications !== false)

      const hasArtist = !!artistResult.data?.id
      const hasHost = !!hostResult.data?.id

      setHasArtistProfile(hasArtist)
      setHasHostProfile(hasHost)
      if (artistResult.data?.name) setArtistProfileName(artistResult.data.name)

      const savedView = typeof window !== 'undefined'
        ? window.localStorage.getItem(ACTIVE_VIEW_KEY)
        : null

      const resolvedView: 'musician' | 'host' =
        savedView === 'host' || savedView === 'musician'
          ? savedView
          : hasHost && !hasArtist
            ? 'host'
            : 'musician'

      setUser({
        id: user.id,
        email: user.email,
        user_type: profileResult.data?.user_type || 'musician',
      })
      setActiveView(resolvedView)
    }

    loadUser()
  }, [])

  useEffect(() => {
    const loadBookingRequests = async () => {
      if (!user?.id) {
        setRequestsLoading(false)
        return
      }
      await loadMusicianBookingRequests(user.id)
    }

    loadBookingRequests()
  }, [user?.id])

  useEffect(() => {
    const loadHostRequests = async () => {
      if (!user?.id) {
        setHostRequestsLoading(false)
        return
      }

      try {
        const { data: hostProfile, error: hostProfileError } = await supabase
          .from('host_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (hostProfileError) {
          console.error('Host profile lookup error:', hostProfileError)
          setHostRequestsError(hostProfileError.message || 'Unable to load host profile')
          setHostRequests([])
          return
        }

        if (!hostProfile?.id) {
          setHostRequestsError(null)
          setHostRequests([])
          return
        }

        console.log('Loading host incoming booking requests:', {
          hostProfileId: hostProfile.id
        })
        const { data: requests, error } = await supabase
          .from('booking_requests')
          .select('id, created_at, venue_address, proposed_date, ticket_price, host_split, musician_split, proposed_host_pct, proposed_musician_pct, proposed_platform_pct, guaranteed_minimum, message, status, host_id, musician_id')
          .eq('host_id', hostProfile.id)
          .neq('status', 'accepted')
          .neq('status', 'confirmed')
          .neq('status', 'declined')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Host booking requests error:', error)
          setHostRequestsError(error.message || 'Unknown host booking request error')
        } else {
          setHostRequestsError(null)
        }

        const requestsList = requests || []
        const musicianIds = Array.from(
          new Set(
            requestsList
              .map((request: any) => request.musician_id)
              .filter(Boolean)
          )
        ) as string[]

        let musicianNameById: Record<string, string> = {}
        let musicianGuaranteeById: Record<string, number | null> = {}
        let venueNameByHostId: Record<string, string> = {}

        console.log('Loading host profiles for host booking requests:', {
          hostIds: [hostProfile.id]
        })
        const { data: hostProfiles, error: hostProfilesError } = await supabase
          .from('host_profiles')
          .select('id, user_id, venue_name')
          .eq('id', hostProfile.id)

        if (hostProfilesError) {
          console.error('Host booking requests host profile lookup error:', hostProfilesError)
        } else {
          venueNameByHostId = (hostProfiles || []).reduce((acc: Record<string, string>, profile: any) => {
            acc[profile.id] = profile.venue_name || 'Venue TBD'
            return acc
          }, {})
        }

        if (musicianIds.length > 0) {
          console.log('Loading musician profiles for host booking requests:', { musicianIds })
          const { data: musicianProfiles, error: musicianProfilesError } = await supabase
            .from('artist_profiles')
            .select('id, name, minimum_guarantee')
            .in('id', musicianIds)

          if (musicianProfilesError) {
            console.error('Host booking requests musician profile lookup error:', musicianProfilesError)
          } else {
            musicianNameById = (musicianProfiles || []).reduce((acc: Record<string, string>, profile: any) => {
              acc[profile.id] = profile.name || 'Musician'
              return acc
            }, {})
            musicianGuaranteeById = (musicianProfiles || []).reduce((acc: Record<string, number | null>, profile: any) => {
              acc[profile.id] = profile.minimum_guarantee ?? null
              return acc
            }, {})
          }
        }

        const normalizedRequests = requestsList.map((request: any) => ({
          ...request,
          musician_name: musicianNameById[request.musician_id] || 'Musician',
          venue_name: venueNameByHostId[request.host_id] || 'Venue TBD',
          minimum_guarantee: musicianGuaranteeById[request.musician_id] ?? null
        }))

        normalizedRequests.forEach((request: any) => {
          console.log('Host booking request venue name:', {
            requestId: request.id,
            venueName: request.venue_name
          })
        })

        setHostRequests(normalizedRequests)
      } catch (error) {
        console.error('Error loading host booking requests:', error)
        setHostRequestsError(error instanceof Error ? error.message : 'Unknown host booking request error')
      } finally {
        setHostRequestsLoading(false)
      }
    }

    loadHostRequests()
  }, [user?.id])

  useEffect(() => {
    const loadHostShows = async () => {
      if (!user?.id) return

      try {
        console.log('Loading host shows for dashboard:', { userId: user.id })
        const { data: shows, error } = await supabase
          .from('shows')
          .select('*')
          .or(`host_user_id.eq.${user.id},artist_user_id.eq.${user.id}`)

        if (error) {
          console.error('Error loading host shows:', error)
          return
        }

        setHostShows((shows || []).map((show: any) => ({
          id: show.id,
          host_id: getShowHostId(show),
          artist_user_id: getShowArtistId(show),
          date: getShowDateValue(show),
          venue_address: show.venue_address
        })))
      } catch (error) {
        console.error('Error loading host shows:', error)
      }
    }

    loadHostShows()
  }, [user?.id])

  useEffect(() => {
    const loadMusicianShows = async () => {
      if (!user?.id) return

      try {
        console.log('Loading musician shows for dashboard:', { userId: user.id })
        const { data: shows, error } = await supabase
          .from('shows')
          .select('*')
          .eq('artist_user_id', user.id)

        if (error) {
          console.error('Error loading musician shows:', error)
          return
        }

        setMusicianShows((shows || []).map((show: any) => ({
          id: show.id,
          host_id: getShowHostId(show),
          artist_user_id: getShowArtistId(show),
          date: getShowDateValue(show),
          venue_address: show.venue_address
        })))
      } catch (error) {
        console.error('Error loading musician shows:', error)
      }
    }

    loadMusicianShows()
  }, [user?.id])

  useEffect(() => {
    const loadTicketShows = async () => {
      if (!user?.id) {
        setTicketShowsLoading(false)
        return
      }

      try {
        const { data: tickets, error: ticketError } = await supabase
          .from('tickets')
          .select('id, show_id, status')
          .eq('user_id', user.id)

        if (ticketError) {
          console.error('Error loading tickets for dashboard:', ticketError)
          setTicketShows([])
          return
        }

        const showIds = Array.from(new Set((tickets || []).map((ticket: any) => ticket.show_id).filter(Boolean)))
        if (!showIds.length) {
          setTicketShows([])
          return
        }

        const { data: shows, error: showsError } = await supabase
          .from('shows')
          .select('id, artist_name, show_date, venue_name, full_address')
          .in('id', showIds)

        if (showsError) {
          console.error('Error loading ticket show details:', showsError)
          setTicketShows([])
          return
        }

        const showsById = (shows || []).reduce((acc: Record<string, any>, show: any) => {
          acc[show.id] = show
          return acc
        }, {})

        const mappedTickets = (tickets || [])
          .map((ticket: any) => {
            const show = showsById[ticket.show_id]
            if (!show) return null

            return {
              ticketId: ticket.id,
              showId: ticket.show_id,
              artistName: show.artist_name || 'HouseShow Event',
              showDate: show.show_date || '',
              venueName: show.venue_name || 'Venue TBD',
              fullAddress: show.full_address || null,
              status: ticket.status || 'active'
            }
          })
          .filter(Boolean) as TicketShow[]

        setTicketShows(mappedTickets)
      } catch (error) {
        console.error('Error loading dashboard ticket shows:', error)
        setTicketShows([])
      } finally {
        setTicketShowsLoading(false)
      }
    }

    loadTicketShows()
  }, [user?.id])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const switchView = (newView: 'musician' | 'host') => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_VIEW_KEY, newView)
    }
    setActiveView(newView)
  }

  const updateBookingRequestStatus = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      setUpdatingRequestId(requestId)

      if (status === 'accepted') {
        const {
          data: { user: authUser },
          error: authError
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          console.error('Error loading authenticated user while accepting booking request:', authError)
          return
        }

        const { data: request, error: requestError } = await supabase
          .from('booking_requests')
          .select('id, musician_id')
          .eq('id', requestId)
          .maybeSingle()

        if (requestError || !request) {
          console.error('Error loading booking request before accept:', requestError)
          return
        }

        const { data: currentMusicianProfile, error: currentMusicianProfileError } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (currentMusicianProfileError) {
          console.error('Error loading authenticated musician profile while accepting booking request:', currentMusicianProfileError)
          return
        }

      }

      const { error } = await supabase
        .from('booking_requests')
        .update({ status })
        .eq('id', requestId)

      if (error) {
        console.error(`Error updating booking request to ${status}:`, error)
        return
      }

      if (status === 'accepted') {
        setBookingRequests(prev => prev.filter(r => r.id !== requestId))
        setHostRequests(prev => prev.filter(r => r.id !== requestId))
        return
      }

      setBookingRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status } : r)
      )
      setHostRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status } : r)
      )
    } catch (error) {
      console.error(`Error updating booking request to ${status}:`, error)
    } finally {
      setUpdatingRequestId(null)
    }
  }

  const openCounterOffer = (requestId: string) => {
    setActiveCounterOfferId(requestId)
    setCounterOfferValues({
      musician: String(DEFAULT_COUNTER_SPLIT.musician),
      host: String(DEFAULT_COUNTER_SPLIT.host),
      platform: String(DEFAULT_COUNTER_SPLIT.platform)
    })
    setCounterOfferError(null)
  }

  const updateCounterOfferSplit = (field: 'musician' | 'host', value: string) => {
    const nextValue = value.trim()
    const parsedValue = parseSplitValue(nextValue)
    const boundedValue = Math.max(0, Math.min(NEGOTIABLE_SPLIT_TOTAL, parsedValue))
    const pairedValue = NEGOTIABLE_SPLIT_TOTAL - boundedValue

    setCounterOfferValues((prev) => ({
      ...prev,
      musician: field === 'musician' ? String(boundedValue) : String(pairedValue),
      host: field === 'host' ? String(boundedValue) : String(pairedValue),
      platform: String(LOCKED_PLATFORM_PCT)
    }))
    setCounterOfferError(null)
  }

  const submitCounterOffer = async (requestId: string) => {
    const musicianPct = Number.parseInt(counterOfferValues.musician, 10) || 0
    const hostPct = Number.parseInt(counterOfferValues.host, 10) || 0
    const platformPct = LOCKED_PLATFORM_PCT

    if (musicianPct + hostPct + platformPct !== 100) {
      setCounterOfferError('Musician %, Host %, and Platform % must total exactly 100.')
      return
    }

    try {
      setUpdatingRequestId(requestId)
      const { error } = await supabase
        .from('booking_requests')
        .update({
          proposed_musician_pct: musicianPct,
          proposed_host_pct: hostPct,
          proposed_platform_pct: platformPct,
          status: 'negotiating'
        })
        .eq('id', requestId)

      if (error) {
        console.error('Error submitting counter offer:', error)
        setCounterOfferError(error.message || 'Unable to submit counter offer.')
        return
      }

      const applyCounterOffer = (request: BookingRequest) =>
        request.id === requestId
          ? {
              ...request,
              proposed_musician_pct: musicianPct,
              proposed_host_pct: hostPct,
              proposed_platform_pct: platformPct,
              status: 'negotiating' as const
            }
          : request

      setBookingRequests((prev) => prev.map(applyCounterOffer))
      setHostRequests((prev) => prev.map(applyCounterOffer))
      setActiveCounterOfferId(null)
      setCounterOfferError(null)
    } catch (error) {
      console.error('Error submitting counter offer:', error)
      setCounterOfferError(error instanceof Error ? error.message : 'Unable to submit counter offer.')
    } finally {
      setUpdatingRequestId(null)
    }
  }

  const acceptCounterOffer = async (request: BookingRequest) => {
    if (
      request.proposed_musician_pct == null ||
      request.proposed_host_pct == null ||
      request.proposed_platform_pct == null
    ) {
      return
    }

    try {
      setUpdatingRequestId(request.id)
      const { error } = await supabase
        .from('booking_requests')
        .update({
          musician_split: request.proposed_musician_pct,
          host_split: request.proposed_host_pct,
          status: 'accepted'
        })
        .eq('id', request.id)

      if (error) {
        console.error('Error accepting counter offer:', error)
        return
      }

      const applyAcceptedOffer = (item: BookingRequest) =>
        item.id === request.id
          ? {
              ...item,
              musician_split: request.proposed_musician_pct ?? item.musician_split,
              host_split: request.proposed_host_pct ?? item.host_split,
              status: 'accepted' as const
            }
          : item

      setBookingRequests((prev) => prev.map(applyAcceptedOffer))
      setHostRequests((prev) => prev.map(applyAcceptedOffer))
    } catch (error) {
      console.error('Error accepting counter offer:', error)
    } finally {
      setUpdatingRequestId(null)
    }
  }

  const renderCounterOfferForm = (requestId: string) => (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      borderRadius: '8px',
      background: 'rgba(26,20,16,0.45)',
      border: '1px solid rgba(212,130,10,0.2)'
    }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>
        Counter Offer Split
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '12px' }}>
        {[
          { key: 'musician', label: 'Musician %', value: counterOfferValues.musician, disabled: false },
          { key: 'host', label: 'Host %', value: counterOfferValues.host, disabled: false },
          { key: 'platform', label: 'Platform %', value: counterOfferValues.platform, disabled: true }
        ].map((field) => (
          <div key={field.key}>
            <label style={{ display: 'block', fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.8rem', marginBottom: '6px' }}>
              {field.label}
            </label>
            <input
              type="number"
              value={field.value}
              disabled={field.disabled}
              onChange={(e) => {
                if (field.disabled) return
                updateCounterOfferSplit(field.key as 'musician' | 'host', e.target.value)
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '6px',
                background: field.disabled ? 'rgba(44,34,24,0.2)' : 'rgba(44,34,24,0.3)',
                color: '#F5F0E8',
                fontFamily: "'DM Sans', sans-serif"
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.85rem', marginBottom: '12px' }}>
        Guaranteed minimum: {activeCounterOfferId && ([...bookingRequests, ...hostRequests].find((request) => request.id === activeCounterOfferId)?.minimum_guarantee != null)
          ? `$${Number([...bookingRequests, ...hostRequests].find((request) => request.id === activeCounterOfferId)?.minimum_guarantee).toFixed(2)}`
          : 'Not set'}
      </div>
      {counterOfferError && (
        <div style={{ color: '#F5B5B5', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', marginBottom: '12px' }}>
          {counterOfferError}
        </div>
      )}
      {!isCounterOfferTotalValid && (
        <div style={{ color: '#FCA5A5', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', marginBottom: '12px' }}>
          Musician %, Host %, and Platform % must total exactly 100. Current total: {counterOfferTotal}%.
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => submitCounterOffer(requestId)}
          disabled={updatingRequestId === requestId || !isCounterOfferTotalValid}
          style={{
            background: '#D4820A',
            color: '#1A1410',
            border: '1px solid #D4820A',
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: updatingRequestId === requestId || !isCounterOfferTotalValid ? 'not-allowed' : 'pointer',
            opacity: updatingRequestId === requestId || !isCounterOfferTotalValid ? 0.6 : 1,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: '600'
          }}
        >
          Submit Counter Offer
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveCounterOfferId(null)
            setCounterOfferError(null)
          }}
          style={{
            background: 'transparent',
            color: '#F5F0E8',
            border: '1px solid rgba(212,130,10,0.3)',
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: '600'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )

  const formatDate = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const findHostShowForRequest = (request: BookingRequest) =>
    hostShows.find(show =>
      show.host_id === request.host_id &&
      show.artist_user_id === request.musician_id &&
      show.date === getRequestDateValue(request) &&
      show.venue_address === request.venue_address
    )

  const getHostTicketingHref = (request: BookingRequest) => {
    const matchingShow = findHostShowForRequest(request)
    return matchingShow ? `/show/${matchingShow.id}` : `/create-show?requestId=${request.id}`
  }

  const findMusicianShowForRequest = (request: BookingRequest) =>
    musicianShows.find(show =>
      show.host_id === request.host_id &&
      show.artist_user_id === user?.id &&
      show.date === getRequestDateValue(request) &&
      show.venue_address === request.venue_address
    )

  const getMusicianTicketingHref = (request: BookingRequest) => {
    const matchingShow = findMusicianShowForRequest(request)
    return matchingShow ? `/show/${matchingShow.id}` : `/create-show?requestId=${request.id}`
  }

  const bgLayers = (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, backgroundImage: 'url(/images/social-proof/contact-sheet.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, background: 'rgba(30, 15, 5, 0.85)' }} />
    </>
  )

  if (user?.user_type === 'fan') {
    return (
      <>
        {bgLayers}
        <main style={{ minHeight: '100vh', position: 'relative', zIndex: 1, padding: '48px' }}>
          <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
            <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid rgba(212,130,10,0.3)', color: '#8C7B6B', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem' }}>
              Sign Out
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Discover Shows Near You
          </h1>

          <a
            href="/shows"
            style={{
              display: 'inline-block',
              marginBottom: '28px',
              background: 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410',
              textDecoration: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700
            }}
          >
            Browse Upcoming Shows
          </a>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <a href="/tickets" style={{
              display: 'block', border: '1px solid #E5E2DC', borderRadius: '8px',
              padding: '28px 24px', background: '#FAFAF8', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)', textDecoration: 'none',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>🎟️</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#1A1410', marginBottom: '6px' }}>My Tickets</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#5C5248' }}>View your purchased tickets and QR codes</p>
            </a>
            <a href="/following" style={{
              display: 'block', border: '1px solid #E5E2DC', borderRadius: '8px',
              padding: '28px 24px', background: '#FAFAF8', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)', textDecoration: 'none',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>⭐</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#1A1410', marginBottom: '6px' }}>Following</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#5C5248' }}>Artists you follow and their upcoming shows</p>
            </a>
          </div>
        </div>
      </main>
      </>
    )
  }

  return (
    <>
      {bgLayers}
      <main style={{ minHeight: '100vh', position: 'relative', zIndex: 1, padding: '48px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="/tickets"
            style={{
              border: '1px solid rgba(212,130,10,0.3)',
              color: '#F5F0E8',
              padding: '8px 16px',
              borderRadius: '4px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            My Tickets
          </a>
          <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid rgba(212,130,10,0.3)', color: '#8C7B6B', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Role banner / onboarding prompt */}
        {user?.user_type !== 'fan' && !hasArtistProfile && !hasHostProfile && (
          <div style={{ marginBottom: '48px', border: '1px solid #E5E2DC', borderRadius: '8px', padding: '24px', background: '#FAFAF8', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#B06E08', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Get Started
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#1A1410', fontSize: '1rem', marginBottom: '20px' }}>
              What brings you to HouseShow?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a href="/profile" style={{ padding: '12px 18px', borderRadius: '6px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', fontWeight: '600', border: '1px solid #D4820A', background: '#D4820A', color: '#1A1410', textDecoration: 'none' }}>
                I&apos;m a Musician
              </a>
              <a href="/host-profile" style={{ padding: '12px 18px', borderRadius: '6px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', fontWeight: '600', border: '1px solid #D4820A', background: 'transparent', color: '#1A1410', textDecoration: 'none' }}>
                I&apos;m a Host
              </a>
            </div>
          </div>
        )}
        {hasArtistProfile && hasHostProfile && (
          <div style={{ marginBottom: '32px', border: '1px solid #E5E2DC', borderRadius: '8px', padding: '20px 24px', background: '#FAFAF8', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#1A1410', fontSize: '0.95rem', margin: 0 }}>
              {activeView === 'musician'
                ? 'You also have a host profile.'
                : 'You also have a musician profile.'}
            </p>
            <button
              onClick={() => switchView(activeView === 'musician' ? 'host' : 'musician')}
              style={{ padding: '10px 16px', borderRadius: '6px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', fontWeight: '600', border: '1px solid #D4820A', background: 'transparent', color: '#D4820A', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {activeView === 'musician' ? 'Switch to Host View' : 'Switch to Musician View'}
            </button>
          </div>
        )}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
          You&apos;re in
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', color: '#F5F0E8', marginBottom: '16px' }}>
          Welcome to HouseShow
        </h1>
        {user && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '24px' }}>
            Signed in as <span style={{ color: '#F0A500' }}>{user.email}</span>
          </p>
        )}

        {user && (
          <div style={{
            marginBottom: '32px',
            border: '1px solid #E5E2DC',
            borderRadius: '10px',
            padding: '18px 22px',
            background: '#FAFAF8',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#1A1410', fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>
                Email Notifications
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#5C5248', fontSize: '0.82rem' }}>
                Receive emails when you get booking requests or when a host accepts/declines.
              </div>
            </div>
            <button
              onClick={async () => {
                if (emailNotificationsLoading) return
                const next = !emailNotifications
                setEmailNotificationsLoading(true)
                setEmailNotifications(next)
                const { error } = await supabase
                  .from('profiles')
                  .update({ email_notifications: next })
                  .eq('id', user.id)
                if (error) {
                  console.error('Failed to update email notification preference:', error)
                  setEmailNotifications(!next)
                }
                setEmailNotificationsLoading(false)
              }}
              disabled={emailNotificationsLoading}
              style={{
                position: 'relative',
                width: '48px',
                height: '26px',
                borderRadius: '13px',
                border: 'none',
                background: emailNotifications ? '#D4820A' : 'rgba(140,123,107,0.3)',
                cursor: emailNotificationsLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
                padding: 0,
              }}
              aria-label={emailNotifications ? 'Disable email notifications' : 'Enable email notifications'}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: emailNotifications ? '24px' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#F5F0E8',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            ...(user?.user_type === 'fan'
              ? [
                { icon: '🗺️', title: 'Shows Near Me', desc: 'Find upcoming house shows near you', href: '/shows' },
                { icon: '🎵', title: 'Browse Artists', desc: 'Discover musicians in your area', href: '/browse' },
                { icon: '🎟️', title: 'My Tickets', desc: 'View your purchased tickets and QR codes', href: '/tickets' },
                { icon: '⭐', title: 'Artists I Follow', desc: 'Artists you\'re keeping up with', href: '/following' },
              ]
              : activeView === 'host'
                ? [
                  { icon: '🏠', title: 'My Host Profile', desc: 'Build your host profile', href: '/host-profile' },
                  { icon: '🎵', title: 'Find Musicians', desc: 'Discover and invite local musicians', href: '/browse' },
                  { icon: '📅', title: 'My Bookings', desc: 'Manage your upcoming shows', href: '/bookings' },
                  { icon: '🎫', title: 'My Tickets', desc: 'View your purchased tickets and QR codes', href: '/tickets' },
                ]
                : [
                  { icon: '🎸', title: 'My Artist Profile', desc: 'Build your musician profile', href: '/profile' },
                  { icon: '🏠', title: 'Find Hosts', desc: 'Discover hosts and venues near you', href: '/find-hosts' },
                  { icon: '📅', title: 'My Bookings', desc: 'Manage your upcoming shows', href: '/bookings' },
                  { icon: '🎫', title: 'My Tickets', desc: 'View your purchased tickets and QR codes', href: '/tickets' },
                ])
          ].flat().map((card) => (
            <a key={card.title} href={card.href} style={{
              display: 'block', border: '1px solid #E5E2DC', borderRadius: '8px',
              padding: '28px 24px', background: '#FAFAF8', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              textDecoration: 'none',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{card.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#1A1410', marginBottom: '6px' }}>{card.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#5C5248' }}>{card.desc}</p>
            </a>
          ))}
        </div>

        {activeView === 'musician' && hasArtistProfile && artistProfileName && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => {
                const slug = artistProfileName
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '')
                const url = `${window.location.origin}/artist/${slug}/tour-dates`
                navigator.clipboard.writeText(url).then(() => {
                  setTourDatesCopied(true)
                  setTimeout(() => setTourDatesCopied(false), 2500)
                })
              }}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '8px',
                border: '1px solid #E5E2DC',
                background: '#FAFAF8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#1A1410',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {tourDatesCopied ? 'Link Copied!' : 'Share Tour Dates'}
            </button>
          </div>
        )}

        {user?.user_type === 'fan' && (
          <section style={{ marginTop: '32px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
              My Tickets
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {ticketShowsLoading ? (
                <div style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(44,34,24,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#8C7B6B'
                }}>
                  Loading tickets...
                </div>
              ) : ticketShows.length === 0 ? (
                <div style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(44,34,24,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#8C7B6B'
                }}>
                  No confirmed tickets yet.
                </div>
              ) : ticketShows.map((ticket) => (
                <div
                  key={ticket.ticketId}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    padding: '24px',
                    background: 'rgba(44,34,24,0.3)'
                  }}
                >
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '8px' }}>
                    {ticket.artistName}
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B', marginBottom: '6px' }}>
                    {ticket.venueName}
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B', marginBottom: '6px' }}>
                    {ticket.showDate ? formatDate(ticket.showDate) : 'Date TBD'}
                  </p>
                  {ticket.status === 'refunded' && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#F0A500', marginBottom: '6px' }}>Refunded</p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {ticket.fullAddress ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ticket.fullAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(26,20,16,0.8)',
                          color: '#F5F0E8',
                          border: '1px solid rgba(212,130,10,0.35)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          textDecoration: 'none',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        Get Directions
                      </a>
                    ) : null}
                    {ticket.status !== 'refunded' && ticket.showDate && new Date(ticket.showDate) > new Date() && (
                      <button
                        onClick={() => handleRefundRequest(ticket.ticketId)}
                        disabled={refundLoading[ticket.ticketId]}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(180,70,70,0.4)',
                          color: '#F5B5B5',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '0.85rem',
                          fontFamily: "'DM Sans', sans-serif",
                          cursor: refundLoading[ticket.ticketId] ? 'not-allowed' : 'pointer',
                          opacity: refundLoading[ticket.ticketId] ? 0.6 : 1
                        }}
                      >
                        {refundLoading[ticket.ticketId] ? 'Processing...' : 'Request Refund'}
                      </button>
                    )}
                  </div>
                  {refundMessages[ticket.ticketId] && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '0.85rem',
                      color: refundMessages[ticket.ticketId].success ? '#8FD694' : '#F5B5B5'
                    }}>
                      {refundMessages[ticket.ticketId].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {false && activeView === 'musician' && user?.user_type !== 'fan' && (
          <section style={{ marginTop: '48px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
              Incoming Booking Requests
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {requestsLoading ? (
                <div style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(44,34,24,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#8C7B6B'
                }}>
                  Loading requests...
                </div>
              ) : requestsError ? (
                <div style={{
                  border: '1px solid rgba(160,60,60,0.4)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(80,20,20,0.2)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#F5B5B5'
                }}>
                  Booking request error: {requestsError}
                </div>
              ) : bookingRequests.length === 0 ? (
                <div style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(44,34,24,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#8C7B6B'
                }}>
                  No booking requests yet.
                </div>
              ) : bookingRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    padding: '24px',
                    background: 'rgba(44,34,24,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#F5F0E8', marginBottom: '8px' }}>
                        Booking Request
                      </h3>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.95rem', marginBottom: '6px' }}>
                        Requester: {request.requester_name || 'Host'}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.95rem', marginBottom: '6px' }}>
                        Venue: {request.venue_name || request.venue_address || 'Venue TBD'}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.95rem' }}>
                        Proposed Date: {formatDate(request.proposed_date)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1rem', color: '#F0A500', marginBottom: '8px' }}>
                        ${request.ticket_price ?? 0}
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        borderRadius: '999px',
                        border: '1px solid rgba(212,130,10,0.3)',
                        color: '#F5F0E8',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.8rem',
                        textTransform: 'capitalize'
                      }}>
                        {request.status}
                      </div>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(26,20,16,0.35)',
                      color: '#F5F0E8',
                      fontFamily: "'DM Sans', sans-serif"
                    }}>
                      A host wants to book you — accept or make a counter offer.
                    </div>
                  )}

                  {request.status === 'negotiating' && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(26,20,16,0.35)',
                      color: '#F5F0E8',
                      fontFamily: "'DM Sans', sans-serif"
                    }}>
                      Counter offer received: Musician {request.proposed_musician_pct ?? DEFAULT_COUNTER_SPLIT.musician}% • Host {request.proposed_host_pct ?? DEFAULT_COUNTER_SPLIT.host}% • Platform {request.proposed_platform_pct ?? DEFAULT_COUNTER_SPLIT.platform}%
                      <div style={{ marginTop: '6px', color: '#8C7B6B', fontSize: '0.9rem' }}>
                        Guaranteed minimum: {request.minimum_guarantee != null ? `$${Number(request.minimum_guarantee).toFixed(2)}` : 'Not set'}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedBookingRequestId((prev) => prev === request.id ? null : request.id)}
                      style={{
                        background: 'transparent',
                        color: '#F5F0E8',
                        border: '1px solid rgba(212,130,10,0.35)',
                        borderRadius: '6px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: '600'
                      }}
                    >
                      {expandedBookingRequestId === request.id ? 'Hide Details' : 'View Details'}
                    </button>
                    {request.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateBookingRequestStatus(request.id, 'accepted')}
                          disabled={updatingRequestId === request.id}
                          style={{
                            background: '#D4820A',
                            color: '#1A1410',
                            border: '1px solid #D4820A',
                            borderRadius: '6px',
                            padding: '10px 16px',
                            cursor: updatingRequestId === request.id ? 'not-allowed' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: '600'
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => openCounterOffer(request.id)}
                          style={{
                            background: 'transparent',
                            color: '#F5F0E8',
                            border: '1px solid rgba(212,130,10,0.35)',
                            borderRadius: '6px',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: '600'
                          }}
                        >
                          Counter Offer
                        </button>
                      </>
                    )}
                    {request.status === 'negotiating' && (
                      <>
                        <button
                          type="button"
                          onClick={() => acceptCounterOffer(request)}
                          disabled={updatingRequestId === request.id}
                          style={{
                            background: '#D4820A',
                            color: '#1A1410',
                            border: '1px solid #D4820A',
                            borderRadius: '6px',
                            padding: '10px 16px',
                            cursor: updatingRequestId === request.id ? 'not-allowed' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: '600'
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => openCounterOffer(request.id)}
                          style={{
                            background: 'transparent',
                            color: '#F5F0E8',
                            border: '1px solid rgba(212,130,10,0.35)',
                            borderRadius: '6px',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: '600'
                          }}
                        >
                          Counter
                        </button>
                      </>
                    )}
                    {request.status === 'accepted' && (
                      <a
                        href={getMusicianTicketingHref(request)}
                        style={{
                          display: 'inline-block',
                          background: '#D4820A',
                          color: '#1A1410',
                          border: '1px solid #D4820A',
                          borderRadius: '6px',
                          padding: '10px 16px',
                          textDecoration: 'none',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        {findMusicianShowForRequest(request) ? 'Open Ticketing' : 'Create Show Link'}
                      </a>
                    )}
                  </div>
                  {expandedBookingRequestId === request.id && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(212,130,10,0.16)',
                      display: 'grid',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem' }}>
                          <span style={{ color: '#8C7B6B' }}>Host:</span> {request.requester_name || 'Host'}
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem' }}>
                          <span style={{ color: '#8C7B6B' }}>Venue/Address:</span> {request.venue_name || request.venue_address || 'Venue TBD'}
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem' }}>
                          <span style={{ color: '#8C7B6B' }}>Proposed Date:</span> {formatDate(request.proposed_date)}
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem' }}>
                          <span style={{ color: '#8C7B6B' }}>Ticket Price:</span> ${request.ticket_price ?? 0}
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem' }}>
                          <span style={{ color: '#8C7B6B' }}>Revenue Split:</span> You: {request.musician_split ?? 60}% • Host: {request.host_split ?? 33}% • Platform: 7%
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem' }}>
                          <span style={{ color: '#8C7B6B' }}>Guaranteed Minimum:</span> {request.minimum_guarantee != null ? `$${Number(request.minimum_guarantee).toFixed(2)}` : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.85rem', marginBottom: '6px' }}>
                          Message
                        </div>
                        <div style={{
                          fontFamily: "'DM Sans', sans-serif",
                          color: '#F5F0E8',
                          fontSize: '0.95rem',
                          lineHeight: '1.5',
                          background: 'rgba(26,20,16,0.35)',
                          borderRadius: '8px',
                          padding: '12px'
                        }}>
                          {request.message || 'No message provided.'}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeCounterOfferId === request.id && renderCounterOfferForm(request.id)}
                </div>
              ))}
            </div>
          </section>
        )}

        {false && activeView === 'host' && (
          <section style={{ marginTop: '48px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
              Incoming Booking Requests
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {hostRequestsLoading ? (
                <div style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(44,34,24,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#8C7B6B'
                }}>
                  Loading requests...
                </div>
              ) : hostRequestsError ? (
                <div style={{
                  border: '1px solid rgba(160,60,60,0.4)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(80,20,20,0.2)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#F5B5B5'
                }}>
                  Booking request error: {hostRequestsError}
                </div>
              ) : hostRequests.length === 0 ? (
                <div style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '24px',
                  background: 'rgba(44,34,24,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#8C7B6B'
                }}>
                  No booking requests yet.
                </div>
              ) : hostRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    padding: '24px',
                    background: 'rgba(44,34,24,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#F5F0E8', marginBottom: '8px' }}>
                        Booking Request
                      </h3>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.95rem', marginBottom: '6px' }}>
                        Musician: {request.musician_name || 'Musician'}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.95rem', marginBottom: '6px' }}>
                        Venue: {request.venue_name || request.venue_address || 'Venue TBD'}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.95rem' }}>
                        Proposed Date: {formatDate(request.proposed_date)}
                      </p>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: '999px',
                      border: '1px solid rgba(212,130,10,0.3)',
                      color: '#F5F0E8',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.8rem',
                      textTransform: 'capitalize',
                      height: 'fit-content'
                    }}>
                      {request.status}
                    </div>
                  </div>

                  <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(26,20,16,0.35)',
                    color: '#F5F0E8',
                    fontFamily: "'DM Sans', sans-serif"
                  }}>
                    {request.status === 'accepted'
                      ? 'You accepted this request. You can now create and share the ticket page.'
                      : request.status === 'declined'
                        ? 'You declined this request.'
                        : request.status === 'negotiating'
                          ? `Counter offer proposed: Musician ${request.proposed_musician_pct ?? DEFAULT_COUNTER_SPLIT.musician}% • Host ${request.proposed_host_pct ?? DEFAULT_COUNTER_SPLIT.host}% • Platform ${request.proposed_platform_pct ?? DEFAULT_COUNTER_SPLIT.platform}%`
                        : 'Waiting for your response.'}
                    <div style={{ marginTop: '6px', color: '#8C7B6B', fontSize: '0.9rem' }}>
                      Guaranteed minimum: {request.minimum_guarantee != null ? `$${Number(request.minimum_guarantee).toFixed(2)}` : 'Not set'}
                    </div>
                  </div>

                  {request.message && (
                    <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.95rem' }}>
                      Message: <span style={{ color: '#F5F0E8' }}>{request.message}</span>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button
                        onClick={() => updateBookingRequestStatus(request.id, 'accepted')}
                        disabled={updatingRequestId === request.id}
                        style={{
                          background: '#D4820A',
                          color: '#1A1410',
                          border: '1px solid #D4820A',
                          borderRadius: '6px',
                          padding: '10px 16px',
                          cursor: updatingRequestId === request.id ? 'not-allowed' : 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateBookingRequestStatus(request.id, 'declined')}
                        disabled={updatingRequestId === request.id}
                        style={{
                          background: 'transparent',
                          color: '#F5F0E8',
                          border: '1px solid rgba(212,130,10,0.3)',
                          borderRadius: '6px',
                          padding: '10px 16px',
                          cursor: updatingRequestId === request.id ? 'not-allowed' : 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => openCounterOffer(request.id)}
                        disabled={updatingRequestId === request.id}
                        style={{
                          background: 'transparent',
                          color: '#F5F0E8',
                          border: '1px solid rgba(212,130,10,0.3)',
                          borderRadius: '6px',
                          padding: '10px 16px',
                          cursor: updatingRequestId === request.id ? 'not-allowed' : 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        Counter Offer
                      </button>
                    </div>
                  )}

                  {request.status === 'negotiating' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => acceptCounterOffer(request)}
                        disabled={updatingRequestId === request.id}
                        style={{
                          background: '#D4820A',
                          color: '#1A1410',
                          border: '1px solid #D4820A',
                          borderRadius: '6px',
                          padding: '10px 16px',
                          cursor: updatingRequestId === request.id ? 'not-allowed' : 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => openCounterOffer(request.id)}
                        style={{
                          background: 'transparent',
                          color: '#F5F0E8',
                          border: '1px solid rgba(212,130,10,0.3)',
                          borderRadius: '6px',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        Counter
                      </button>
                    </div>
                  )}

                  {request.status === 'accepted' && (
                    <div style={{ marginTop: '16px' }}>
                      <a
                        href={getHostTicketingHref(request)}
                        style={{
                          display: 'inline-block',
                          background: '#D4820A',
                          color: '#1A1410',
                          border: '1px solid #D4820A',
                          borderRadius: '6px',
                          padding: '10px 16px',
                          textDecoration: 'none',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: '600'
                        }}
                      >
                        {findHostShowForRequest(request) ? 'Open Shareable Ticket Page' : 'Create Ticket Page'}
                      </a>
                    </div>
                  )}
                  {activeCounterOfferId === request.id && renderCounterOfferForm(request.id)}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
    </>
  )
}
