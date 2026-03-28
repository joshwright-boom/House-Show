'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

interface BookingRequest {
  musician_id: string
  host_id: string
  proposed_date: string
  ticket_price: number
  message: string
  status: 'pending'
  proposed_musician_pct: 60
  proposed_host_pct: 33
  proposed_platform_pct: 7
}

interface Musician {
  id: string
  user_id: string
  name: string
  bio: string
  photo_url?: string
  genre?: string | null
  location?: string | null
  spotify_url?: string | null
  soundcloud_url?: string | null
  facebook_url?: string | null
  youtube_url?: string | null
  instagram_url?: string | null
  minimum_guarantee?: number | null
}

const getArtistInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
const getSocialLinks = (musician: Musician) => {
  const links = []
  if (musician.spotify_url) links.push({ name: 'Spotify', url: musician.spotify_url, icon: '🎵' })
  if (musician.soundcloud_url) links.push({ name: 'SoundCloud', url: musician.soundcloud_url, icon: '🎧' })
  if (musician.instagram_url) links.push({ name: 'Instagram', url: musician.instagram_url, icon: '📷' })
  if (musician.facebook_url) links.push({ name: 'Facebook', url: musician.facebook_url, icon: '📘' })
  if (musician.youtube_url) links.push({ name: 'YouTube', url: musician.youtube_url, icon: '🎬' })
  return links
}

