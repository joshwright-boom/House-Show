'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ShowDetails {
  artist_name: string
  venue_name: string
  show_date: string
  show_time: string
}

export default function SuccessClientPage() {
  const searchParams = useSearchParams()
  const showId = useMemo(() => searchParams.get('showId') || '', [searchParams])
  const [show, setShow] = useState<ShowDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadShow = async () => {
      if (!showId) {
        setError('Missing showId in the confirmation link.')
        setLoading(false)
        return
      }

      try {
        const { data, error: showError } = await supabase
          .from('shows')
          .select('artist_name, venue_name, show_date, show_time')
          .eq('id', showId)
          .single()

        if (showError || !data) {
          setError(showError?.message || 'Unable to load show confirmation details.')
          return
        }

        setShow({
          artist_name: data.artist_name || 'HouseShow Artist',
          venue_name: data.venue_name || 'Venue TBD',
          show_date: data.show_date || '',
          show_time: data.show_time || 'TBD'
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load show confirmation details.')
      } finally {
        setLoading(false)
      }
    }

    loadShow()
  }, [showId])

  const formattedDate = useMemo(() => {
    if (!show?.show_date) return 'Date TBD'
    return new Date(show.show_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [show?.show_date])

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>
            HouseShow
          </a>
        </nav>

        <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '16px', padding: '36px', background: 'rgba(44,34,24,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
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
            Payment Confirmed
          </h1>
          <p style={{ color: '#8C7B6B', textAlign: 'center', marginBottom: '28px' }}>
            Your ticket purchase is complete and your spot is saved.
          </p>

          {loading ? (
            <p style={{ color: '#8C7B6B', textAlign: 'center' }}>Loading show details...</p>
          ) : error || !show ? (
            <p style={{ color: '#F5B5B5', textAlign: 'center' }}>{error || 'Unable to load show confirmation details.'}</p>
          ) : (
            <div style={{
              background: 'rgba(26,20,16,0.5)',
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '26px'
            }}>
              <div style={{ marginBottom: '12px', color: '#F0A500', fontWeight: 700, fontSize: '1.1rem' }}>
                {show.artist_name}
              </div>
              <div style={{ color: '#F5F0E8', marginBottom: '8px' }}>{show.venue_name}</div>
              <div style={{ color: '#F5F0E8', marginBottom: '8px' }}>{formattedDate}</div>
              <div style={{ color: '#F5F0E8' }}>{show.show_time}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="/tickets"
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
              View My Tickets
            </a>
            <a
              href="/bookings"
              style={{
                display: 'inline-block',
                border: '1px solid rgba(212,130,10,0.3)',
                color: '#F5F0E8',
                textDecoration: 'none',
                padding: '12px 22px',
                borderRadius: '8px',
                fontWeight: 700
              }}
            >
              Back to Bookings
            </a>
            <a
              href={showId ? `/show/${showId}` : '/bookings'}
              style={{
                display: 'inline-block',
                border: '1px solid rgba(212,130,10,0.3)',
                color: '#F5F0E8',
                textDecoration: 'none',
                padding: '12px 22px',
                borderRadius: '8px',
                fontWeight: 700
              }}
            >
              View Ticket Page
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
