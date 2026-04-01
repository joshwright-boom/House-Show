'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Booking {
  id: string
  show_name: string
  venue_name: string
  venue_address?: string
  date: string
  time: string
  price: number
  tickets_sold: number
  total_tickets: number
  status: 'upcoming' | 'past' | 'cancelled' | 'pending_payment'
  created_at: string
  musician_id?: string
  host_id?: string
}

interface Show {
  id: string
  title: string
  description: string
  venue_address?: string
  date: string
  time: string
  price: number
  total_tickets: number
  host_id: string
  status: 'available' | 'booked'
  created_at: string
}

interface BookingRequest {
  id: string
  host_id: string
  musician_id: string
  proposed_date: string
  show_date?: string
  venue_address: string
  ticket_price: number
  host_split: number
  musician_split: number
  guaranteed_minimum?: number
  proposed_musician_pct?: number
  proposed_host_pct?: number
  message: string
  status: 'pending' | 'accepted' | 'declined' | 'countered'
  created_at: string
  host_name?: string
  host_email?: string
  musician_name?: string
}

const getShowDateValue = (show: Record<string, any>) =>
  show.date || show.show_date || show.event_date || show.scheduled_date || ''

const getShowArtistId = (show: Record<string, any>) =>
  show.artist_user_id || show.artist_id || show.musician_id || null

const getShowHostId = (show: Record<string, any>) =>
  show.host_user_id || show.host_id || null

const getShowCapacity = (show: Record<string, any>) =>
  show.max_capacity || show.capacity || 0

const getRequestDateValue = (request: BookingRequest) =>
  request.show_date || request.proposed_date || ''

