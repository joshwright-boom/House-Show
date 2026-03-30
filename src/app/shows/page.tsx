'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ShowRow {
  id: string
  artist_name?: string | null
  venue_name?: string | null
  venue_address?: string | null
  show_date?: string | null
  ticket_price?: number | null
  status?: string | null
  neighborhood?: string | null
}

const formatPublicArea = (neighborhood?: string | null, venueAddress?: string | null) => {
  if (neighborhood?.trim()) return `${neighborhood.trim()} area`
  if (venueAddress?.trim()) return venueAddress.trim()
  return ''
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Date TBD'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function ShowsPage() {
  const [shows, setShows] = useState<ShowRow[]>([])
  const [loadingShows, setLoadingShows] = useState(true)

  useEffect(() => {
    const loadOnSaleShows = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('id, artist_name, venue_name, venue_address, show_date, ticket_price, status, neighborhood')
          .eq('status', 'on_sale')
          .order('show_date', { ascending: true })

        if (error) {
          console.error('Shows query error:', error)
          setShows([])
          return
        }

        setShows((data || []) as ShowRow[])
      } finally {
        setLoadingShows(false)
      }
    }

    loadOnSaleShows()
  }, [])

  const sortedShows = useMemo(() => shows, [shows])

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '30px 20px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <section style={{ marginBottom: '16px' }}>
          <a href="/" style={{ color: '#D4820A', textDecoration: 'none', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>
            HouseShow
          </a>
          <h1 style={{ marginTop: '14px', marginBottom: '8px', fontFamily: "'Playfair Display', serif", fontSize: '2.5rem' }}>
            Discover Live Shows
          </h1>
          <p style={{ color: '#8C7B6B', margin: 0 }}>
            Explore musicians near you and grab tickets to upcoming house shows.
          </p>
        </section>

        <section>
          <h2 style={{ marginBottom: '14px', fontFamily: "'Playfair Display', serif", fontSize: '2rem' }}>
            Show Bulletin Board
          </h2>
          {loadingShows ? (
            <p style={{ color: '#8C7B6B' }}>Loading shows...</p>
          ) : sortedShows.length === 0 ? (
            <div
              style={{
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '12px',
                padding: '22px',
                color: '#8C7B6B',
                background: 'rgba(44,34,24,0.24)'
              }}
            >
              No upcoming shows yet — check back soon.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {sortedShows.map((show) => (
                <article
                  key={show.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    padding: '16px',
                    background: 'rgba(44,34,24,0.35)'
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display', serif", fontSize: '1.45rem' }}>
                    {show.artist_name || 'Artist TBA'}
                  </h3>
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>
                    Venue: {show.venue_name || 'Venue TBD'}
                  </p>
                  {formatPublicArea(show.neighborhood, show.venue_address || show.venue_name) ? (
                    <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>
                      Area: {formatPublicArea(show.neighborhood, show.venue_address || show.venue_name)}
                    </p>
                  ) : null}
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>
                    Date: {formatDate(show.show_date)}
                  </p>
                  <p style={{ margin: '0 0 12px', color: '#8C7B6B' }}>
                    Ticket Price: ${Number(show.ticket_price || 0).toFixed(2)}
                  </p>
                  <a
                    href={`/show/${show.id}`}
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                      color: '#1A1410',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontWeight: 700
                    }}
                  >
                    Get Tickets
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
