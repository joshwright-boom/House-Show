'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BookingRequest {
  id: string
  host_id: string
  musician_id?: string
  musician_name?: string
  created_at: string
  proposed_date: string
  show_date?: string
  venue_address: string
  ticket_price: number | null
  host_split: number | null
  musician_split: number | null
  message: string
  status: 'pending' | 'accepted' | 'declined'
}

interface HostShow {
  id: string
  host_id: string
  artist_user_id?: string | null
  date: string
  venue_address: string
}

const getShowDateValue = (show: Record<string, any>) =>
  show.date || show.show_date || show.event_date || show.scheduled_date || ''

const getShowArtistId = (show: Record<string, any>) =>
  show.artist_user_id || show.artist_id || show.musician_id || null

const getShowHostId = (show: Record<string, any>) =>
  show.host_user_id || show.host_id || null

const getRequestDateValue = (request: BookingRequest) =>
  request.show_date || request.proposed_date || ''

export default function Dashboard() {
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
        const { data: requests, error } = await supabase
          .from('booking_requests')
          .select('id, created_at, venue_address, proposed_date, ticket_price, host_split, musician_split, message, status, host_id')
          .eq('musician_id', user.id)
          .order('created_at', { ascending: false })

        console.log('BOOKING DEBUG:', { userId: user.id, requests, error })
        if (error) {
          console.error('Booking requests error:', error)
          setRequestsError(error.message || 'Unknown booking request error')
        } else {
          setRequestsError(null)
        }
        setBookingRequests(requests || [])
      } catch (error) {
        console.error('Error loading booking requests:', error)
        setRequestsError(error instanceof Error ? error.message : 'Unknown booking request error')
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
          .select('id, created_at, venue_address, proposed_date, ticket_price, host_split, musician_split, message, status, host_id, musician_id')
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
            ...(activeMode === 'host' ? [
              { icon: '🏠', title: 'My Host Profile', desc: 'Build your host profile', href: '/host-profile' },
              { icon: '🎵', title: 'Find Musicians', desc: 'Discover and invite local musicians', href: '/find-musicians' },
              { icon: '📅', title: 'My Bookings', desc: 'Manage your upcoming shows', href: '/bookings' },
              { icon: '🎫', title: 'My Tickets', desc: 'View your purchased tickets and QR codes', href: '/tickets' },
            ] : [
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

        {activeMode === 'musician' && (
          <section style={{ marginTop: '48px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
              Sent Booking Requests
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
                        Booking Request Sent
                      </h3>
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
                        You: {request.musician_split ?? 0}% • Host: {request.host_split ?? 0}% • Platform: 5%
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

                  {request.status === 'accepted' && (
                    <div style={{ display: 'flex', gap: '12px' }}>
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
                    </div>
                  )}
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
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
