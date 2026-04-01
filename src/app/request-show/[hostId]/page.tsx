'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface HostProfile {
  id: string
  name: string
  location_address?: string
}

export default function RequestShowPage({ params }: { params: { hostId: string } }) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [host, setHost] = useState<HostProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [artistName, setArtistName] = useState('')

  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_venue: '',
    proposed_ticket_price: '',
    minimum_guarantee: '',
    message: ''
  })

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/auth/login'
          return
        }
        setUser({ id: user.id })

        const { data: artistProfile, error: artistProfileError } = await supabase
          .from('artist_profiles')
          .select('minimum_guarantee, name')
          .eq('id', user.id)
          .maybeSingle()

        if (artistProfileError) {
          console.error('Error loading artist minimum guarantee:', artistProfileError)
        } else if (artistProfile) {
          if (artistProfile.minimum_guarantee != null) {
            setFormData((prev) => ({
              ...prev,
              minimum_guarantee: String(artistProfile.minimum_guarantee)
            }))
          }
          if (artistProfile.name) {
            setArtistName(artistProfile.name)
          }
        }

        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('id, name, location_address')
          .eq('id', params.hostId)
          .eq('user_type', 'host')
          .single()

        if (hostProfile) {
          setHost(hostProfile)
          setFormData(prev => ({
            ...prev,
            proposed_venue: prev.proposed_venue || hostProfile.location_address || ''
          }))
        }
      } catch (e) {
        setError('Unable to load request page.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.hostId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSubmitting(true)
      setError('')
      setSuccessMessage('')

      const proposedTicketPrice = Number.parseFloat(formData.proposed_ticket_price || '0')
      const payload = {
        host_id: params.hostId,
        musician_id: user.id,
        proposed_date: formData.proposed_date,
        proposed_venue: formData.proposed_venue,
        proposed_ticket_price: proposedTicketPrice,
        venue_address: formData.proposed_venue,
        ticket_price: proposedTicketPrice,
        show_date: formData.proposed_date,
        message: formData.message,
        status: 'pending',
        musician_percentage: 60,
        host_percentage: 33,
        platform_percentage: 7,
        musician_split: 60,
        host_split: 33,
        minimum_guarantee: formData.minimum_guarantee ? Number(formData.minimum_guarantee) : null,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('booking_requests')
        .insert(payload as any)

      if (error) {
        throw error
      }

      setSuccessMessage('Request sent! The host will be in touch.')

      // Notify host via email (fire-and-forget)
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()
        if (authSession?.access_token) {
          const dealSummary = formData.minimum_guarantee
            ? `Guaranteed minimum: $${Number(formData.minimum_guarantee).toFixed(2)}, Ticket price: $${Number(formData.proposed_ticket_price || 0).toFixed(2)}`
            : `Revenue split: 60% artist / 33% host, Ticket price: $${Number(formData.proposed_ticket_price || 0).toFixed(2)}`
          fetch('/api/notify-booking-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({
              type: 'new_request',
              hostUserId: params.hostId,
              artistName: artistName || 'An artist',
              proposedDate: formData.proposed_date,
              message: formData.message,
              dealSummary,
            }),
          }).catch((err) => console.error('Failed to send booking notification:', err))
        }
      } catch (notifyError) {
        console.error('Error sending booking notification:', notifyError)
      }

      setFormData({
        proposed_date: '',
        proposed_venue: host?.location_address || '',
        proposed_ticket_price: '',
        minimum_guarantee: formData.minimum_guarantee,
        message: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F0E8' }}>
        Loading...
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '42px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>
            HouseShow
          </a>
          <a href="/venue-radar" style={{ color: '#8C7B6B', textDecoration: 'none' }}>Back to Venue Radar</a>
        </nav>

        <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '16px', padding: '32px', background: 'rgba(44,34,24,0.35)' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Request Show
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', marginBottom: '10px' }}>
            Send Booking Request{host?.name ? ` to ${host.name}` : ''}
          </h1>
          <p style={{ color: '#8C7B6B', marginBottom: '24px' }}>
            Fill out the details below and send your request.
          </p>

          <div style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(26,20,16,0.35)',
            border: '1px solid rgba(212,130,10,0.2)'
          }}>
            <div style={{ color: '#F5F0E8', fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>
              Default Revenue Split
            </div>
            <div style={{ color: '#8C7B6B', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '8px' }}>
              You will receive 60% of ticket sales. Host receives 33%. Platform fee: 7%.
            </div>
            <div style={{ color: '#8C7B6B', fontSize: '0.85rem', lineHeight: 1.6 }}>
              You can negotiate the split after the host responds.
            </div>
          </div>

          {successMessage && (
            <div style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.35)',
              color: '#86efac',
              width: 'calc(100% - 32px)',
              maxWidth: '520px'
            }}>
              {successMessage}
            </div>
          )}

          {error && (
            <div style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(127,29,29,0.2)',
              border: '1px solid rgba(248,113,113,0.35)',
              color: '#fecaca',
              width: 'calc(100% - 32px)',
              maxWidth: '520px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8C7B6B', marginBottom: '8px' }}>Proposed Date</label>
              <input
                type="date"
                required
                value={formData.proposed_date}
                onChange={(e) => setFormData(prev => ({ ...prev, proposed_date: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(212,130,10,0.25)',
                  borderRadius: '8px',
                  background: 'rgba(26,20,16,0.8)',
                  color: '#F5F0E8'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8C7B6B', marginBottom: '8px' }}>Proposed Venue/Address</label>
              <input
                type="text"
                required
                value={formData.proposed_venue}
                onChange={(e) => setFormData(prev => ({ ...prev, proposed_venue: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(212,130,10,0.25)',
                  borderRadius: '8px',
                  background: 'rgba(26,20,16,0.8)',
                  color: '#F5F0E8'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8C7B6B', marginBottom: '8px' }}>Ticket Price</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.proposed_ticket_price}
                onChange={(e) => setFormData(prev => ({ ...prev, proposed_ticket_price: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(212,130,10,0.25)',
                  borderRadius: '8px',
                  background: 'rgba(26,20,16,0.8)',
                  color: '#F5F0E8'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#8C7B6B', marginBottom: '8px' }}>
                Minimum Guarantee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minimum_guarantee}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_guarantee: e.target.value }))}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(212,130,10,0.25)',
                  borderRadius: '8px',
                  background: 'rgba(26,20,16,0.8)',
                  color: '#F5F0E8'
                }}
              />
              <p style={{ color: '#8C7B6B', fontSize: '0.82rem', marginTop: '8px', marginBottom: 0, lineHeight: 1.6 }}>
                I require a minimum of $__ for this show (host pays difference if tickets don&apos;t cover it).
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#8C7B6B', marginBottom: '8px' }}>Message</label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(212,130,10,0.25)',
                  borderRadius: '8px',
                  background: 'rgba(26,20,16,0.8)',
                  color: '#F5F0E8',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 18px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Sending Request...' : 'Send Request'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
