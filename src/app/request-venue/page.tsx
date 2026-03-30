'use client'

import { Suspense, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

interface HostProfile {
  id: string
  user_id: string
  location?: string | null
  address?: string | null
  description?: string | null
  capacity?: number | null
  venue_description?: string | null
  venue_capacity?: number | null
  has_sound_equipment?: boolean | null
  }

interface HostAccountProfile {
  id: string
  name?: string | null
  photo_url?: string | null
}

interface BookingRequestPayload {
  musician_id: string
  host_id: string
  proposed_date: string
  ticket_price: number
  message: string
  guaranteed_minimum: number
  status: string
  proposed_musician_pct: number
  proposed_host_pct: number
  proposed_platform_pct: number
}

function RequestVenueInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [host, setHost] = useState<HostProfile | null>(null)
  const [hostProfile, setHostProfile] = useState<HostAccountProfile | null>(null)
  const [musicianProfileId, setMusicianProfileId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_time: '',
    ticket_price: '',
    guaranteed_minimum: '',
    message: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const hostId = searchParams.get('host_id')
        console.log('RequestVenue URL params:', {
          host_id: hostId,
          search: searchParams.toString()
        })

        if (!hostId) {
          setError('No host specified')
          return
        }

        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser()
        console.log('RequestVenue auth.getUser result:', {
          user,
          authError
        })

        if (authError) {
          console.error('Error loading authenticated user:', authError)
          setError('Failed to verify your account')
          return
        }

        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data: hostData, error: hostError } = await supabase
          .from('host_profiles')
          .select('id, user_id, description, capacity')
          .eq('id', hostId)
          .maybeSingle()
        console.log('RequestVenue host_profiles query result:', {
          hostId,
          hostData,
          hostError
        })

        if (hostError) {
          console.error('Error loading host:', hostError)
          setError('Host not found')
          return
        }

        if (!hostData) {
          setError('Host not found')
          return
        }

        setHost(hostData)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, photo_url')
          .eq('id', hostData.user_id)
          .maybeSingle()
        console.log('RequestVenue profiles query result:', {
          profileUserId: hostData.user_id,
          profileData,
          profileError
        })

        if (profileError) {
          console.error('Error loading host profile:', profileError)
        } else if (profileData) {
          setHostProfile(profileData)
        }

        const { data: artistProfile, error: artistProfileError } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        console.log('RequestVenue artist_profiles query result:', {
          authUserId: user.id,
          artistProfile,
          artistProfileError
        })

        if (artistProfileError) {
          console.error('Error loading musician profile:', artistProfileError)
          setError('Failed to load musician profile')
          return
        }

        if (!artistProfile?.id) {
          setError('You need a musician profile to request a show')
          return
        }

        setMusicianProfileId(artistProfile.id)
      } catch (loadError) {
        console.error('Error loading request venue page:', loadError)
        setError('Failed to load venue request form')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, searchParams])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!host?.id || !musicianProfileId) {
      setError('Unable to send request')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      if (!formData.proposed_date || !formData.proposed_time || !formData.ticket_price) {
        setError('Please fill in all required fields')
        return
      }

      const ticketPrice = Number.parseFloat(formData.ticket_price)
      const guaranteedMinimum = Number.parseFloat(formData.guaranteed_minimum || '0')

      const payload: BookingRequestPayload = {
        musician_id: musicianProfileId,
        host_id: host.id,
        proposed_date: formData.proposed_date,
        ticket_price: Number.isFinite(ticketPrice) ? ticketPrice : 0,
        message: formData.message,
        guaranteed_minimum: Number.isFinite(guaranteedMinimum) ? Math.round(guaranteedMinimum) : 0,
        status: 'pending',
        proposed_musician_pct: 60,
        proposed_host_pct: 33,
        proposed_platform_pct: 7
      }
      console.log('RequestVenue booking request payload:', payload)

      const { error: insertError } = await supabase
        .from('booking_requests')
        .insert([payload])
      console.log('RequestVenue booking request insert result:', {
        insertError,
        insertErrorDetails: insertError ? JSON.stringify(insertError, null, 2) : null
      })

      if (insertError) {
        console.error('Error creating venue request:', insertError)
        setError('Failed to send request')
        return
      }

      setSuccess(true)

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (submitError) {
      console.error('Error submitting venue request:', submitError)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8C7B6B', fontSize: '1.1rem' }}>Loading...</div>
      </main>
    )
  }

  if (error && !host) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '24px' }}>
        <div style={{ color: '#FCA5A5', fontSize: '1.1rem', textAlign: 'center', marginBottom: '20px' }}>
          {error}
        </div>
        <a
          href="/venue-radar"
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: '#D4820A',
            color: '#1A1410',
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600
          }}
        >
          Back to Venue Radar
        </a>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', padding: '24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>
            HouseShow
          </a>
          <a href="/venue-radar" style={{ color: '#8C7B6B', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
            Back to Venue Radar
          </a>
        </nav>

        {success ? (
          <section style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '16px',
            background: 'rgba(44,34,24,0.35)',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#22c55e', fontSize: '2rem', marginBottom: '12px' }}>Request Sent!</div>
            <p style={{ color: '#8C7B6B', margin: 0 }}>Redirecting to your dashboard...</p>
          </section>
        ) : (
          <section style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '16px',
            background: 'rgba(44,34,24,0.35)',
            overflow: 'hidden'
          }}>
            <div style={{
                width: '100%',
                height: '220px',
                background: 'rgba(26,20,16,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D4820A',
                fontSize: '3rem',
                fontFamily: "'Playfair Display', serif"
              }}>
                {hostProfile?.name?.trim().charAt(0).toUpperCase() || 'H'}
              </div>

            <div style={{ padding: '32px' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Request Venue
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', color: '#F5F0E8', marginBottom: '8px' }}>
                {hostProfile?.name || 'Host Venue'}
              </h1>
              <p style={{ color: '#D9C6A5', fontFamily: "'DM Sans', sans-serif", marginTop: 0, marginBottom: '8px' }}>
                {host?.location || host?.address || 'Location not listed'}
              </p>
              {host?.description && (
                <p style={{ color: '#8C7B6B', lineHeight: 1.6, marginTop: 0, marginBottom: '24px', fontFamily: "'DM Sans', sans-serif" }}>
                  {host.venue_description}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ border: '1px solid rgba(212,130,10,0.15)', borderRadius: '10px', padding: '14px', background: 'rgba(26,20,16,0.45)' }}>
                  <div style={{ color: '#8C7B6B', fontSize: '0.8rem', marginBottom: '6px' }}>Venue Capacity</div>
                  <div style={{ color: '#F5F0E8' }}>{host?.capacity ? `${host.venue_capacity} people` : 'Not listed'}</div>
                </div>
                <div style={{ border: '1px solid rgba(212,130,10,0.15)', borderRadius: '10px', padding: '14px', background: 'rgba(26,20,16,0.45)' }}>
                  <div style={{ color: '#8C7B6B', fontSize: '0.8rem', marginBottom: '6px' }}>Sound Equipment</div>
                  <div style={{ color: '#F5F0E8' }}>{host?.has_sound_equipment ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {error && (
                <div style={{
                  marginBottom: '20px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(127,29,29,0.2)',
                  border: '1px solid rgba(248,113,113,0.35)',
                  color: '#FCA5A5'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#F5F0E8', marginBottom: '8px', fontWeight: 600 }}>Proposed Date *</label>
                  <input
                    type="date"
                    name="proposed_date"
                    required
                    value={formData.proposed_date}
                    onChange={handleInputChange}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#F5F0E8', marginBottom: '8px', fontWeight: 600 }}>Proposed Time *</label>
                  <input
                    type="time"
                    name="proposed_time"
                    required
                    value={formData.proposed_time}
                    onChange={handleInputChange}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#F5F0E8', marginBottom: '8px', fontWeight: 600 }}>Your Ticket Price Suggestion ($) *</label>
                  <input
                    type="number"
                    name="ticket_price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.ticket_price}
                    onChange={handleInputChange}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', color: '#F5F0E8', marginBottom: '8px', fontWeight: 600 }}>Your Minimum Guarantee Requirement ($)</label>
                  <input
                    type="number"
                    name="guaranteed_minimum"
                    min="0"
                    step="0.01"
                    value={formData.guaranteed_minimum}
                    onChange={handleInputChange}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: '#F5F0E8', marginBottom: '8px', fontWeight: 600 }}>Message to Host</label>
                  <textarea
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                    color: '#1A1410',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Sending Request...' : 'Send Request'}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid rgba(212,130,10,0.3)',
  background: '#2A1F1A',
  color: '#F5F0E8',
  fontSize: '1rem'
}

export default function RequestVenuePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1A1410', color: '#8C7B6B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <RequestVenueInner />
    </Suspense>
  )
}
