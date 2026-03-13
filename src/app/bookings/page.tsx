'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Booking {
  id: string
  artist_name: string
  venue_name: string
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
  date: string
  time: string
  price: number
  total_tickets: number
  host_id: string
  status: 'available' | 'booked'
  created_at: string
}

export default function Bookings() {
  const [user, setUser] = useState<{ id: string; email?: string; user_type?: string } | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [availableShows, setAvailableShows] = useState<Show[]>([])
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
      
      setUser({ 
        id: user.id, 
        email: user.email,
        user_type: profile?.user_type || 'musician'
      })
      
      await fetchBookings(user.id)
      if (profile?.user_type === 'musician') {
        await fetchAvailableShows()
      }
    }
    
    checkUser()
  }, [])

  const fetchBookings = async (userId: string) => {
    try {
      // Mock data for now - replace with actual Supabase query
      const mockBookings: Booking[] = [
        {
          id: '1',
          artist_name: 'The Midnight Jazz',
          venue_name: 'Sarah\'s Living Room',
          date: '2024-03-20',
          time: '8:00 PM',
          price: 25,
          tickets_sold: 15,
          total_tickets: 20,
          status: 'upcoming',
          created_at: '2024-02-15T10:00:00Z',
          musician_id: userId,
          host_id: 'host-123'
        },
        {
          id: '2',
          artist_name: 'Acoustic Dreams',
          venue_name: 'Mike\'s Basement',
          date: '2024-01-15',
          time: '7:30 PM',
          price: 20,
          tickets_sold: 18,
          total_tickets: 25,
          status: 'past',
          created_at: '2024-01-10T14:30:00Z'
        }
      ]
      
      setBookings(mockBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableShows = async () => {
    try {
      // Fetch available shows from Supabase
      const { data: shows, error } = await supabase
        .from('shows')
        .select('*')
        .eq('status', 'open')
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
        date: show.date,
        time: show.time,
        price: show.ticket_price,
        total_tickets: show.max_capacity,
        host_id: show.host_id,
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
            {booking.artist_name}
          </h3>
          <p style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            color: '#8C7B6B', 
            fontSize: '0.95rem' 
          }}>
            📍 {booking.venue_name}
          </p>
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
        <button style={{
          background: 'linear-gradient(135deg, #D4820A, #F0A500)',
          color: '#1A1410',
          padding: '10px 20px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          border: 'none',
          cursor: 'pointer'
        }}>
          View Details
        </button>
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
    </div>
  )

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
                href="/browse"
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
              {/* Available Shows (for musicians) */}
              {user.user_type === 'musician' && availableShows.length > 0 && (
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
                    🎵 Available Shows
                    <span style={{ 
                      fontFamily: "'Space Mono', monospace", 
                      fontSize: '0.8rem', 
                      color: '#F0A500',
                      background: 'rgba(240,165,0,0.1)',
                      padding: '4px 12px',
                      borderRadius: '20px'
                    }}>
                      {availableShows.length}
                    </span>
                  </h2>
                  
                  {availableShows.map(show => <ShowCard key={show.id} show={show} />)}
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
                      href="/browse"
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
                        href="/browse"
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
