'use client'

import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

interface TicketRow {
  id: string
  show_id: string
  created_at: string
  checked_in: boolean
  status?: string | null
}

interface ShowRow {
  id: string
  artist_name?: string | null
  show_date?: string | null
  show_time?: string | null
  venue_name?: string | null
}

export default function TicketsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [showsById, setShowsById] = useState<Record<string, ShowRow>>({})
  const [refundLoading, setRefundLoading] = useState<Record<string, boolean>>({})
  const [refundMessages, setRefundMessages] = useState<Record<string, { success: boolean; message: string }>>({})

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/auth/login'
          return
        }

        const { data: ticketRows, error: ticketError } = await supabase
          .from('tickets')
          .select('id, show_id, created_at, checked_in, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (ticketError) {
          setError(ticketError.message || 'Failed to load tickets.')
          return
        }

        const resolvedTickets = ticketRows || []
        setTickets(resolvedTickets)

        const uniqueShowIds = Array.from(new Set(resolvedTickets.map((ticket) => ticket.show_id))).filter(Boolean)
        if (!uniqueShowIds.length) {
          setShowsById({})
          return
        }

        const { data: showRows, error: showError } = await supabase
          .from('shows')
          .select('id, artist_name, venue_name, show_date, show_time')
          .in('id', uniqueShowIds)

        if (showError) {
          setError(showError.message || 'Failed to load show details.')
          return
        }

        const mapping: Record<string, ShowRow> = {}
        ;(showRows || []).forEach((show) => {
          mapping[show.id] = show
        })
        setShowsById(mapping)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tickets.')
      } finally {
        setLoading(false)
      }
    }

    loadTickets()
  }, [])

  const handleRefundRequest = async (ticketId: string) => {
    setRefundLoading(prev => ({ ...prev, [ticketId]: true }))
    setRefundMessages(prev => { const next = { ...prev }; delete next[ticketId]; return next })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setRefundMessages(prev => ({ ...prev, [ticketId]: { success: false, message: 'Please log in to request a refund' } }))
        return
      }

      const response = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ticket_id: ticketId })
      })

      const result = await response.json()
      setRefundMessages(prev => ({ ...prev, [ticketId]: { success: result.success, message: result.message } }))

      if (result.success) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'refunded' } : t))
      }
    } catch (err) {
      setRefundMessages(prev => ({ ...prev, [ticketId]: { success: false, message: 'Failed to request refund' } }))
    } finally {
      setRefundLoading(prev => ({ ...prev, [ticketId]: false }))
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return 'Date TBD'
    return new Date(value).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const ticketCards = useMemo(() => {
    return tickets.map((ticket) => {
      const show = showsById[ticket.show_id]
      const artistName = show?.artist_name || 'HouseShow Event'
      const dateValue = show?.show_date || null
      const address = show?.venue_name || 'Venue TBD'
      const showDateRaw = show?.show_date || null
      const isFuture = showDateRaw ? new Date(showDateRaw) > new Date() : false
      return {
        ...ticket,
        artistName,
        dateLabel: formatDate(dateValue),
        address,
        showDateRaw,
        isFuture,
      }
    })
  }, [tickets, showsById])

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '48px 24px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '44px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>
            HouseShow
          </a>
          <a href="/bookings" style={{ color: '#8C7B6B', textDecoration: 'none' }}>
            Back to Bookings
          </a>
        </nav>

        <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '16px', padding: '32px', background: 'rgba(44,34,24,0.35)' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.4rem', marginBottom: '10px' }}>
            My Tickets
          </h1>
          <p style={{ color: '#8C7B6B', marginBottom: '28px' }}>
            Present each QR code at check-in.
          </p>

          {loading ? (
            <p style={{ color: '#8C7B6B' }}>Loading tickets...</p>
          ) : error ? (
            <p style={{ color: '#F5B5B5' }}>{error}</p>
          ) : ticketCards.length === 0 ? (
            <p style={{ color: '#8C7B6B' }}>No tickets yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {ticketCards.map((ticket) => (
                <article
                  key={ticket.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 180px',
                    gap: '20px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    background: 'rgba(26,20,16,0.55)',
                    padding: '18px',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ color: '#F0A500', fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>
                      {ticket.artistName}
                    </div>
                    <div style={{ color: '#F5F0E8', marginBottom: '6px' }}>{ticket.dateLabel}</div>
                    <div style={{ color: '#F5F0E8', marginBottom: '10px' }}>{ticket.address}</div>
                    <div style={{ color: ticket.checked_in ? '#8FD694' : '#8C7B6B', fontSize: '0.9rem' }}>
                      {ticket.status === 'refunded' ? (
                        <span style={{ color: '#F0A500' }}>Refunded</span>
                      ) : ticket.checked_in ? 'Checked in' : 'Not checked in'}
                    </div>
                    {ticket.status !== 'refunded' && ticket.isFuture && !ticket.checked_in && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          onClick={() => handleRefundRequest(ticket.id)}
                          disabled={refundLoading[ticket.id]}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(180,70,70,0.4)',
                            color: '#F5B5B5',
                            borderRadius: '6px',
                            padding: '8px 14px',
                            fontSize: '0.85rem',
                            cursor: refundLoading[ticket.id] ? 'not-allowed' : 'pointer',
                            opacity: refundLoading[ticket.id] ? 0.6 : 1
                          }}
                        >
                          {refundLoading[ticket.id] ? 'Processing...' : 'Request Refund'}
                        </button>
                        {refundMessages[ticket.id] && (
                          <div style={{
                            marginTop: '8px',
                            fontSize: '0.85rem',
                            color: refundMessages[ticket.id].success ? '#8FD694' : '#F5B5B5'
                          }}>
                            {refundMessages[ticket.id].message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ justifySelf: 'center', textAlign: 'center' }}>
                    <div style={{ background: '#F5F0E8', padding: '10px', borderRadius: '10px', display: 'inline-flex' }}>
                      <QRCodeSVG value={ticket.id} size={150} />
                    </div>
                    <div style={{ marginTop: '8px', color: '#8C7B6B', fontSize: '0.72rem', fontFamily: "'Space Mono', monospace" }}>
                      {ticket.id.slice(0, 8)}...
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
