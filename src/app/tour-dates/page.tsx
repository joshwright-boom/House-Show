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

export default function AllTourDatesPage() {
  const [shows, setShows] = useState<ShowRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('id, show_name, artist_name, venue_name, neighborhood, show_date, ticket_price, max_capacity, status')
          .neq('status', 'cancelled')
          .order('show_date', { ascending: true })

        if (error) {
          console.error('Shows query error:', error)
          setShows([])
          return
        }

        const today = new Date().toISOString().split('T')[0]
        const upcoming = (data || []).filter(
          (s: ShowRow) => !s.show_date || s.show_date >= today
        )
        setShows(upcoming)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

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
          <p style={{ color: '#8C7B6B' }}>Loading shows...</p>
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
          All Shows
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.4rem, 6vw, 3.6rem)', lineHeight: 1.1, marginBottom: '40px', color: '#F5F0E8' }}>
          Upcoming Shows
        </h1>

        {shows.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ color: '#8C7B6B', fontSize: '1.1rem' }}>No upcoming shows right now. Check back soon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {shows.map((show) => {
              const date = formatShowDate(show.show_date)
              const location = show.neighborhood || show.venue_name || 'Location TBD'
              const artistSlug = show.artist_name ? slugify(show.artist_name) : null

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
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 600, color: '#F5F0E8', marginBottom: '4px' }}>
                      {show.artist_name || 'Artist TBA'}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>
                      {location}
                      {show.venue_name && show.neighborhood ? ` \u00B7 ${show.venue_name}` : ''}
                    </div>
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