function BookShowInner() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [musician, setMusician] = useState<Musician | null>(null)
  const [musicianId, setMusicianId] = useState<string | null>(null)
  const [searchParamsReady, setSearchParamsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_time: '',
    venue_address: '',
    offer_amount: '',
    message: ''
  })
  const liveOfferAmount = Number.parseFloat(formData.offer_amount)
  const formattedMinimumGuarantee = Number.isFinite(liveOfferAmount) && liveOfferAmount > 0
    ? liveOfferAmount.toFixed(2)
    : '0.00'

  useEffect(() => {
    const musicianId = searchParams.get('musician_id')
    setMusicianId(musicianId)
    setSearchParamsReady(true)
  }, [searchParams])

  useEffect(() => {
    const loadData = async () => {
      if (!searchParamsReady) {
        return
      }

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
            .from('artist_profiles')
            .select('id, user_id, name, bio, genre, location, minimum_guarantee')
            .eq('id', musicianId)
            .maybeSingle()
          
          if (error) {
            console.error('Error loading musician:', error)
            setError('Musician not found')
          } else if (musicianData) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, photo_url, spotify_url, soundcloud_url, facebook_url, youtube_url, instagram_url')
              .eq('id', musicianData.user_id)
              .maybeSingle()

            if (profileError) {
              console.error('Error loading musician profile details:', profileError)
            }

            setMusician({
              ...musicianData,
              photo_url: profileData?.photo_url || undefined,
              spotify_url: profileData?.spotify_url || null,
              soundcloud_url: profileData?.soundcloud_url || null,
              facebook_url: profileData?.facebook_url || null,
              youtube_url: profileData?.youtube_url || null,
              instagram_url: profileData?.instagram_url || null,
              minimum_guarantee: musicianData.minimum_guarantee ?? null
            })
          } else {
            setError('Musician not found')
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
  }, [musicianId, router, searchParamsReady])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!musician) return

    try {
      setSubmitting(true)
      setError(null)

      // Validate form
      if (!formData.proposed_date || !formData.offer_amount) {
        setError('Please fill in all required fields')
        return
      }

      const {
        data: { user: authUser },
        error: authError
      } = await supabase.auth.getUser()

      if (authError) {
        console.error('Error loading authenticated user for booking request:', authError)
        setError('Failed to verify your account')
        return
      }

      if (!authUser) {
        setError('Please log in to send a booking request')
        router.push('/auth/login')
        return
      }

      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('host_profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (hostProfileError) {
        console.error('Error loading host profile for booking request:', hostProfileError)
        console.error('Host profile lookup details:', JSON.stringify(hostProfileError, null, 2))
        setError('Failed to load host profile')
        return
      }

      if (!hostProfile?.id) {
        console.error('Host profile not found for auth user:', authUser.id)
        setError('Host profile not found')
        return
      }

      const bookingRequest: BookingRequest = {
        musician_id: musician.id,
        host_id: hostProfile.id,
        proposed_date: formData.proposed_date,
        ticket_price: parseFloat(formData.offer_amount),
        message: formData.message,
        status: 'pending',
        proposed_musician_pct: 60,
        proposed_host_pct: 33,
        proposed_platform_pct: 7
      }

      // Insert booking request
      const { error: insertError } = await supabase
        .from('booking_requests')
        .insert([bookingRequest])

      if (insertError) {
        console.error('Error creating booking request:', insertError)
        console.error('Booking request payload:', bookingRequest)
        console.error('Booking request error details:', JSON.stringify(insertError, null, 2))
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
              {musician.photo_url ? (
                <img
                  src={musician.photo_url}
                  alt={musician.name}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(212,130,10,0.25)'
                  }}
                />
              ) : (
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#2A1F1A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  color: '#D4820A',
                  border: '1px solid rgba(212,130,10,0.25)',
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700
                }}>
                  {getArtistInitial(musician.name)}
                </div>
              )}
              <div>
                <h2 style={{ color: '#F5F0E8', marginBottom: '4px', fontSize: '1.3rem' }}>
                  {musician.name}
                </h2>
                <p style={{ color: '#8C7B6B', fontSize: '0.9rem', margin: 0 }}>
                  {musician.genre ? `Artist • ${musician.genre}` : 'Artist'}
                </p>
              </div>
            </div>
            {musician.location && (
              <p style={{ color: '#8C7B6B', fontSize: '0.95rem', margin: '14px 0 0' }}>
                {musician.location}
              </p>
            )}
            {musician.bio && (
              <p style={{ color: '#F5F0E8', fontSize: '0.95rem', margin: '10px 0 0', lineHeight: 1.5 }}>
                {musician.bio}
              </p>
            )}
            {getSocialLinks(musician).length > 0 && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                {getSocialLinks(musician).map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: 'rgba(240,165,0,0.1)',
                      border: '1px solid rgba(240,165,0,0.2)',
                      borderRadius: '6px',
                      color: '#F0A500',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      fontFamily: 'DM Sans, sans-serif'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                    {link.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            position: 'fixed',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(252,165,165,0.1)',
            border: '1px solid rgba(252,165,165,0.3)',
            borderRadius: '8px',
            padding: '16px',
            color: '#FCA5A5',
            textAlign: 'center',
            width: 'calc(100% - 32px)',
            maxWidth: '520px'
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

          {musician?.minimum_guarantee != null && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(44,34,24,0.35)',
              border: '1px solid rgba(212,130,10,0.2)'
            }}>
              <div style={{ color: '#F5F0E8', fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>
                Minimum Guarantee
              </div>
              <div style={{ color: '#8C7B6B', fontSize: '0.9rem', lineHeight: 1.6 }}>
                You agree to guarantee this artist a minimum of ${formattedMinimumGuarantee}. If your 60% ticket split exceeds this, the artist earns the split instead.
              </div>
            </div>
          )}

          <p style={{
            color: '#8C7B6B',
            fontSize: '0.78rem',
            lineHeight: 1.6,
            marginBottom: '16px'
          }}>
            By submitting this booking request, you agree to HouseShow&apos;s{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#D4820A', textDecoration: 'none' }}>
              Terms of Service
            </a>
            . You acknowledge that HouseShow is a marketplace platform only and is not responsible for events, conduct, or outcomes at any show booked through this platform.
          </p>

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

export default function BookShowPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookShowInner />
    </Suspense>
  )
}
