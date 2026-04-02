'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import ProfitCalculator from '@/components/ProfitCalculator'

interface BookingRequest {
  musician_id: string
  host_id: string
  proposed_date: string
  ticket_price: number
  message: string
  status: string
  proposed_musician_pct: number
  proposed_host_pct: number
  proposed_platform_pct: number
  guaranteed_minimum: number
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

interface HostProfile {
  id: string
  neighborhood?: string | null
  full_address?: string | null
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
  const [hostId, setHostId] = useState<string | null>(null)
  const [selectedHost, setSelectedHost] = useState<HostProfile | null>(null)
  const [searchParamsReady, setSearchParamsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dealType, setDealType] = useState<'guarantee' | 'split' | null>(null)
  const [splitArtistPct, setSplitArtistPct] = useState(60)
  const [splitHostPct, setSplitHostPct] = useState(33)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_time: '',
    venue_address: '',
    offer_amount: '',
    ticket_price: '',
    message: ''
  })
  const liveOfferAmount = Number.parseFloat(formData.offer_amount)
  const formattedMinimumGuarantee = Number.isFinite(liveOfferAmount) && liveOfferAmount > 0
    ? liveOfferAmount.toFixed(2)
    : '0.00'

  useEffect(() => {
    const musicianId = searchParams.get('musician_id')
    const hostId = searchParams.get('host_id')
    setMusicianId(musicianId)
    setHostId(hostId)
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
        }

        if (hostId) {
          const { data: hostData, error: hostError } = await supabase
            .from('host_profiles')
            .select('id, neighborhood, full_address')
            .eq('id', hostId)
            .maybeSingle()

          if (hostError) {
            console.error('Error loading host profile:', hostError)
            setError('Host not found')
          } else if (hostData) {
            setSelectedHost(hostData)
          } else {
            setError('Host not found')
          }
        }

        if (!musicianId && hostId) {
          const { data: musicianData, error: musicianError } = await supabase
            .from('artist_profiles')
            .select('id, user_id, name, bio, genre, location, minimum_guarantee')
            .eq('user_id', user.id)
            .maybeSingle()

          if (musicianError) {
            console.error('Error loading logged-in musician profile:', musicianError)
            setError('Failed to load your musician profile')
          } else if (musicianData) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, photo_url, spotify_url, soundcloud_url, facebook_url, youtube_url, instagram_url')
              .eq('id', musicianData.user_id)
              .maybeSingle()

            if (profileError) {
              console.error('Error loading logged-in musician profile details:', profileError)
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
            setError('Musician profile not found')
          }
        }

        if (!musicianId && !hostId) {
          setError('No musician or host specified')
        }
        
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [hostId, musicianId, router, searchParamsReady])

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
      if (!dealType) {
        setError('Please select a deal type')
        return
      }
      if (!formData.proposed_date) {
        setError('Please fill in all required fields')
        return
      }
      if (dealType === 'guarantee' && !formData.offer_amount) {
        setError('Please enter a guarantee amount')
        return
      }
      if (dealType === 'split' && !formData.ticket_price) {
        setError('Please enter a ticket price')
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

      let resolvedMusicianId = musicianId || musician?.id || null

      if (!resolvedMusicianId) {
        const { data: musicianProfile, error: musicianProfileError } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (musicianProfileError) {
          console.error('Error loading musician profile for booking request:', musicianProfileError)
          setError('Failed to load musician profile')
          return
        }

        if (!musicianProfile?.id) {
          setError('Musician profile not found')
          return
        }

        resolvedMusicianId = musicianProfile.id
      }

      if (!resolvedMusicianId) {
        setError('Musician profile not found')
        return
      }

      let resolvedHostId = selectedHost?.id || null

      if (!resolvedHostId) {
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

        resolvedHostId = hostProfile.id
      }

      if (!resolvedHostId) {
        setError('Host profile not found')
        return
      }

      const bookingRequest: BookingRequest = {
        musician_id: resolvedMusicianId,
        host_id: resolvedHostId,
        proposed_date: formData.proposed_date,
        ticket_price: dealType === 'guarantee' ? parseFloat(formData.offer_amount) : Math.round(parseFloat(formData.ticket_price || '0') * 100) / 100,
        message: formData.message,
        status: 'pending',
        proposed_musician_pct: dealType === 'split' ? splitArtistPct : 0,
        proposed_host_pct: dealType === 'split' ? splitHostPct : 0,
        proposed_platform_pct: 7,
        guaranteed_minimum: dealType === 'guarantee' ? parseFloat(formData.offer_amount) : 0,
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

      // Notify the musician that a host sent them a booking request (fire-and-forget)
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()
        if (authSession?.access_token && resolvedHostId) {
          const dealSummary = dealType === 'guarantee'
            ? `Guaranteed payment: $${Number.parseFloat(formData.offer_amount || '0').toFixed(2)}`
            : `Revenue split: ${splitArtistPct}% artist / ${splitHostPct}% host`
          // Use the host profile ID as hostProfileId so the API can resolve the host's name for the email
          fetch('/api/notify-booking-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({
              type: 'new_request',
              hostProfileId: resolvedHostId,
              artistName: musician?.name || 'A host',
              proposedDate: formData.proposed_date,
              message: formData.message,
              dealSummary,
            }),
          }).catch((err) => console.error('Failed to send booking notification:', err))
        }
      } catch (notifyError) {
        console.error('Error sending booking notification:', notifyError)
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/bookings')
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
                      padding: '6px 12px',
                      background: 'rgba(240,165,0,0.1)',
                      border: '1px solid rgba(240,165,0,0.2)',
                      borderRadius: '20px',
                      color: '#F0A500',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500
                    }}
                  >
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

          {/* Deal type selector */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.7rem',
              color: '#D4820A',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}>
              How would you like to pay the artist?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Flat Guarantee */}
              <button
                type="button"
                onClick={() => setDealType('guarantee')}
                style={{
                  padding: '24px 20px',
                  borderRadius: '10px',
                  border: dealType === 'guarantee'
                    ? '2px solid #D4820A'
                    : '1px solid rgba(212,130,10,0.25)',
                  background: dealType === 'guarantee'
                    ? 'rgba(212,130,10,0.1)'
                    : 'rgba(44,34,24,0.4)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>💵</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: dealType === 'guarantee' ? '#F0A500' : '#F5F0E8',
                  marginBottom: '8px',
                }}>
                  Flat Guarantee
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.82rem',
                  color: '#8C7B6B',
                  lineHeight: 1.5,
                }}>
                  You pay the artist a set amount to perform. You keep all ticket sales to recoup and profit.
                </div>
              </button>

              {/* Revenue Split */}
              <button
                type="button"
                onClick={() => setDealType('split')}
                style={{
                  padding: '24px 20px',
                  borderRadius: '10px',
                  border: dealType === 'split'
                    ? '2px solid #D4820A'
                    : '1px solid rgba(212,130,10,0.25)',
                  background: dealType === 'split'
                    ? 'rgba(212,130,10,0.1)'
                    : 'rgba(44,34,24,0.4)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>📊</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: dealType === 'split' ? '#F0A500' : '#F5F0E8',
                  marginBottom: '8px',
                }}>
                  Revenue Split
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.82rem',
                  color: '#8C7B6B',
                  lineHeight: 1.5,
                }}>
                  No upfront cost. You and the artist split ticket sales based on a negotiated percentage.
                </div>
              </button>
            </div>
          </div>

          {/* Rest of form — only visible once a deal type is chosen */}
          {dealType && (
            <>
              {/* Proposed Date */}
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

              {/* Proposed Time */}
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

              {/* Venue Address */}
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

              {/* Guarantee Amount — only for guarantee */}
              {dealType === 'guarantee' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    color: '#F5F0E8',
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    Guarantee Amount ($) *
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
              )}

              {/* Message to Musician */}
              <div style={{ marginBottom: '28px' }}>
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

              {/* Ticket price + Revenue split calculator — only for split */}
              {dealType === 'split' && (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      color: '#F5F0E8',
                      marginBottom: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}>
                      Ticket Price ($) *
                    </label>
                    <input
                      type="number"
                      name="ticket_price"
                      value={formData.ticket_price}
                      onChange={handleInputChange}
                      placeholder="20.00"
                      min="1"
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

                  <div style={{ marginBottom: '24px' }}>
                    <ProfitCalculator
                      compact
                      onSplitChange={(a, h) => { setSplitArtistPct(a); setSplitHostPct(h) }}
                    />
                  </div>

                  {(() => {
                    const price = parseFloat(formData.ticket_price)
                    if (!Number.isFinite(price) || price <= 0) return null
                    const artistEarn = Math.round(price * splitArtistPct) / 100
                    const hostEarn = Math.round(price * splitHostPct) / 100
                    const platformEarn = Math.round(price * 7) / 100
                    return (
                      <div style={{
                        marginBottom: '24px',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(212,130,10,0.08)',
                        border: '1px solid rgba(212,130,10,0.2)',
                      }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: '#D4820A', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Per ticket breakdown
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#F5F0E8', lineHeight: 1.7 }}>
                          Artist earns{' '}
                          <span style={{ color: '#F0A500', fontWeight: 700 }}>${artistEarn.toFixed(2)}</span>
                          {' · '}You keep{' '}
                          <span style={{ color: '#D9C6A5', fontWeight: 600 }}>${hostEarn.toFixed(2)}</span>
                          {' · '}Platform keeps{' '}
                          <span style={{ color: '#4A4240', fontWeight: 600 }}>${platformEarn.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}

              {/* Confirmation box */}
              {dealType === 'guarantee' && (
                <div style={{
                  marginBottom: '24px',
                  padding: '18px 20px',
                  borderRadius: '10px',
                  background: 'rgba(44,34,24,0.45)',
                  border: '1px solid rgba(212,130,10,0.25)'
                }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.65rem',
                    color: '#D4820A',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    Your offer
                  </div>
                  <div style={{ color: '#F5F0E8', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    You are offering the artist a guaranteed payment of{' '}
                    <span style={{ color: '#F0A500', fontWeight: 600 }}>${formattedMinimumGuarantee}</span>.
                    You keep all ticket revenue. If the show doesn&apos;t cover your guarantee, that&apos;s your risk.
                  </div>
                </div>
              )}

              {dealType === 'split' && (
                <div style={{
                  marginBottom: '24px',
                  padding: '18px 20px',
                  borderRadius: '10px',
                  background: 'rgba(44,34,24,0.45)',
                  border: '1px solid rgba(212,130,10,0.25)'
                }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.65rem',
                    color: '#D4820A',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    Your offer
                  </div>
                  <div style={{ color: '#F5F0E8', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    You are proposing a{' '}
                    <span style={{ color: '#F0A500', fontWeight: 600 }}>{splitArtistPct}% / {splitHostPct}%</span> split.
                    The artist earns{' '}
                    <span style={{ color: '#F0A500', fontWeight: 600 }}>{splitArtistPct}%</span> of ticket sales.
                    You earn{' '}
                    <span style={{ color: '#F0A500', fontWeight: 600 }}>{splitHostPct}%</span>.
                    HouseShow keeps 7%.
                  </div>
                </div>
              )}

              {/* Terms */}
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

              {/* Submit / Cancel */}
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
            </>
          )}

          {/* Cancel button always visible when no deal type chosen yet */}
          {!dealType && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  backgroundColor: 'transparent',
                  color: '#8C7B6B',
                  border: '1px solid rgba(212,130,10,0.2)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

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
