import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function HostProfilePage({ params }: { params: { id: string } }) {
  const { data: host } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .eq('user_type', 'host')
    .single()

  if (!host) return notFound()

  const { data: shows, error: showsError } = await supabase
    .from('shows')
    .select('id, show_name, artist_name, venue_name, show_date, date, ticket_price')
    .eq('host_user_id', params.id)
    .in('status', ['open', 'on_sale'])
    .order('show_date', { ascending: true })

  if (showsError) {
    console.error('Host shows error:', showsError)
  }

  const venueDetails =
    host.venue_details ||
    host.venue_description ||
    host.location_address ||
    host.venue_address ||
    host.address ||
    host.location ||
    null

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8' }}>
      <section
        style={{
          width: '100%',
          padding: '28px 20px 34px',
          background: 'linear-gradient(180deg, rgba(44,34,24,0.92) 0%, rgba(26,20,16,0.98) 100%)',
          borderBottom: '1px solid rgba(212,130,10,0.18)'
        }}
      >
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <Link href="/fan" style={{ color: '#D4820A', textDecoration: 'none', fontSize: '0.92rem' }}>
            ← Back to Map
          </Link>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginTop: '22px' }}>
            <img
              src={host.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=260&q=60'}
              alt={host.name || 'Host'}
              style={{
                width: '112px',
                height: '112px',
                borderRadius: '999px',
                objectFit: 'cover',
                border: '1px solid rgba(212,130,10,0.35)'
              }}
            />
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.68rem',
                  color: '#D4820A',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}
              >
                Hosted by
              </div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
                  lineHeight: 1.05
                }}
              >
                {host.name || 'Host'}
              </h1>
              <div style={{ width: '88px', height: '1px', background: '#D4820A', margin: '16px 0 18px' }} />
              <p style={{ color: '#D9D2C7', lineHeight: 1.7, maxWidth: '720px', margin: 0 }}>
                {host.bio || 'This host has not added a bio yet.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '28px 20px 48px' }}>
        <section
          style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '14px',
            padding: '22px',
            background: 'rgba(44,34,24,0.35)',
            marginBottom: '20px'
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontFamily: "'Playfair Display', serif", fontSize: '1.7rem' }}>
            Venue Details
          </h2>
          <p style={{ margin: 0, color: venueDetails ? '#D9D2C7' : '#8C7B6B', lineHeight: 1.7 }}>
            {venueDetails || "This host hasn't added venue details yet"}
          </p>
        </section>

        <section
          style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '14px',
            padding: '22px',
            background: 'rgba(44,34,24,0.35)',
            marginBottom: '24px'
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontFamily: "'Playfair Display', serif", fontSize: '1.7rem' }}>
            Upcoming Shows at this Venue
          </h2>
          {!shows || shows.length === 0 ? (
            <p style={{ margin: 0, color: '#8C7B6B' }}>No upcoming shows listed right now.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {shows.map((show) => (
                <article
                  key={show.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.16)',
                    borderRadius: '12px',
                    padding: '16px',
                    background: 'rgba(26,20,16,0.5)'
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem' }}>
                    {show.show_name || show.artist_name || 'HouseShow Event'}
                  </h3>
                  {show.artist_name ? (
                    <p style={{ margin: '0 0 6px', color: '#D9D2C7' }}>{show.artist_name}</p>
                  ) : null}
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>
                    {show.venue_name || host.location_address || host.venue_address || 'Venue TBD'}
                  </p>
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>
                    {show.show_date || show.date
                      ? new Date(show.show_date || show.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Date TBD'}
                  </p>
                  <p style={{ margin: 0, color: '#F0A500', fontWeight: 700 }}>
                    ${Number(show.ticket_price || 0).toFixed(2)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link
            href={`/book-show?host_id=${params.id}`}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '360px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410',
              textDecoration: 'none',
              borderRadius: '10px',
              padding: '14px 18px',
              fontWeight: 700,
              fontSize: '0.98rem'
            }}
          >
            Request to Book
          </Link>
        </div>
      </div>
    </main>
  )
}
