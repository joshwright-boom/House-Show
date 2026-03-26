'use client'

import { useEffect, useState } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

interface ShowDetails {
  artist_name: string
  show_date: string
  show_time: string
  venue_address: string
}

const getShowArtistName = (show: Record<string, any>) =>
  show.artist_name || show.show_name || 'HouseShow Artist'

const getShowDateValue = (show: Record<string, any>) =>
  show.show_date || show.date || ''

const getShowTimeValue = (show: Record<string, any>) =>
  show.show_time || show.time || 'TBD'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const showId = searchParams.get('showId')
  const sessionId = searchParams.get('session_id')

  const [show, setShow] = useState<ShowDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticketEmail, setTicketEmail] = useState<string | null>(null)
  const ticketUrl = sessionId
    ? `https://houseshow.net/ticket/${sessionId}`
    : 'https://houseshow.net/ticket/pending'

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
          artist_name: getShowArtistName(data),
          show_date: getShowDateValue(data),
          show_time: getShowTimeValue(data),
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
    const loadCheckoutEmail = async () => {
      if (!sessionId) return
      try {
        const response = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`)
        if (!response.ok) return
        const data = await response.json()
        setTicketEmail(data.email || null)
      } catch (err) {
        console.error('Unable to load checkout email:', err)
      }
    }

    loadCheckoutEmail()
  }, [sessionId])

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
              <div style={{ color: '#F0A500', fontWeight: 700, marginBottom: '10px', fontSize: '1.1rem' }}>{show.artist_name}</div>
              <div style={{ marginBottom: '8px' }}>{formatDate(show.show_date)}</div>
              <div style={{ marginBottom: '8px' }}>{show.show_time}</div>
              <div>{show.venue_address}</div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFFFFF',
              padding: '16px',
              borderRadius: '14px',
              marginBottom: '10px'
            }}>
              <QRCodeSVG value={ticketUrl} size={220} />
            </div>
            <div style={{ color: '#8C7B6B', fontSize: '0.95rem' }}>
              Show this at the door
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '22px' }}>
            <a
              href={sessionId ? `/api/wallet?session_id=${encodeURIComponent(sessionId)}&provider=apple` : '#'}
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#000000',
                color: '#FFFFFF',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                border: '1px solid #2A2A2A'
              }}
            >
              Add to Apple Wallet
            </a>
            <a
              href={sessionId ? `/api/wallet?session_id=${encodeURIComponent(sessionId)}&provider=google` : '#'}
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#1F1F1F',
                color: '#F5F0E8',
                textDecoration: 'none',
                padding: '12px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                border: '1px solid rgba(212,130,10,0.35)'
              }}
            >
              Add to Google Wallet
            </a>
          </div>

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
