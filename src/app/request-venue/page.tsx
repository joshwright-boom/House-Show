'use client'

import { Suspense, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

interface HostProfile {
  id: string
  user_id: string
  address?: string | null
  venue_description?: string | null
  venue_capacity?: number | null
  has_sound_equipment?: boolean | null
  amenities?: string[] | null
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
  const [musicianName, setMusicianName] = useState<string>('')
  const [dealType, setDealType] = useState<'split' | 'guarantee' | null>(null)
  const [artistPct, setArtistPct] = useState(60)

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
          .select('id, user_id, venue_description, venue_capacity, has_sound_equipment, amenities, address')
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
          .select('id, name')
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
        setMusicianName(artistProfile.name || '')
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

      if (!dealType) {
        setError('Please select a deal type')
        return
      }
      if (!formData.proposed_date || !formData.proposed_time) {
        setError('Please fill in all required fields')
        return
      }
      if (dealType === 'split' && !formData.ticket_price) {
        setError('Please enter a ticket price')
        return
      }
      if (dealType === 'guarantee' && !formData.guaranteed_minimum) {
        setError('Please enter a guaranteed amount')
        return
      }

      const ticketPrice = Number.parseFloat(formData.ticket_price)
      const guaranteedMinimum = Number.parseFloat(formData.guaranteed_minimum || '0')
      const hostPct = 93 - artistPct

      const payload: BookingRequestPayload = {
        musician_id: musicianProfileId,
        host_id: host.id,
        proposed_date: formData.proposed_date,
        ticket_price: dealType === 'split' && Number.isFinite(ticketPrice) ? ticketPrice : 0,
        message: formData.message,
        guaranteed_minimum: dealType === 'guarantee' && Number.isFinite(guaranteedMinimum) ? Math.round(guaranteedMinimum) : 0,
        status: 'pending',
        proposed_musician_pct: dealType === 'split' ? artistPct : 0,
        proposed_host_pct: dealType === 'split' ? hostPct : 0,
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

      // Notify host via email (fire-and-forget)
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()
        if (authSession?.access_token && host?.id) {
          const dealSummary = dealType === 'split'
            ? `Revenue split: ${artistPct}% artist / ${93 - artistPct}% host at $${Number.parseFloat(formData.ticket_price || '0').toFixed(2)}/ticket`
            : `Guaranteed minimum: $${Number.parseFloat(formData.guaranteed_minimum || '0').toFixed(2)}`
          fetch('/api/notify-booking-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({
              type: 'new_request',
              hostProfileId: host.id,
              artistName: musicianName || 'An artist',
              proposedDate: formData.proposed_date,
              message: formData.message,
              dealSummary,
            }),
          }).catch((err) => console.error('Failed to send booking notification:', err))
        }
      } catch (notifyError) {
        console.error('Error sending booking notification:', notifyError)
      }

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
                {host?.address || 'Location not listed'}
              </p>
              {host?.venue_description && (
                <p style={{ color: '#8C7B6B', lineHeight: 1.6, marginTop: 0, marginBottom: '24px', fontFamily: "'DM Sans', sans-serif" }}>
                  {host.venue_description}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ border: '1px solid rgba(212,130,10,0.15)', borderRadius: '10px', padding: '14px', background: 'rgba(26,20,16,0.45)' }}>
                  <div style={{ color: '#8C7B6B', fontSize: '0.8rem', marginBottom: '6px' }}>Venue Capacity</div>
                  <div style={{ color: '#F5F0E8' }}>{host?.venue_capacity ? `${host.venue_capacity} people` : 'Not listed'}</div>
                </div>
                <div style={{ border: '1px solid rgba(212,130,10,0.15)', borderRadius: '10px', padding: '14px', background: 'rgba(26,20,16,0.45)' }}>
                  <div style={{ color: '#8C7B6B', fontSize: '0.8rem', marginBottom: '6px' }}>Sound Equipment</div>
                  <div style={{ color: '#F5F0E8' }}>{host?.has_sound_equipment ? 'Yes' : 'No'}</div>
                </div>
                {host?.amenities && host.amenities.length > 0 && (
                  <div style={{ border: '1px solid rgba(212,130,10,0.15)', borderRadius: '10px', padding: '14px', background: 'rgba(26,20,16,0.45)', gridColumn: '1 / -1' }}>
                    <div style={{ color: '#8C7B6B', fontSize: '0.8rem', marginBottom: '6px' }}>Amenities</div>
                    <div style={{ color: '#F5F0E8' }}>{host.amenities.join(', ')}</div>
                  </div>
                )}
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

                {/* Deal type selector */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.68rem',
                    color: '#D4820A',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    marginBottom: '14px'
                  }}>
                    How do you want to structure this deal?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setDealType('split')}
                      style={{
                        padding: '22px 18px',
                        borderRadius: '10px',
                        border: dealType === 'split' ? '2px solid #D4820A' : '1px solid rgba(212,130,10,0.25)',
                        background: dealType === 'split' ? 'rgba(212,130,10,0.1)' : 'rgba(26,20,16,0.5)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>📊</div>
                      <div style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: dealType === 'split' ? '#F0A500' : '#F5F0E8',
                        marginBottom: '8px',
                      }}>
                        Revenue Split
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#8C7B6B', lineHeight: 1.5 }}>
                        No upfront ask. You and the host split ticket sales. Great for building relationships with new venues.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDealType('guarantee')}
                      style={{
                        padding: '22px 18px',
                        borderRadius: '10px',
                        border: dealType === 'guarantee' ? '2px solid #D4820A' : '1px solid rgba(212,130,10,0.25)',
                        background: dealType === 'guarantee' ? 'rgba(212,130,10,0.1)' : 'rgba(26,20,16,0.5)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>💵</div>
                      <div style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: dealType === 'guarantee' ? '#F0A500' : '#F5F0E8',
                        marginBottom: '8px',
                      }}>
                        Minimum Guarantee
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#8C7B6B', lineHeight: 1.5 }}>
                        You need a guaranteed payment to show up. Host pays you a set amount regardless of ticket sales.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Fields — only shown once a deal type is selected */}
                {dealType && (
                  <>
                    {/* Proposed Date */}
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

                    {/* Proposed Time */}
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

                    {/* Ticket price — split only */}
                    {dealType === 'split' && (
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
                    )}

                    {/* Artist % slider — split only */}
                    {dealType === 'split' && (
                      <div style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ color: '#F5F0E8', fontWeight: 600 }}>Artist % Ask</label>
                          <span style={{ color: '#F0A500', fontWeight: 700, fontFamily: "'Space Mono', monospace", fontSize: '0.95rem' }}>{artistPct}%</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={86}
                          value={artistPct}
                          onChange={(e) => setArtistPct(Number(e.target.value))}
                          style={{ width: '100%', accentColor: '#D4820A', cursor: 'pointer', height: '4px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#4A4240', marginTop: '4px' }}>
                          <span>40%</span><span>86%</span>
                        </div>
                        <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(26,20,16,0.5)', border: '1px solid rgba(212,130,10,0.15)' }}>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>
                            Host would receive{' '}
                            <span style={{ color: '#D9C6A5', fontWeight: 600 }}>{93 - artistPct}%</span>.{' '}
                            Platform keeps <span style={{ color: '#4A4240' }}>7%</span>.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Guaranteed amount — guarantee only */}
                    {dealType === 'guarantee' && (
                      <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', color: '#F5F0E8', marginBottom: '8px', fontWeight: 600 }}>Guaranteed Amount You Require ($) *</label>
                        <input
                          type="number"
                          name="guaranteed_minimum"
                          required
                          min="0"
                          step="0.01"
                          value={formData.guaranteed_minimum}
                          onChange={handleInputChange}
                          style={inputStyle}
                        />
                      </div>
                    )}

                    {/* Message */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', color: '#F5F0E8', marginBottom: '8px', fontWeight: 600 }}>Message to Host</label>
                      <textarea
                        name="message"
                        rows={5}
                        value={formData.message}
                        onChange={handleInputChange}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
                      />
                    </div>

                    {/* Confirmation box */}
                    {dealType === 'split' && (
                      <div style={{
                        marginBottom: '22px',
                        padding: '16px 18px',
                        borderRadius: '10px',
                        background: 'rgba(44,34,24,0.45)',
                        border: '1px solid rgba(212,130,10,0.2)'
                      }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: '#D4820A', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Your proposal
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', color: '#F5F0E8', lineHeight: 1.6 }}>
                          You&apos;re proposing a{' '}
                          <span style={{ color: '#F0A500', fontWeight: 600 }}>{artistPct}% / {93 - artistPct}%</span> revenue split at{' '}
                          <span style={{ color: '#F0A500', fontWeight: 600 }}>${Number.parseFloat(formData.ticket_price || '0').toFixed(2)}</span> per ticket.
                          The host reviews and can accept or counter-offer.
                        </div>
                      </div>
                    )}

                    {dealType === 'guarantee' && (
                      <div style={{
                        marginBottom: '22px',
                        padding: '16px 18px',
                        borderRadius: '10px',
                        background: 'rgba(44,34,24,0.45)',
                        border: '1px solid rgba(212,130,10,0.2)'
                      }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: '#D4820A', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Your proposal
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', color: '#F5F0E8', lineHeight: 1.6 }}>
                          You&apos;re requesting a guaranteed payment of{' '}
                          <span style={{ color: '#F0A500', fontWeight: 600 }}>
                            ${Number.parseFloat(formData.guaranteed_minimum || '0').toFixed(2)}
                          </span>.
                          The host pays this regardless of ticket sales.
                        </div>
                      </div>
                    )}

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
                  </>
                )}

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
