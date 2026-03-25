'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

interface BookingRequest {
  musician_id: string
  host_id: string
  proposed_date: string
  show_date: string
  proposed_time: string
  venue_address: string
  offer_amount: number
  message: string
  status: 'pending'
}

interface Musician {
  id: string
  name: string
  bio: string
  photo_url?: string
}

function BookShowContent() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [musician, setMusician] = useState<Musician | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const musicianId = searchParams.get('musician_id')

  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_time: '',
    venue_address: '',
    offer_amount: '',
    message: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check user authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        
        setUser({ id: user.id, email: user.email })

        // Check if user is a host
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()

        if (profile?.user_type !== 'host') {
          setError('Only hosts can send booking requests')
          setLoading(false)
          return
        }

        // Load musician details
        if (musicianId) {
          const { data: musicianData, error } = await supabase
            .from('profiles')
            .select('id, name, bio, photo_url')
            .eq('id', musicianId)
            .eq('user_type', 'musician')
            .single()
          
          if (error) {
            console.error('Error loading musician:', error)
            setError('Musician not found')
          } else if (musicianData) {
            setMusician(musicianData)
          }
        } else {
          setError('No musician specified')
        }
        
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [musicianId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !musician) return

    try {
      setSubmitting(true)
      setError(null)

      // Validate form
      if (!formData.proposed_date || !formData.proposed_time || !formData.venue_address || !formData.offer_amount) {
        setError('Please fill in all required fields')
        return
      }

      const bookingRequest: BookingRequest = {
        musician_id: musician.id,
        host_id: user.id,
        proposed_date: formData.proposed_date,
        show_date: formData.proposed_date,
        proposed_time: formData.proposed_time,
        venue_address: formData.venue_address,
        offer_amount: parseFloat(formData.offer_amount),
        message: formData.message,
        status: 'pending'
      }

      // Insert booking request
      const { error: insertError } = await supabase
        .from('booking_requests')
        .insert([bookingRequest])

      if (insertError) {
        console.error('Error creating booking request:', insertError)
        setError('Failed to send booking request')
        return
      }

      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard?message=Booking request sent successfully!')
      }, 2000)

    } catch (error) {
      console.error('Error submitting booking request:', error)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8C7B6B', fontSize: '1.2rem' }}>Loading...</div>
      </main>
    )
  }

  if (error && !musician) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px' }}>
        <div style={{ color: '#FCA5A5', fontSize: '1.2rem', marginBottom: '20px', textAlign: 'center' }}>
          {error}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            backgroundColor: '#D4820A',
            color: '#1A1410',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Back to Dashboard
        </button>
      </main>
    )
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px' }}>
        <div style={{ color: '#22c55e', fontSize: '2rem', marginBottom: '20px' }}>✅</div>
        <div style={{ color: '#22c55e', fontSize: '1.5rem', marginBottom: '10px', textAlign: 'center' }}>
          Booking Request Sent!
        </div>
        <div style={{ color: '#8C7B6B', fontSize: '1rem', textAlign: 'center', marginBottom: '20px' }}>
          Your booking request has been sent to {musician?.name}. They will review it and respond soon.
        </div>
        <div style={{ color: '#8C7B6B', fontSize: '0.9rem', textAlign: 'center' }}>
          Redirecting to dashboard...
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#F5F0E8', 
          marginBottom: '32px', 
          fontSize: '2.5rem', 
          fontWeight: '700',
          textAlign: 'center'
        }}>
          Send Booking Request
        </h1>

        {musician && (
          <div style={{
            background: 'rgba(26,20,16,0.8)',
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#2A1F1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🎵
              </div>
              <div>
                <h2 style={{ color: '#F5F0E8', marginBottom: '4px', fontSize: '1.3rem' }}>
                  {musician.name}
                </h2>
                <p style={{ color: '#8C7B6B', fontSize: '0.9rem', margin: 0 }}>
                  {musician.bio || 'Musician'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(252,165,165,0.1)',
            border: '1px solid rgba(252,165,165,0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#FCA5A5',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          background: 'rgba(26,20,16,0.8)',
          border: '1px solid rgba(212,130,10,0.2)',
          borderRadius: '12px',
          padding: '32px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              color: '#F5F0E8', 
              marginBottom: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Proposed Date *
            </label>
            <input
              type="date"
              name="proposed_date"
              value={formData.proposed_date}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.3)',
                background: '#2A1F1A',
                color: '#F5F0E8',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              color: '#F5F0E8', 
              marginBottom: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Proposed Time *
            </label>
            <input
              type="time"
              name="proposed_time"
              value={formData.proposed_time}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.3)',
                background: '#2A1F1A',
                color: '#F5F0E8',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              color: '#F5F0E8', 
              marginBottom: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Venue Address *
            </label>
            <input
              type="text"
              name="venue_address"
              value={formData.venue_address}
              onChange={handleInputChange}
              placeholder="Enter the venue address"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.3)',
                background: '#2A1F1A',
                color: '#F5F0E8',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              color: '#F5F0E8', 
              marginBottom: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Offer Amount ($) *
            </label>
            <input
              type="number"
              name="offer_amount"
              value={formData.offer_amount}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.3)',
                background: '#2A1F1A',
                color: '#F5F0E8',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ 
              display: 'block', 
              color: '#F5F0E8', 
              marginBottom: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Message to Musician
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Add any additional details about the event..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.3)',
                background: '#2A1F1A',
                color: '#F5F0E8',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: submitting ? '#666' : '#D4820A',
                color: '#1A1410',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = '#F0A500'
              }}
              onMouseLeave={(e) => {
                if (!submitting) e.currentTarget.style.backgroundColor = '#D4820A'
              }}
            >
              {submitting ? 'Sending...' : 'Send Booking Request'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '14px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                color: '#F5F0E8',
                border: '1px solid rgba(212,130,10,0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default function BookShow() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8C7B6B', fontSize: '1.2rem' }}>Loading...</div>
      </main>
    }>
      <BookShowContent />
    </Suspense>
  )
}
