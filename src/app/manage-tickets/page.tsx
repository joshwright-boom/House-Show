'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Show {
  id: string
  show_name: string
  venue_name: string
  venue_address: string
  date: string
  time: string
  ticket_price: number
  max_capacity: number
  show_description: string
  genre_preference: string
  host_id: string
  status: 'open' | 'booked' | 'cancelled'
  created_at: string
}

interface Booking {
  id: string
  show_id: string
  musician_id: string
  host_id: string
  tickets_purchased: number
  total_amount: number
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

export default function ManageTickets() {
  const [user, setUser] = useState<{ id: string; email?: string; user_type?: string } | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)
  
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      // Get user profile to determine user type
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
      
      if (profile?.user_type !== 'host') {
        router.push('/dashboard')
        return
      }
      
      setUser({ id: user.id, email: user.email, user_type: profile?.user_type })
    }
    
    checkUser()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchHostShows()
      fetchBookings()
    }
  }, [user])

  const fetchHostShows = async () => {
    try {
      const { data: showsData, error } = await supabase
        .from('shows')
        .select('*')
        .eq('host_id', user!.id)
        .eq('status', 'booked')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching shows:', error)
        return
      }
      
      setShows(showsData || [])
    } catch (error) {
      console.error('Error fetching shows:', error)
    }
  }

  const fetchBookings = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('host_id', user!.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching bookings:', error)
        return
      }
      
      setBookings(bookingsData || [])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getShowBookings = (showId: string) => {
    return bookings.filter(booking => booking.show_id === showId)
  }

  const getTotalTicketsSold = (showId: string) => {
    const showBookings = getShowBookings(showId)
    return showBookings.reduce((total, booking) => total + booking.tickets_purchased, 0)
  }

  const getTotalRevenue = (showId: string) => {
    const showBookings = getShowBookings(showId)
    return showBookings.reduce((total, booking) => total + booking.total_amount, 0)
  }

  const getHostShare = (showId: string) => {
    const showBookings = getShowBookings(showId)
    return showBookings.reduce((total, booking) => total + (booking.total_amount * 0.30), 0) // 30% to host
  }

  const getMusicianShare = (showId: string) => {
    const showBookings = getShowBookings(showId)
    return showBookings.reduce((total, booking) => total + (booking.total_amount * 0.70), 0) // 70% to musician
  }

  const getPlatformFee = (showId: string) => {
    const showBookings = getShowBookings(showId)
    return showBookings.reduce((total, booking) => total + (booking.total_amount * 0.10), 0) // 10% platform fee
  }

  const totalRevenue = shows.reduce((total, show) => total + getTotalRevenue(show.id), 0)
  const totalHostShare = shows.reduce((total, show) => total + getHostShare(show.id), 0)
  const totalPlatformFees = shows.reduce((total, show) => total + getPlatformFee(show.id), 0)

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Loading your shows...</p>
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
          <a href="/bookings" style={{ color: '#8C7B6B', fontSize: '0.9rem', textDecoration: 'none' }}>← Back to Bookings</a>
        </nav>

        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Manage Tickets & Revenue
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Your Shows
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Manage ticket sales and track revenue for your booked shows.
          </p>

          {/* Revenue Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
            marginBottom: '48px'
          }}>
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '12px' }}>
                Total Revenue
              </h3>
              <div style={{ fontSize: '2rem', fontFamily: "'Space Mono', monospace", color: '#F0A500', fontWeight: 600 }}>
                ${totalRevenue.toFixed(2)}
              </div>
            </div>
            
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '12px' }}>
                Your Share (30%)
              </h3>
              <div style={{ fontSize: '2rem', fontFamily: "'Space Mono", monospace", color: '#F0A500', fontWeight: 600 }}>
                ${totalHostShare.toFixed(2)}
              </div>
            </div>
            
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '12px' }}>
                Platform Fees
              </h3>
              <div style={{ fontSize: '2rem', fontFamily: "'Space Mono", monospace", color: '#D4820A', fontWeight: 600 }}>
                ${totalPlatformFees.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Shows List */}
          {shows.length === 0 ? (
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
                No Booked Shows Yet
              </h3>
              <p style={{ 
                fontFamily: "'DM Sans', sans-serif", 
                color: '#8C7B6B' 
              }}>
                Your booked shows will appear here once musicians book them.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {shows.map(show => (
                <div key={show.id} style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '12px',
                  padding: '24px',
                  background: 'rgba(44,34,24,0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ 
                        fontFamily: "'Playfair Display', serif", 
                        fontSize: '1.3rem', 
                        color: '#F5F0E8', 
                        marginBottom: '4px' 
                      }}>
                        {show.show_name}
                      </h3>
                      <p style={{ 
                        fontFamily: "'DM Sans', sans-serif", 
                        color: '#8C7B6B', 
                        fontSize: '0.95rem',
                        marginBottom: '8px'
                      }}>
                        📍 {show.venue_name} • {formatDate(show.date)} at {show.time}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontFamily: "'Space Mono", monospace", 
                        fontSize: '1.1rem', 
                        color: '#F0A500', 
                        fontWeight: 600 
                      }}>
                        ${getTotalRevenue(show.id).toFixed(2)}
                      </div>
                      <div style={{ 
                        fontFamily: "'DM Sans", sans-serif", 
                        color: '#8C7B6B', 
                        fontSize: '0.85rem' 
                      }}>
                        total revenue
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    borderTop: '1px solid rgba(212,130,10,0.1)', 
                    paddingTop: '16px',
                    marginBottom: '16px' 
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ color: '#8C7B6B', fontSize: '0.85rem' }}>Tickets Sold:</span>
                        <div style={{ fontSize: '1.2rem', fontFamily: "'Space Mono", monospace", color: '#F5F0E8', fontWeight: 600 }}>
                          {getTotalTicketsSold(show.id)}/{show.max_capacity}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#8C7B6B', fontSize: '0.85rem' }}>Your Share:</span>
                        <div style={{ fontSize: '1.2rem', fontFamily: "'Space Mono", monospace", color: '#F0A500', fontWeight: 600 }}>
                          ${getHostShare(show.id).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: '6px', background: 'rgba(212,130,10,0.1)', borderRadius: '3px', marginBottom: '16px' }} />
                    
                    {/* Bookings List */}
                    <div>
                      <h4 style={{ 
                        fontFamily: "'Playfair Display", serif", 
                        fontSize: '1rem', 
                        color: '#F5F0E8', 
                        marginBottom: '12px' 
                      }}>
                        Recent Bookings
                      </h4>
                      {getShowBookings(show.id).length === 0 ? (
                        <p style={{ color: '#8C7B6B', fontSize: '0.85rem' }}>No bookings yet</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {getShowBookings(show.id).slice(0, 3).map(booking => (
                            <div key={booking.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: 'rgba(26,20,16,0.3)',
                              borderRadius: '6px',
                              fontSize: '0.85rem'
                            }}>
                              <span style={{ color: '#8C7B6B' }}>
                                {booking.tickets_purchased} tickets • ${booking.total_amount}
                              </span>
                              <span style={{ 
                                color: '#F0A500', 
                                fontFamily: "'Space Mono", monospace",
                                fontSize: '0.8rem'
                              }}>
                                {booking.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