export default function Bookings() {
  const [user, setUser] = useState<{ id: string; email?: string; user_type?: string } | null>(null)
  const [profile, setProfile] = useState<{ user_type?: string } | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [availableShows, setAvailableShows] = useState<Show[]>([])
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])
  const [hostRequests, setHostRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }
      
      // Get user profile to determine user type
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      setProfile(profile || null)
      
      setUser({ 
        id: user.id, 
        email: user.email,
        user_type: profile?.user_type || 'musician'
      })
      
      await fetchBookings(user.id)
      await fetchAvailableShows()
      await fetchBookingRequests(user.id)
      await fetchHostRequests(user.id)
    }
    
    checkUser()
  }, [])

  const fetchBookings = async (userId: string) => {
    try {
      const { data: primaryShows, error: primaryError } = await supabase
        .from('shows')
        .select('*')
        .or(`host_user_id.eq.${userId},artist_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      let shows = primaryShows || []

      if (primaryError) {
        console.error('Error fetching bookings with current columns, trying legacy fallback:', primaryError)
        const { data: legacyShows, error: legacyError } = await supabase
          .from('shows')
          .select('*')
          .or(`host_id.eq.${userId},artist_id.eq.${userId},musician_id.eq.${userId}`)
          .order('created_at', { ascending: false })

        if (legacyError) {
          console.error('Error fetching bookings:', legacyError)
          return
        }

        shows = legacyShows || []
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const hostIds = Array.from(
        new Set((shows || []).map((show) => getShowHostId(show)).filter(Boolean))
      ) as string[]

      let hostProfilesByKey = new Map<string, { neighborhood?: string | null; full_address?: string | null }>()

      if (hostIds.length > 0) {
        const { data: hostProfiles, error: hostProfilesError } = await supabase
          .from('host_profiles')
          .select('id, user_id, neighborhood, address')
          .or(`id.in.(${hostIds.join(',')}),user_id.in.(${hostIds.join(',')})`)

        if (hostProfilesError) {
          console.error('Error fetching host profiles for bookings:', hostProfilesError)
        } else {
          const hostProfileEntries: Array<[string, { neighborhood?: string | null; full_address?: string | null }]> = []

          ;(hostProfiles || []).forEach((profile: any) => {
            const value = {
              neighborhood: profile.neighborhood || null,
              full_address: profile.address || null
            }

            hostProfileEntries.push([profile.id, value])
            if (profile.user_id) {
              hostProfileEntries.push([profile.user_id, value])
            }
          })

          hostProfilesByKey = new Map(hostProfileEntries)
        }
      }

      const transformedBookings: Booking[] = (shows || []).map(show => {
        const resolvedDate = getShowDateValue(show)
        const showDate = new Date(resolvedDate)
        showDate.setHours(0, 0, 0, 0)
        const hostProfile = hostProfilesByKey.get(getShowHostId(show) || '')

        const status: Booking['status'] =
          show.status === 'cancelled'
            ? 'cancelled'
            : showDate < today
              ? 'past'
              : 'upcoming'

        return {
          id: show.id,
          show_name: show.show_name || show.artist_name || 'HouseShow Event',
          venue_name: hostProfile?.neighborhood || show.venue_name || 'Venue',
          venue_address: hostProfile?.full_address || show.full_address || show.venue_address,
          date: resolvedDate,
          time: show.show_time || show.time || 'TBD',
          price: show.ticket_price,
          tickets_sold: 0,
          total_tickets: getShowCapacity(show),
          status,
          created_at: show.created_at,
          musician_id: getShowArtistId(show),
          host_id: getShowHostId(show)
        }
      })

      setBookings(transformedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookingRequests = async (userId: string) => {
    try {
      const { data: artistProfile, error: artistProfileError } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (artistProfileError) {
        console.error('Error fetching artist profile for booking requests:', artistProfileError)
        return
      }

      if (!artistProfile?.id) {
        setBookingRequests([])
        return
      }

      const { data: requests, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('musician_id', artistProfile.id)
        .in('status', ['pending', 'accepted', 'negotiating'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching booking requests:', error)
        return
      }

      const hostIds = Array.from(
        new Set((requests || []).map((r: any) => r.host_id).filter(Boolean))
      ) as string[]

      let hostNameById: Record<string, string> = {}

      if (hostIds.length > 0) {
        const { data: hostProfiles } = await supabase
          .from('host_profiles')
          .select('id, user_id, venue_name')
          .in('id', hostIds)

        const hostUserIds = Array.from(
          new Set((hostProfiles || []).map((p: any) => p.user_id).filter(Boolean))
        ) as string[]

        let profileNameById: Record<string, string> = {}

        if (hostUserIds.length > 0) {
          const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', hostUserIds)

          profileNameById = (profileRows || []).reduce((acc: Record<string, string>, p: any) => {
            acc[p.id] = p.name || ''
            return acc
          }, {})
        }

        hostNameById = (hostProfiles || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = profileNameById[p.user_id] || p.venue_name || 'Host'
          return acc
        }, {})
      }

      const transformedRequests: BookingRequest[] = (requests || []).map((request: any) => ({
        ...request,
        host_name: hostNameById[request.host_id] || 'Host',
        host_email: ''
      }))

      setBookingRequests(transformedRequests)
    } catch (error) {
      console.error('Error fetching booking requests:', error)
    }
  }

  const fetchHostRequests = async (userId: string) => {
    try {
      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('host_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (hostProfileError) {
        console.error('Error fetching host profile for booking requests:', hostProfileError)
        return
      }

      if (!hostProfile?.id) {
        setHostRequests([])
        return
      }

      const { data: requests, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('host_id', hostProfile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching host booking requests:', error)
        return
      }

      const musicianIds = Array.from(
        new Set((requests || []).map((request: any) => request.musician_id).filter(Boolean))
      ) as string[]

      let musicianNameById: Record<string, string> = {}

      if (musicianIds.length > 0) {
        const { data: musicianProfiles, error: musicianProfilesError } = await supabase
          .from('artist_profiles')
          .select('id, name')
          .in('id', musicianIds)

        if (musicianProfilesError) {
          console.error('Error fetching musician profiles for host requests:', musicianProfilesError)
        } else {
          musicianNameById = (musicianProfiles || []).reduce((acc: Record<string, string>, profile: any) => {
            acc[profile.id] = profile.name || 'Musician'
            return acc
          }, {})
        }
      }

      const transformedRequests: BookingRequest[] = (requests || []).map(request => ({
        ...request,
        musician_name: musicianNameById[request.musician_id] || 'Musician'
      }))

      setHostRequests(transformedRequests)
    } catch (error) {
      console.error('Error fetching host booking requests:', error)
    }
  }

  const sendDecisionNotification = async (request: BookingRequest, decision: 'accepted' | 'declined') => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) return

      // Get host name: use host_name from request, or look up current user's profile name
      let hostName = request.host_name || 'Your host'
      if (!request.host_name && user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle()
        if (userProfile?.name) hostName = userProfile.name
      }
      const proposedDate = getRequestDateValue(request)

      fetch('/api/notify-booking-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          type: 'decision',
          musicianProfileId: request.musician_id,
          hostName,
          proposedDate,
          decision,
        }),
      }).catch((err) => console.error('Failed to send decision notification:', err))
    } catch (notifyError) {
      console.error('Error sending decision notification:', notifyError)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      if (error) throw error

      const request = bookingRequests.find((r) => r.id === requestId)
      if (request) sendDecisionNotification(request, 'accepted')

      window.location.href = `/create-show?requestId=${requestId}`
    } catch (error) {
      console.error('Error accepting request:', error)
      alert('Failed to accept request. Please try again.')
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'declined' })
        .eq('id', requestId)

      if (error) throw error

      const request = bookingRequests.find((r) => r.id === requestId)
      if (request) sendDecisionNotification(request, 'declined')

      if (user) {
        await fetchBookingRequests(user.id)
      }
      alert('Booking request declined.')
    } catch (error) {
      console.error('Error declining request:', error)
      alert('Failed to decline request. Please try again.')
    }
  }

  const handleHostAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      if (error) throw error

      const request = hostRequests.find((r) => r.id === requestId)
      if (request) sendDecisionNotification(request, 'accepted')

      window.location.href = `/create-show?requestId=${requestId}`
    } catch (error) {
      console.error('Error accepting host request:', error)
      alert('Failed to accept request. Please try again.')
    }
  }

  const handleHostDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'declined' })
        .eq('id', requestId)

      if (error) throw error

      const request = hostRequests.find((r) => r.id === requestId)
      if (request) sendDecisionNotification(request, 'declined')

      if (user) {
        await fetchHostRequests(user.id)
      }
    } catch (error) {
      console.error('Error declining host request:', error)
      alert('Failed to decline request. Please try again.')
    }
  }

  const fetchAvailableShows = async () => {
    try {
      // Fetch available shows from Supabase
      const { data: shows, error } = await supabase
        .from('shows')
        .select('*')
        .in('status', ['open', 'on_sale'])
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching shows:', error)
        return
      }
      
      // Transform shows data to match Show interface
      const transformedShows: Show[] = (shows || []).map(show => ({
        id: show.id,
        title: show.show_name,
        description: show.show_description,
        venue_address: show.venue_address,
        date: getShowDateValue(show),
        time: show.time,
        price: show.ticket_price,
        total_tickets: getShowCapacity(show),
        host_id: getShowHostId(show),
        status: 'available',
        created_at: show.created_at
      }))
      
      setAvailableShows(transformedShows)
    } catch (error) {
      console.error('Error fetching available shows:', error)
    }
  }

  const handleBookShow = (show: Show) => {
    // Redirect to detailed booking page
    window.location.href = `/book-show?id=${show.id}`
  }

  const getShowHref = (showId: string) => `/show/${showId}`

  const findMatchingShow = (request: BookingRequest) =>
    bookings.find(show =>
      show.host_id === request.host_id &&
      show.musician_id === request.musician_id &&
      show.date === getRequestDateValue(request) &&
      show.venue_address === request.venue_address
    )

  const upcomingShows = bookings.filter(booking => booking.status === 'upcoming')
  const pastShows = bookings.filter(booking => booking.status === 'past')

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getDirectionsHref = (address?: string) =>
    address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : ''

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div style={{
      border: '1px solid rgba(212,130,10,0.2)',
      borderRadius: '12px',
      padding: '24px',
      background: 'rgba(44,34,24,0.3)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: '1.3rem', 
            color: '#F5F0E8', 
            marginBottom: '4px' 
          }}>
            {booking.show_name}
          </h3>
          <p style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.95rem' 
          }}>
            📍 {booking.venue_name}
          </p>
          {booking.venue_address && (
            <a
              href={getDirectionsHref(booking.venue_address)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '8px',
                fontFamily: "'DM Sans', sans-serif",
                color: '#D4820A',
                fontSize: '0.9rem',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Get Directions
            </a>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontFamily: "'Space Mono', monospace", 
            fontSize: '1.1rem', 
            color: '#F0A500', 
            fontWeight: 600 
          }}>
            ${booking.price}
          </div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem' 
          }}>
            per ticket
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
        <div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem', 
            marginBottom: '4px' 
          }}>
            Date & Time
          </div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#F5F0E8', 
            fontSize: '0.95rem' 
          }}>
            {formatDate(booking.date)} at {booking.time}
          </div>
        </div>
        <div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem', 
            marginBottom: '4px' 
          }}>
            Tickets
          </div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#F5F0E8', 
            fontSize: '0.95rem' 
          }}>
            {booking.tickets_sold}/{booking.total_tickets} sold
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(212,130,10,0.1)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(booking.tickets_sold / booking.total_tickets) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #D4820A, #F0A500)',
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <a href={getShowHref(booking.id)} style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #D4820A, #F0A500)',
          color: '#1A1410',
          padding: '10px 20px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          textDecoration: 'none'
        }}>
          View Details
        </a>
        <button style={{
          background: 'transparent',
          color: '#8C7B6B',
          padding: '10px 20px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontFamily: "'DM Sans', sans-serif",
          border: '1px solid rgba(212,130,10,0.2)',
          cursor: 'pointer'
        }}>
          Message {booking.status === 'upcoming' ? 'Artist' : 'Host'}
        </button>
      </div>
    </div>
  )

  const ShowCard = ({ show }: { show: Show }) => (
    <div style={{
      border: '1px solid rgba(212,130,10,0.2)',
      borderRadius: '12px',
      padding: '24px',
      background: 'rgba(44,34,24,0.3)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: '1.3rem', 
            color: '#F5F0E8', 
            marginBottom: '4px' 
          }}>
            {show.title}
          </h3>
          <p style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.95rem',
            marginBottom: '8px'
          }}>
            {show.description}
          </p>
          <p style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem' 
          }}>
            📍 Host Venue • {formatDate(show.date)} at {show.time}
          </p>
          {show.venue_address && (
            <a
              href={getDirectionsHref(show.venue_address)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '8px',
                fontFamily: "'DM Sans', sans-serif",
                color: '#D4820A',
                fontSize: '0.9rem',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Get Directions
            </a>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontFamily: "'Space Mono', monospace", 
            fontSize: '1.1rem', 
            color: '#F0A500', 
            fontWeight: 600 
          }}>
            ${show.price}
          </div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem' 
          }}>
            per ticket
          </div>
        </div>
      </div>

      {user?.user_type === 'host' ? (
        <button
          onClick={() => handleBookShow(show)}
          disabled={processingPayment}
          style={{
            background: 'linear-gradient(135deg, #D4820A, #F0A500)',
            color: '#1A1410',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            border: 'none',
            cursor: processingPayment ? 'not-allowed' : 'pointer',
            opacity: processingPayment ? 0.7 : 1,
            width: '100%'
          }}
        >
          {processingPayment ? 'Processing...' : 'Book This Show'}
        </button>
      ) : (
        <a
          href={`/tickets/${show.id}`}
          style={{
            display: 'block',
            background: 'linear-gradient(135deg, #D4820A, #F0A500)',
            color: '#1A1410',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: 'none',
            textAlign: 'center',
            width: '100%'
          }}
        >
          Buy Tickets
        </a>
      )}
    </div>
  )

  const BookingRequestCard = ({ request }: { request: BookingRequest }) => (
    <div style={{
      border: '1px solid rgba(212,130,10,0.2)',
      borderRadius: '12px',
      padding: '24px',
      background: 'rgba(44,34,24,0.3)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: '1.3rem', 
            color: '#F5F0E8', 
            marginBottom: '4px' 
          }}>
            Booking Request from {request.host_name}
          </h3>
          <p style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.95rem' 
          }}>
            📍 {request.venue_address}
          </p>
          <a
            href={getDirectionsHref(request.venue_address)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: '8px',
              fontFamily: "'DM Sans', sans-serif",
              color: '#D4820A',
              fontSize: '0.9rem',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            Get Directions
          </a>
        </div>
        <div style={{ textAlign: 'right' }}>
          {(request.guaranteed_minimum ?? 0) > 0 ? (
            <>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.1rem', color: '#F0A500', fontWeight: 600 }}>
                ${request.guaranteed_minimum} minimum guarantee
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.85rem' }}>
                Host keeps all ticket revenue
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.1rem', color: '#F0A500', fontWeight: 600 }}>
                ${request.ticket_price} per ticket
              </div>
              {(request.proposed_musician_pct ?? 0) > 0 && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.85rem' }}>
                  {request.proposed_musician_pct}% artist / {request.proposed_host_pct}% host split
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
        <div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem', 
            marginBottom: '4px' 
          }}>
            Proposed Date
          </div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#F5F0E8', 
            fontSize: '0.95rem' 
          }}>
            {formatDate(request.proposed_date)}
          </div>
        </div>
        <div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem', 
            marginBottom: '4px' 
          }}>
            Revenue Split
          </div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#F5F0E8', 
            fontSize: '0.95rem' 
          }}>
            You: {request.musician_split}% • Host: {request.host_split}% • Platform: 7%
          </div>
        </div>
      </div>

      {request.message && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.85rem', 
            marginBottom: '4px' 
          }}>
            Message from Host
          </div>
          <div style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#F5F0E8', 
            fontSize: '0.95rem',
            lineHeight: '1.5',
            background: 'rgba(26,20,16,0.3)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(212,130,10,0.1)'
          }}>
            {request.message}
          </div>
        </div>
      )}

      {request.status === 'accepted' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            color: '#86EFAC',
            fontSize: '0.9rem'
          }}>
            You accepted this booking. Click below to create the show so tickets can go on sale.
          </div>
          <div>
            <a
              href={`/create-show?requestId=${request.id}`}
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                textDecoration: 'none'
              }}
            >
              Create Show
            </a>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'rgba(212,130,10,0.08)',
            border: '1px solid rgba(212,130,10,0.16)',
            color: '#F5F0E8',
            fontSize: '0.9rem'
          }}>
            Accepting this invitation will take you to create the show so tickets can go on sale.
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleAcceptRequest(request.id)}
              style={{
                background: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
                color: '#1A1410',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Accept
            </button>
            <button
              onClick={() => handleDeclineRequest(request.id)}
              style={{
                background: 'transparent',
                color: '#D4820A',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontFamily: "'DM Sans', sans-serif",
                border: '1px solid rgba(212,130,10,0.2)',
                cursor: 'pointer'
              }}
            >
              Decline
            </button>
          </div>
        </>
      )}
    </div>
  )

  const HostRequestCard = ({ request }: { request: BookingRequest }) => {
    const matchingShow = findMatchingShow(request)
    const ticketHref = matchingShow ? getShowHref(matchingShow.id) : `/create-show?requestId=${request.id}`
    const statusBadgeStyles =
      request.status === 'accepted'
        ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.32)', color: '#86EFAC' }
        : request.status === 'declined'
          ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)', color: '#FCA5A5' }
          : { background: 'transparent', border: '1px solid rgba(212,130,10,0.3)', color: '#F5F0E8' }

    return (
      <div style={{
        border: '1px solid rgba(212,130,10,0.2)',
        borderRadius: '12px',
        padding: '24px',
        background: 'rgba(44,34,24,0.3)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#F5F0E8', marginBottom: '6px' }}>
              {request.musician_name || 'Musician'}
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.9rem', marginBottom: '4px' }}>
              📅 {request.proposed_date ? formatDate(request.proposed_date) : 'Date TBD'}
            </p>
            {(request.guaranteed_minimum ?? 0) > 0 ? (
              <>
                <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#F0A500', fontSize: '0.9rem', fontWeight: 600 }}>
                  ${Number(request.guaranteed_minimum).toFixed(2)} minimum guarantee
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.85rem' }}>
                  Host keeps all ticket revenue
                </p>
              </>
            ) : request.ticket_price != null ? (
              <>
                <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#F0A500', fontSize: '0.9rem', fontWeight: 600 }}>
                  ${Number(request.ticket_price).toFixed(2)} per ticket
                </p>
                {(request.proposed_musician_pct ?? 0) > 0 && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.85rem' }}>
                    {request.proposed_musician_pct}% artist / {request.proposed_host_pct}% host split
                  </p>
                )}
              </>
            ) : null}
          </div>
          <div style={{ padding: '6px 12px', borderRadius: '999px', ...statusBadgeStyles, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {request.status}
          </div>
        </div>

        {request.message && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.8rem', marginBottom: '4px' }}>Message</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F5F0E8', fontSize: '0.9rem', lineHeight: 1.5, background: 'rgba(26,20,16,0.35)', padding: '10px 12px', borderRadius: '6px' }}>
              {request.message}
            </div>
          </div>
        )}

        {request.status === 'accepted' && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86EFAC', fontSize: '0.9rem' }}>
            Accepted — create the ticket page so this show can go on sale.
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {request.status === 'pending' && (
            <>
              <button
                onClick={() => handleHostAcceptRequest(request.id)}
                style={{ background: 'linear-gradient(135deg, #4CAF50, #66BB6A)', color: '#1A1410', padding: '10px 18px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer' }}
              >
                Accept
              </button>
              <button
                onClick={() => handleHostDeclineRequest(request.id)}
                style={{ background: 'transparent', color: '#D4820A', padding: '10px 18px', borderRadius: '6px', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", border: '1px solid rgba(212,130,10,0.3)', cursor: 'pointer' }}
              >
                Decline
              </button>
            </>
          )}
          {request.status === 'accepted' && (
            <a
              href={ticketHref}
              style={{ display: 'inline-block', background: 'linear-gradient(135deg, #D4820A, #F0A500)', color: '#1A1410', padding: '10px 18px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
            >
              {matchingShow ? 'View Ticket Page' : 'Create Ticket Page'}
            </a>
          )}
          {matchingShow && (
            <a
              href={ticketHref}
              style={{ display: 'inline-block', background: 'transparent', color: '#F5F0E8', padding: '10px 18px', borderRadius: '6px', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", border: '1px solid rgba(212,130,10,0.2)', textDecoration: 'none' }}
            >
              Share Show Link
            </a>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Loading...</p>
    </div>
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: #1A1410;
          color: '#F5F0E8';
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
      
      <main style={{ minHeight: '100vh', background: '#1A1410', padding: '48px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#8C7B6B', fontSize: '0.85rem' }}>
              {user.user_type === 'host' ? '🏠 Host' : '🎸 Musician'}
            </span>
            <a href="/dashboard" style={{ color: '#8C7B6B', fontSize: '0.9rem', textDecoration: 'none' }}>← Back to Dashboard</a>
          </div>
        </nav>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Bookings
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Your Shows
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Manage your upcoming and past house shows.
          </p>

          {/* Host: Create Show Button */}
          {user.user_type === 'host' && (
            <div style={{ marginBottom: '48px' }}>
              <a
                href="/create-show"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                  color: '#1A1410',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'none',
                  cursor: 'pointer',
                  marginBottom: '24px'
                }}
              >
                Create a Show
              </a>
            </div>
          )}

          {user.user_type === 'musician' && (
            <div style={{ marginBottom: '48px' }}>
              <a
                href="/venue-radar"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                  color: '#1A1410',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'none',
                  cursor: 'pointer',
                  marginBottom: '24px'
                }}
              >
                Find Shows to Book
              </a>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ color: '#8C7B6B' }}>Loading your bookings...</p>
            </div>
          ) : (
            <>
              {/* Host: Incoming Booking Requests — shown first and always visible */}
              {user.user_type === 'host' && (
                <section style={{ marginBottom: '64px' }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    📨 Booking Requests
                    {hostRequests.length > 0 && (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', color: '#D4820A', background: 'rgba(212,130,10,0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                        {hostRequests.length}
                      </span>
                    )}
                  </h2>
                  {hostRequests.length === 0 ? (
                    <div style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '12px', padding: '32px 24px', background: 'rgba(44,34,24,0.2)', color: '#8C7B6B', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
                      No booking requests yet. Musicians will appear here when they request your venue.
                    </div>
                  ) : (
                    hostRequests.map(request => <HostRequestCard key={request.id} request={request} />)
                  )}
                </section>
              )}

              {/* Musician: Booking Requests */}
              {user.user_type !== 'host' && bookingRequests.length > 0 && (
                <section style={{ marginBottom: '64px' }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    📨 Booking Requests
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', color: '#D4820A', background: 'rgba(212,130,10,0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                      {bookingRequests.length}
                    </span>
                  </h2>
                  {bookingRequests.map(request => <BookingRequestCard key={request.id} request={request} />)}
                </section>
              )}

              {/* Upcoming Shows */}
              <section style={{ marginBottom: '64px' }}>
                <h2 style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: '1.8rem', 
                  color: '#F5F0E8', 
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  📅 Upcoming Shows
                  <span style={{ 
                    fontFamily: "'Space Mono', monospace", 
                    fontSize: '0.8rem', 
                    color: '#F0A500',
                    background: 'rgba(240,165,0,0.1)',
                    padding: '4px 12px',
                    borderRadius: '20px'
                  }}>
                    {upcomingShows.length}
                  </span>
                  {user.user_type === 'host' && (
                    <a
                      href="/manage-tickets"
                      style={{
                        display: 'inline-block',
                        background: '#F0A500',
                        color: '#1A1410',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        fontFamily: "'DM Sans', sans-serif",
                        textDecoration: 'none',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      Manage Tickets
                    </a>
                  )}
                  {user.user_type === 'musician' && (
                    <a
                      href="/venue-radar"
                      style={{
                        display: 'inline-block',
                        background: '#F0A500',
                        color: '#1A1410',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        fontFamily: "'DM Sans', sans-serif",
                        textDecoration: 'none',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      Find Shows
                    </a>
                  )}
                </h2>
                
                {upcomingShows.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    background: 'rgba(44,34,24,0.2)'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎭</div>
                    <h3 style={{ 
                      fontFamily: "'Playfair Display', serif", 
                      fontSize: '1.3rem', 
                      color: '#F5F0E8', 
                      marginBottom: '8px' 
                    }}>
                      No upcoming shows
                    </h3>
                    <p style={{ 
                      fontFamily: "'DM Sans', sans-serif", 
                      color: '#8C7B6B', 
                      marginBottom: '24px' 
                    }}>
                      {user.user_type === 'musician' 
                        ? 'You don\'t have any shows scheduled yet. Browse available shows below!' 
                        : 'You don\'t have any shows scheduled yet. Create a new show to get started!'
                      }
                    </p>
                    {user.user_type === 'host' && (
                      <a
                        href="/create-show"
                        style={{
                          display: 'inline-block',
                          background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                          color: '#1A1410',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                          textDecoration: 'none',
                          cursor: 'pointer',
                          marginRight: '12px'
                        }}
                      >
                        Create Your First Show
                      </a>
                    )}
                    {user.user_type === 'musician' && (
                      <a
                        href="/venue-radar"
                        style={{
                          display: 'inline-block',
                          background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                          color: '#1A1410',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Find Shows to Book
                      </a>
                    )}
                  </div>
                ) : (
                  upcomingShows.map(booking => <BookingCard key={booking.id} booking={booking} />)
                )}
              </section>

              {/* Past Shows */}
              <section>
                <h2 style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: '1.8rem', 
                  color: '#F5F0E8', 
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  ✨ Past Shows
                  <span style={{ 
                    fontFamily: "'Space Mono', monospace", 
                    fontSize: '0.8rem', 
                    color: '#8C7B6B',
                    background: 'rgba(140,123,107,0.1)',
                    padding: '4px 12px',
                    borderRadius: '20px'
                  }}>
                    {pastShows.length}
                  </span>
                </h2>
                
                {pastShows.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    border: '1px solid rgba(212,130,10,0.1)',
                    borderRadius: '12px',
                    background: 'rgba(44,34,24,0.1)'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
                    <h3 style={{ 
                      fontFamily: "'Playfair Display', serif", 
                      fontSize: '1.3rem', 
                      color: '#8C7B6B', 
                      marginBottom: '8px' 
                    }}>
                      No past shows yet
                    </h3>
                    <p style={{ 
                      fontFamily: "'DM Sans', sans-serif", 
                      color: '#8C7B6B' 
                    }}>
                      Your completed shows will appear here.
                    </p>
                  </div>
                ) : (
                  pastShows.map(booking => <BookingCard key={booking.id} booking={booking} />)
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  )
}
