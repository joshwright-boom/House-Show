'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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

export default function BookShow() {
  const [user, setUser] = useState<{ id: string; email?: string; user_type?: string } | null>(null)
  const [show, setShow] = useState<Show | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const showId = searchParams.get('id')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser({ id: user.id, email: user.email })
    }
    
    checkUser()
  }, [router])

  useEffect(() => {
    if (showId && user) {
      fetchShow(showId)
    }
  }, [showId, user])

  const fetchShow = async (id: string) => {
    try {
      const { data: showData, error } = await supabase
        .from('shows')
        .select('*')
        .eq('id', id)
        .eq('status', 'open')
        .single()
      
      if (error) {
        console.error('Error fetching show:', error)
        return
      }
      
      setShow(showData)
    } catch (error) {
      console.error('Error fetching show:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBookShow = async () => {
    if (!user || !show) return
    
    setBookingLoading(true)
    
    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: show.ticket_price * ticketQuantity,
          bookingId: `booking-${Date.now()}`,
          musicianId: user.id,
          hostId: show.host_id,
        }),
      })
      
      const { clientSecret, paymentIntentId } = await response.json()
      
      const stripe = await stripePromise
      
      if (stripe) {
        const { error } = await stripe.confirmPayment({
          clientSecret,
          elements: undefined,
          confirmParams: {
            return_url: `${window.location.origin}/book-show?id=${showId}&success=true`,
          },
          redirect: 'always',
        })
        
        if (error) {
          console.error('Payment failed:', error)
          alert('Payment failed. Please try again.')
        } else {
          // Payment successful - create booking record
          const bookingData = {
            show_id: show.id,
            musician_id: user.id,
            host_id: show.host_id,
            tickets_purchased: ticketQuantity,
            total_amount: show.ticket_price * ticketQuantity,
            status: 'confirmed',
            created_at: new Date().toISOString()
          }
          
          const { error: bookingError } = await supabase
            .from('bookings')
            .insert(bookingData)
          
          if (bookingError) {
            console.error('Error creating booking:', bookingError)
          } else {
            // Update show status to booked
            await supabase
              .from('shows')
              .update({ status: 'booked' })
              .eq('id', show.id)
            
            setShowConfirmation(true)
          }
        }
      }
    } catch (error) {
      console.error('Error booking show:', error)
      alert('Error booking show. Please try again.')
    } finally {
      setBookingLoading(false)
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

  const calculateTotal = () => {
    return show ? show.ticket_price * ticketQuantity : 0
  }

  const calculatePlatformFee = () => {
    return calculateTotal() * 0.10 // 10% platform fee
  }

  const calculateMusicianShare = () => {
    return calculateTotal() * 0.70 // 70% to musician
  }

  const calculateHostShare = () => {
    return calculateTotal() * 0.30 // 30% to host
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Loading show details...</p>
    </div>
  }

  if (!show) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Show not found</p>
    </div>
  }

  if (showConfirmation) {
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

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🎉</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
              Booking Confirmed!
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '32px' }}>
              You've successfully booked {ticketQuantity} ticket{ticketQuantity > 1 ? 's' : ''} for {show.show_name}. 
              Check your email for confirmation details.
            </p>
            
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              marginBottom: '32px'
            }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#F5F0E8', marginBottom: '16px' }}>
                Booking Details
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#8C7B6B' }}>Show:</span>
                <span style={{ color: '#F5F0E8' }}>{show.show_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#8C7B6B' }}>Date:</span>
                <span style={{ color: '#F5F0E8' }}>{formatDate(show.date)} at {show.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#8C7B6B' }}>Venue:</span>
                <span style={{ color: '#F5F0E8' }}>{show.venue_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#8C7B6B' }}>Tickets:</span>
                <span style={{ color: '#F5F0E8' }}>{ticketQuantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#8C7B6B' }}>Total Paid:</span>
                <span style={{ color: '#F0A500', fontFamily: "'Space Mono', monospace" }}>${calculateTotal()}</span>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/bookings')}
              style={{
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Back to My Bookings
            </button>
          </div>
        </main>
      </>
    )
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

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Book Show
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Show Details */}
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#F5F0E8', marginBottom: '16px' }}>
                {show.show_name}
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '24px' }}>
                {show.show_description}
              </p>
              
              <div style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '12px', padding: '24px', background: 'rgba(44,34,24,0.3)' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#F5F0E8', marginBottom: '16px' }}>
                  Show Details
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#8C7B6B' }}>📍 Venue:</span>
                  <span style={{ color: '#F5F0E8' }}>{show.venue_name}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#8C7B6B' }}>📅 Date:</span>
                  <span style={{ color: '#F5F0E8' }}>{formatDate(show.date)}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#8C7B6B' }}>🕐 Time:</span>
                  <span style={{ color: '#F5F0E8' }}>{show.time}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#8C7B6B' }}>🎵 Genre:</span>
                  <span style={{ color: '#F5F0E8' }}>{show.genre_preference}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#8C7B6B' }}>📍 Address:</span>
                  <span style={{ color: '#F5F0E8', textAlign: 'right' }}>{show.venue_address}</span>
                </div>
              </div>
            </div>
            
            {/* Booking Form */}
            <div>
              <div style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '12px', padding: '24px', background: 'rgba(44,34,24,0.3)' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#F5F0E8', marginBottom: '16px' }}>
                  Book This Show
                </h3>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '8px' }}>
                    Number of Tickets
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={show.max_capacity}
                    value={ticketQuantity}
                    onChange={(e) => setTicketQuantity(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid rgba(212,130,10,0.2)',
                      borderRadius: '6px',
                      background: 'rgba(26,20,16,0.5)',
                      color: '#F5F0E8',
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                  />
                  <p style={{ color: '#8C7B6B', fontSize: '0.85rem', marginTop: '4px' }}>
                    {show.max_capacity - ticketQuantity} tickets remaining
                  </p>
                </div>
                
                {/* Price Breakdown */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '12px' }}>
                    Price Breakdown
                  </h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#8C7B6B' }}>Ticket Price:</span>
                    <span style={{ color: '#F5F0E8' }}>${show.ticket_price} × {ticketQuantity}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#8C7B6B' }}>Subtotal:</span>
                    <span style={{ color: '#F5F0E8' }}>${calculateTotal()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#8C7B6B' }}>Platform Fee (10%):</span>
                    <span style={{ color: '#D4820A' }}>${calculatePlatformFee()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#8C7B6B' }}>Musician Share (70%):</span>
                    <span style={{ color: '#F0A500' }}>${calculateMusicianShare()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ color: '#8C7B6B' }}>Host Share (30%):</span>
                    <span style={{ color: '#F0A500' }}>${calculateHostShare()}</span>
                  </div>
                  
                  <div style={{ 
                    borderTop: '1px solid rgba(212,130,10,0.2)', 
                    paddingTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#F5F0E8' }}>Total:</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.3rem', color: '#F0A500', fontWeight: 600 }}>${calculateTotal()}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleBookShow}
                  disabled={bookingLoading || ticketQuantity > show.max_capacity}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                    color: '#1A1410',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    border: 'none',
                    cursor: bookingLoading || ticketQuantity > show.max_capacity ? 'not-allowed' : 'pointer',
                    opacity: bookingLoading || ticketQuantity > show.max_capacity ? 0.7 : 1
                  }}
                >
                  {bookingLoading ? 'Processing...' : 'Book Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
