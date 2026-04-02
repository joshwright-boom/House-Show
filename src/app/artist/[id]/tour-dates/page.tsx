'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ShowRow {
  id: string
  show_name?: string | null
  artist_name?: string | null
  venue_name?: string | null
  neighborhood?: string | null
  show_date?: string | null
  ticket_price?: number | null
  max_capacity?: number | null
  status?: string | null
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatShowDate(dateStr: string | null | undefined) {
  if (!dateStr) return { month: '???', day: '??', weekday: '', full: 'Date TBD' }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return { month: '???', day: '??', weekday: '', full: 'Date TBD' }
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

export default function ArtistTourDatesPage({ params }: { params: { id: string } }) {
  const [shows, setShows] = useState<ShowRow[]>([])
  const [artistName, setArtistName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const slug = params.id

        // Fetch all artist profiles and match by slug
        const { data: artists, error: artistError } = await supabase
          .from('artist_profiles')
          .select('id, user_id, name')

        if (artistError) {
          console.error('Artist profiles error:', artistError)
          setNotFound(true)
          return
        }

        const matched = (artists || []).find(
          (a: { name?: string | null }) => a.name && slugify(a.name) === slug
        )

        if (!matched) {
          setNotFound(true)
          return
        }

        setArtistName(matched.name)

        // Fetch on-sale shows for this artist by name
        const { data: showData, error: showError } = await supabase
          .from('shows')
          .select('id, show_name, artist_name, venue_name, neighborhood, show_date, ticket_price, max_capacity, status')
          .eq('status', 'on_sale')
          .order('show_date', { ascending: true })

        if (showError) {
          console.error('Shows query error:', showError)
          setShows([])
          return
        }

        // Filter shows matching this artist
        const today = new Date().toISOString().split('T')[0]
        const filtered = (showData || []).filter((s: ShowRow) => {
          const nameMatch = s.artist_name && slugify(s.artist_name) === slug
          const isUpcoming = !s.show_date || s.show_date >= today
          return nameMatch && isUpcoming
        })

        setShows(filtered)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.id])

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0D0A08',
    color: '#F5F0E8',
    fontFamily: "'DM Sans', sans-serif",
  }

  const headerStyle: React.CSSProperties = {
    padding: '48px 24px 0',
    maxWidth: '720px',
    margin: '0 auto',
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ ...headerStyle, paddingTop: '120px', textAlign: 'center' }}>
          <p style={{ color: '#8C7B6B' }}>Loading tour dates...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={containerStyle}>
        <div style={{ ...headerStyle, paddingTop: '120px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', marginBottom: '16px' }}>Artist Not Found</h1>
          <p style={{ color: '#8C7B6B' }}>We couldn&apos;t find an artist matching that URL.</p>
          <a href="/" style={{ color: '#F0A500', textDecoration: 'none', marginTop: '24px', display: 'inline-block' }}>Back to HouseShow</a>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <a href="/" style={{ color: '#F0A500', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', textDecoration: 'none' }}>HouseShow</a>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 96px' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
          Tour Dates
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.4rem, 6vw, 3.6rem)', lineHeight: 1.1, marginBottom: '40px', color: '#F5F0E8' }}>
          {artistName}
        </h1>

        {shows.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ color: '#8C7B6B', fontSize: '1.1rem' }}>No upcoming shows</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {shows.map((show) => {
              const date = formatShowDate(show.show_date)
              const location = show.neighborhood || show.venue_name || 'Location TBD'

              return (
                <a
                  key={show.id}
                  href={`/show/${show.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '24px 0',
                    borderBottom: '1px solid rgba(212,130,10,0.15)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {/* Date block */}
                  <div style={{
                    minWidth: '72px',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#D4820A', letterSpacing: '2px', marginBottom: '2px' }}>
                      {date.month}
                    </div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', lineHeight: 1, color: '#F0A500', fontWeight: 700 }}>
                      {date.day}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '1px', marginTop: '2px' }}>
                      {date.weekday}
                    </div>
                  </div>

                  {/* Show details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', fontWeight: 600, color: '#F5F0E8', marginBottom: '4px' }}>
                      {location}
                    </div>
                    {show.venue_name && show.neighborhood && (
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#8C7B6B' }}>
                        {show.venue_name}
                      </div>
                    )}
                  </div>

                  {/* Tickets CTA */}
                  <div style={{
                    flexShrink: 0,
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid rgba(212,130,10,0.4)',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#F0A500',
                    whiteSpace: 'nowrap',
                  }}>
                    Get Tickets
                  </div>
                </a>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '64px', textAlign: 'center', color: '#8C7B6B', fontSize: '0.8rem' }}>
          <a href="/" style={{ color: '#D4820A', textDecoration: 'none' }}>HouseShow</a> — House concerts, reimagined.
        </div>
      </div>
    </div>
  )
}
