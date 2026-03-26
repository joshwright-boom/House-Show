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

  const [formData, setFormData] = useState({
    proposed_date: '',
    proposed_venue: '',
    proposed_ticket_price: '',
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
        musician_percentage: 55,
        host_percentage: 45,
        platform_percentage: 5,
        musician_split: 55,
        host_split: 45,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('booking_requests')
        .insert(payload as any)

      if (error) {
        throw error
      }

      setSuccessMessage('Request sent! The host will be in touch.')
      setFormData({
        proposed_date: '',
        proposed_venue: host?.location_address || '',
        proposed_ticket_price: '',
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

          {successMessage && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.35)',
              color: '#86efac'
            }}>
              {successMessage}
            </div>
          )}

          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(127,29,29,0.2)',
              border: '1px solid rgba(248,113,113,0.35)',
              color: '#fecaca'
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
