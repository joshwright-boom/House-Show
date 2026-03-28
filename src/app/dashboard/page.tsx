'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BookingRequest {
  id: string
  host_id: string
  musician_id?: string
  musician_name?: string
  requester_name?: string
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
}

const getShowDateValue = (show: Record<string, any>) =>
  show.date || show.show_date || show.event_date || show.scheduled_date || ''

const getShowArtistId = (show: Record<string, any>) =>
  show.artist_user_id || show.artist_id || show.musician_id || null

const getShowHostId = (show: Record<string, any>) =>
  show.host_user_id || show.host_id || null

const getRequestDateValue = (request: BookingRequest) =>
  request.show_date || request.proposed_date || ''

const DEFAULT_COUNTER_SPLIT = {
  musician: 60,
  host: 33,
  platform: 7
}

export default function Dashboard() {
  // Required migration:
  // ALTER TABLE booking_requests
  // ADD COLUMN proposed_musician_pct INTEGER,
  // ADD COLUMN proposed_host_pct INTEGER,
  // ADD COLUMN proposed_platform_pct INTEGER;
  const [user, setUser] = useState<{ id: string; email?: string; user_type?: string; active_mode?: string } | null>(null)
  const [activeMode, setActiveMode] = useState<'musician' | 'host'>('musician')
  const [switchingMode, setSwitchingMode] = useState(false)
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])
  const [hostRequests, setHostRequests] = useState<BookingRequest[]>([])
  const [hostShows, setHostShows] = useState<HostShow[]>([])
  const [musicianShows, setMusicianShows] = useState<HostShow[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [hostRequestsLoading, setHostRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [hostRequestsError, setHostRequestsError] = useState<string | null>(null)
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)
  const [activeCounterOfferId, setActiveCounterOfferId] = useState<string | null>(null)
  const [counterOfferValues, setCounterOfferValues] = useState({
    musician: String(DEFAULT_COUNTER_SPLIT.musician),
    host: String(DEFAULT_COUNTER_SPLIT.host),
    platform: String(DEFAULT_COUNTER_SPLIT.platform)
  })
  const [counterOfferError, setCounterOfferError] = useState<string | null>(null)
  const [ticketShows, setTicketShows] = useState<TicketShow[]>([])
  const [ticketShowsLoading, setTicketShowsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      // Get user profile to determine user type and active mode
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, active_mode')
        .eq('id', user.id)
        .single()

      setUser({ 
        id: user.id,
        email: user.email,
        user_type: profile?.user_type || 'musician',
        active_mode: profile?.active_mode || 'musician'
      })
    }

    loadUser()
  }, [])

  useEffect(() => {
    const loadBookingRequests = async () => {
      if (!user?.id) {
        setRequestsLoading(false)
        return
      }

      try {
        const { data: musicianProfile, error: musicianProfileError } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (musicianProfileError) {
          console.error('Musician profile lookup error:', musicianProfileError)
          setRequestsError(musicianProfileError.message || 'Unable to load musician profile')
          setBookingRequests([])
          return
        }

        if (!musicianProfile?.id) {
          setRequestsError(null)
          setBookingRequests([])
          return
        }

        const { data: requests, error } = await supabase
          .from('booking_requests')
          .select('id, created_at, venue_address, proposed_date, ticket_price, host_split, musician_split, proposed_host_pct, proposed_musician_pct, proposed_platform_pct, message, status, host_id, musician_id')
          .eq('musician_id', musicianProfile.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Booking requests error:', error)
          setRequestsError(error.message || 'Unknown booking request error')
          setBookingRequests([])
          return
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

        if (hostIds.length > 0) {
          const { data: hostProfiles, error: hostProfilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', hostIds)

          if (hostProfilesError) {
            console.error('Booking requests host profile lookup error:', hostProfilesError)
          } else {
            hostNameById = (hostProfiles || []).reduce((acc: Record<string, string>, profile: any) => {
              acc[profile.id] = profile.name || 'Host'
              return acc
            }, {})
          }
        }

        const normalizedRequests = requestsList.map((request: any) => ({
          ...request,
          requester_name: hostNameById[request.host_id] || 'Host'
        }))

        setRequestsError(null)
        setBookingRequests(normalizedRequests)
      } catch (error) {
        console.error('Error loading booking requests:', error)
        setRequestsError(error instanceof Error ? error.message : 'Unknown booking request error')
        setBookingRequests([])
      } finally {
        setRequestsLoading(false)
      }
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
        const { data: requests, error } = await supabase
          .from('booking_requests')
          .select('id, created_at, venue_address, proposed_date, ticket_price, host_split, musician_split, proposed_host_pct, proposed_musician_pct, proposed_platform_pct, message, status, host_id, musician_id')
          .eq('host_id', user.id)
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

        if (musicianIds.length > 0) {
          const { data: musicianProfiles, error: musicianProfilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', musicianIds)

          if (musicianProfilesError) {
            console.error('Host booking requests musician profile lookup error:', musicianProfilesError)
          } else {
            musicianNameById = (musicianProfiles || []).reduce((acc: Record<string, string>, profile: any) => {
              acc[profile.id] = profile.name || 'Musician'
              return acc
            }, {})
          }
        }

        const normalizedRequests = requestsList.map((request: any) => ({
          ...request,
          musician_name: musicianNameById[request.musician_id] || 'Musician'
        }))

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
        const { data: shows, error } = await supabase
          .from('shows')
          .select('*')
          .or(`host_user_id.eq.${user.id},host_id.eq.${user.id},artist_user_id.eq.${user.id},artist_id.eq.${user.id},musician_id.eq.${user.id}`)

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
        const { data: shows, error } = await supabase
          .from('shows')
          .select('*')
          .or(`artist_user_id.eq.${user.id},artist_id.eq.${user.id},musician_id.eq.${user.id}`)

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
          .select('id, show_id')
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
              fullAddress: show.full_address || null
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

  useEffect(() => {
    const loadActiveMode = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_mode')
        .eq('id', user.id)
        .single()

      if (profile?.active_mode === 'musician' || profile?.active_mode === 'host') {
        setActiveMode(profile.active_mode)
      }
    }

    loadActiveMode()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const switchMode = async (newMode: 'musician' | 'host') => {
    if (switchingMode) return

    try {
      setSwitchingMode(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      
      const { error } = await supabase
        .from('profiles')
        .update({ active_mode: newMode })
        .eq('id', currentUser.id)

      if (error) {
        console.error('Error switching mode:', error)
        return
      }

      setActiveMode(newMode)
      setUser(prev => prev ? { ...prev, active_mode: newMode } : null)
    } catch (error) {
      console.error('Error switching mode:', error)
    } finally {
      setSwitchingMode(false)
    }
  }

  const updateBookingRequestStatus = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      setUpdatingRequestId(requestId)

      const { error } = await supabase
        .from('booking_requests')
        .update({ status })
        .eq('id', requestId)

      if (error) {
        console.error(`Error updating booking request to ${status}:`, error)
        return
      }

      setBookingRequests(prev =>
        prev.map(request => request.id === requestId ? { ...request, status } : request)
      )
      setHostRequests(prev =>
        prev.map(request => request.id === requestId ? { ...request, status } : request)
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

  const submitCounterOffer = async (requestId: string) => {
    const musicianPct = Number.parseInt(counterOfferValues.musician, 10) || 0
    const hostPct = Number.parseInt(counterOfferValues.host, 10) || 0
    const platformPct = DEFAULT_COUNTER_SPLIT.platform

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
                setCounterOfferValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                setCounterOfferError(null)
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
      {counterOfferError && (
        <div style={{ color: '#F5B5B5', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', marginBottom: '12px' }}>
          {counterOfferError}
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => submitCounterOffer(requestId)}
          disabled={updatingRequestId === requestId}
          style={{
            background: '#D4820A',
            color: '#1A1410',
            border: '1px solid #D4820A',
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: updatingRequestId === requestId ? 'not-allowed' : 'pointer',
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

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
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

  if (user?.user_type === 'fan') {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', padding: '48px' }}>
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
              display: 'block', border: '1px solid rgba(212,130,10,0.2)', borderRadius: '8px',
              padding: '28px 24px', background: 'rgba(44,34,24,0.3)', cursor: 'pointer',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>🎟️</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '6px' }}>My Tickets</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>View your purchased tickets and QR codes</p>
            </a>
            <a href="/following" style={{
              display: 'block', border: '1px solid rgba(212,130,10,0.2)', borderRadius: '8px',
              padding: '28px 24px', background: 'rgba(44,34,24,0.3)', cursor: 'pointer',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>⭐</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '6px' }}>Following</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>Artists you follow and their upcoming shows</p>
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', padding: '48px' }}>
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
        {/* Mode Toggle */}
        {user?.user_type !== 'fan' && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
              Active Mode
            </div>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => switchMode('musician')}
                disabled={switchingMode}
                style={{
                  padding: '12px 18px',
                  borderRadius: '6px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  border: activeMode === 'musician' ? '1px solid #D4820A' : '1px solid rgba(212,130,10,0.3)',
                  cursor: switchingMode ? 'not-allowed' : 'pointer',
                  background: activeMode === 'musician' ? '#D4820A' : 'transparent',
                  color: activeMode === 'musician' ? '#1A1410' : '#F5F0E8',
                }}
              >
                Musician Mode
              </button>
              <button
                onClick={() => switchMode('host')}
                disabled={switchingMode}
                style={{
                  padding: '12px 18px',
                  borderRadius: '6px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  border: activeMode === 'host' ? '1px solid #D4820A' : '1px solid rgba(212,130,10,0.3)',
                  cursor: switchingMode ? 'not-allowed' : 'pointer',
                  background: activeMode === 'host' ? '#D4820A' : 'transparent',
                  color: activeMode === 'host' ? '#1A1410' : '#F5F0E8',
                }}
              >
                Host Mode
              </button>
            </div>
            {switchingMode && (
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#D4820A', marginTop: '8px' }}>
                Switching mode...
              </div>
            )}
          </div>
        )}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
          You&apos;re in
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', color: '#F5F0E8', marginBottom: '16px' }}>
          Welcome to HouseShow
        </h1>
        {user && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Signed in as <span style={{ color: '#F0A500' }}>{user.email}</span>
          </p>
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
              : activeMode === 'host'
                ? [
                  { icon: '🏠', title: 'My Host Profile', desc: 'Build your host profile', href: '/host-profile' },
                  { icon: '🎵', title: 'Find Musicians', desc: 'Discover and invite local musicians', href: '/find-musicians' },
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
              display: 'block', border: '1px solid rgba(212,130,10,0.2)', borderRadius: '8px',
              padding: '28px 24px', background: 'rgba(44,34,24,0.3)', cursor: 'pointer',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{card.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '6px' }}>{card.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>{card.desc}</p>
            </a>
          ))}
        </div>

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
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B', marginBottom: ticket.fullAddress ? '16px' : 0 }}>
                    {ticket.showDate ? formatDate(ticket.showDate) : 'Date TBD'}
                  </p>
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
                </div>
              ))}
            </div>
          </section>
        )}

        {activeMode === 'musician' && user?.user_type !== 'fan' && (
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
                        Venue: {request.venue_address}
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

                  <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.85rem', marginBottom: '4px' }}>
                        Revenue Split
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.95rem' }}>
                        You: {request.musician_split ?? 60}% • Host: {request.host_split ?? 33}% • Platform: 7%
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
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

                  {request.status === 'pending' && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(26,20,16,0.35)',
                      color: '#F5F0E8',
                      fontFamily: "'DM Sans', sans-serif"
                    }}>
                      Waiting for the host to respond.
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
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href={`/bookings?requestId=${request.id}`}
                      style={{
                        display: 'inline-block',
                        background: 'transparent',
                        color: '#F5F0E8',
                        border: '1px solid rgba(212,130,10,0.35)',
                        borderRadius: '6px',
                        padding: '10px 16px',
                        textDecoration: 'none',
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: '600'
                      }}
                    >
                      View Details
                    </a>
                    {request.status === 'pending' && (
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
                  {activeCounterOfferId === request.id && renderCounterOfferForm(request.id)}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeMode === 'host' && (
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
                        Venue: {request.venue_address}
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
  )
}
