'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ShowDetails {
  artist_name: string
  show_date: string
  show_time: string
  venue_address: string
}

const getShowDateValue = (show: Record<string, any>) =>
  show.show_date || show.date || show.event_date || show.scheduled_date || ''

const getShowTimeValue = (show: Record<string, any>) =>
  show.show_time || show.time || 'TBD'

const getShowArtistName = (show: Record<string, any>) =>
  show.artist_name || show.show_name || 'HouseShow Artist'

export default function ShowSuccessPage({ params }: { params: { id: string } }) {
  const [show, setShow] = useState<ShowDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadShow = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .or(`id.eq.${params.id},slug.eq.${params.id}`)
          .single()

        if (error || !data) {
          setError(error?.message || 'Could not load show details.')
          return
        }

        setShow({
          artist_name: getShowArtistName(data),
          show_date: getShowDateValue(data),
          show_time: getShowTimeValue(data),
          venue_address: data.venue_address || 'Venue address coming soon'
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load show details.')
      } finally {
        setLoading(false)
      }
    }

    loadShow()
  }, [params.id])

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
            You&apos;re going to the show!
          </h1>
          <p style={{ color: '#8C7B6B', textAlign: 'center', marginBottom: '28px' }}>
            Your ticket purchase is confirmed.
          </p>

          {loading ? (
            <p style={{ color: '#8C7B6B', textAlign: 'center' }}>Loading show details...</p>
          ) : error || !show ? (
            <p style={{ color: '#F5B5B5', textAlign: 'center' }}>{error || 'Could not load show details.'}</p>
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
              <div style={{ color: '#F5F0E8', marginBottom: '8px' }}>
                {formatDate(show.show_date)}
              </div>
              <div style={{ color: '#F5F0E8', marginBottom: '8px' }}>
                {show.show_time}
              </div>
              <div style={{ color: '#F5F0E8' }}>
                {show.venue_address}
              </div>
            </div>
          )}

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
