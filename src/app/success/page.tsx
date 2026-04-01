'use client'

import { useEffect, useState } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

interface ShowDetails {
  show_name: string
  artist_name: string
  show_date: string
  show_time: string
  venue_name: string
  venue_address: string
}

const getShowArtistName = (show: Record<string, any>) =>
  show.artist_name || show.show_name || 'HouseShow Artist'

const getShowNameValue = (show: Record<string, any>) =>
  show.show_name || show.artist_name || 'HouseShow Event'

const getShowDateValue = (show: Record<string, any>) =>
  show.show_date || show.date || ''

const getShowTimeValue = (show: Record<string, any>) =>
  show.show_time || show.time || 'TBD'

const formatTime = (value: string) => {
  if (!value || value === 'TBD') return 'TBD'
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value

  const rawHour = Number(match[1])
  const minutes = match[2]
  const period = rawHour >= 12 ? 'PM' : 'AM'
  const hour12 = rawHour % 12 || 12
  return `${hour12}:${minutes} ${period}`
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const showId = searchParams.get('showId')
  const sessionId = searchParams.get('session_id')

  const [show, setShow] = useState<ShowDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticketEmail, setTicketEmail] = useState<string | null>(null)
  const [ticketQuantity, setTicketQuantity] = useState('1')
  const [emailSent, setEmailSent] = useState(false)
  const [ticketIds, setTicketIds] = useState<string[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)

  useEffect(() => {
    const loadShow = async () => {
      if (!showId) {
        setError('Missing show details.')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .eq('id', showId)
          .single()

        if (error || !data) {
          setError(error?.message || 'Could not load show details.')
          return
        }

        setShow({
          show_name: getShowNameValue(data),
          artist_name: getShowArtistName(data),
          show_date: getShowDateValue(data),
          show_time: getShowTimeValue(data),
          venue_name: data.venue_name || 'Venue',
          venue_address: data.venue_address || 'Venue details coming soon'
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load show details.')
      } finally {
        setLoading(false)
      }
    }

    loadShow()
  }, [showId])

  useEffect(() => {
    if (!showId) {
      setTicketsLoading(false)
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 10

    const pollForTickets = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) {
        setTicketsLoading(false)
        return
      }

      const { data: tickets } = await supabase
        .from('tickets')
        .select('id')
        .eq('show_id', showId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (tickets && tickets.length > 0) {
        setTicketIds(tickets.map((t) => t.id))
        setTicketsLoading(false)
        return
      }

      attempts++
      if (attempts < maxAttempts && !cancelled) {
        setTimeout(pollForTickets, 2000)
      } else {
        setTicketsLoading(false)
      }
    }

    pollForTickets()
    return () => { cancelled = true }
  }, [showId])

  useEffect(() => {
    const loadCheckoutEmail = async () => {
      if (!sessionId) return
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()
        const accessToken = authSession?.access_token
        if (!accessToken) return

        const response = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        })
        if (!response.ok) return
        const data = await response.json()
        setTicketEmail(data.email || null)
        setTicketQuantity(data.quantity || '1')
      } catch (err) {
        console.error('Unable to load checkout email:', err)
      }
    }

    loadCheckoutEmail()
  }, [sessionId])

  useEffect(() => {
    const sendTicketEmail = async () => {
      if (!show || !ticketEmail || !sessionId || emailSent) return

      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()
        const accessToken = authSession?.access_token
        if (!accessToken) return

        const response = await fetch('/api/send-ticket-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: ticketEmail,
            showName: show.show_name,
            showDate: formatDate(show.show_date),
            showTime: formatTime(show.show_time),
            venueName: show.venue_name,
            venueAddress: show.venue_address,
            sessionId,
            quantity: ticketQuantity
          })
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          console.error('Ticket email API error:', data?.error || response.statusText)
          return
        }

        setEmailSent(true)
      } catch (err) {
        console.error('Unable to send ticket email:', err)
      }
    }

    sendTicketEmail()
  }, [show, ticketEmail, sessionId, ticketQuantity, emailSent])

  const formatDate = (value: string) => {
    if (!value) return 'Date TBD'
    return new Date(value).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <nav style={{ marginBottom: '48px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>
            HouseShow
          </a>
        </nav>

        <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '16px', padding: '36px', background: 'rgba(44,34,24,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410',
              fontSize: '2.2rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ✓
            </div>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.4rem', textAlign: 'center', marginBottom: '10px' }}>
            You&apos;re going to the show!
          </h1>

          {loading ? (
            <p style={{ color: '#8C7B6B', textAlign: 'center', marginBottom: '24px' }}>Loading show details...</p>
          ) : error || !show ? (
            <p style={{ color: '#F5B5B5', textAlign: 'center', marginBottom: '24px' }}>{error || 'Could not load show details.'}</p>
          ) : (
            <div style={{
              background: 'rgba(26,20,16,0.5)',
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ color: '#F0A500', fontWeight: 700, marginBottom: '10px', fontSize: '1.1rem' }}>{show.show_name}</div>
              <div style={{ marginBottom: '8px', color: '#8C7B6B' }}>Artist: {show.artist_name}</div>
              <div style={{ marginBottom: '8px' }}>{formatDate(show.show_date)}</div>
              <div style={{ marginBottom: '8px' }}>{formatTime(show.show_time)}</div>
              <div style={{ marginBottom: '8px' }}>{show.venue_name}</div>
              <div>{show.venue_address}</div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {ticketsLoading ? (
              <p style={{ color: '#8C7B6B' }}>Generating your ticket...</p>
            ) : ticketIds.length > 0 ? (
              ticketIds.map((ticketId) => (
                <div key={ticketId} style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFFFFF',
                    padding: '16px',
                    borderRadius: '14px',
                    marginBottom: '10px'
                  }}>
                    <QRCodeSVG value={ticketId} size={220} />
                  </div>
                  <div style={{ color: '#8C7B6B', fontSize: '0.72rem', fontFamily: "'Space Mono', monospace" }}>
                    {ticketId.slice(0, 8)}...
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#8C7B6B' }}>Your ticket is being processed. Visit <a href="/tickets" style={{ color: '#F0A500' }}>My Tickets</a> to view it shortly.</p>
            )}
            <div style={{ color: '#8C7B6B', fontSize: '0.95rem', marginTop: '8px' }}>
              Show this at the door
            </div>
          </div>

          <p style={{ color: '#8C7B6B', textAlign: 'center', marginBottom: '22px' }}>
            📱 Save this page or visit <a href="/tickets" style={{ color: '#F0A500' }}>My Tickets</a> to access your QR code anytime
          </p>

          <p style={{ color: '#8C7B6B', textAlign: 'center', marginBottom: '24px' }}>
            Your ticket will be sent to {ticketEmail || 'your email'}.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a
              href="/bookings"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                textDecoration: 'none',
                padding: '12px 22px',
                borderRadius: '8px',
                fontWeight: 700
              }}
            >
              Back to Bookings
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </main>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
