import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface HostProfile {
  id: string
  name?: string | null
  bio?: string | null
  photo_url?: string | null
  user_type: 'host'
  venue_address?: string | null
  address?: string | null
  location?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const getLocationLabel = (profile: HostProfile) => {
  if (profile.venue_address) return profile.venue_address
  if (profile.address) return profile.address
  if (profile.location) return profile.location

  const parts = [profile.city, profile.state, profile.zip_code]
    .map((part) => part?.trim())
    .filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : null
}

export default async function HostProfilePage({ params }: { params: { id: string } }) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, bio, photo_url, user_type, venue_address, address, location, city, state, zip_code')
    .eq('id', params.id)
    .eq('user_type', 'host')
    .maybeSingle()

  if (error) {
    console.error('Host profile error:', error)
  }

  if (!profile) {
    notFound()
  }

  const locationLabel = getLocationLabel(profile as HostProfile)

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '30px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link
          href="/shows"
          style={{ color: '#D4820A', textDecoration: 'none', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}
        >
          HouseShow
        </Link>

        <section
          style={{
            marginTop: '18px',
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '14px',
            padding: '22px',
            background: 'rgba(44,34,24,0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <img
              src={profile.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=260&q=60'}
              alt={profile.name || 'Host'}
              style={{ width: '96px', height: '96px', borderRadius: '999px', objectFit: 'cover', border: '1px solid rgba(212,130,10,0.3)' }}
            />
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', lineHeight: 1.1 }}>
                {profile.name || 'Host'}
              </h1>
              {locationLabel ? (
                <p style={{ margin: '10px 0 0', color: '#8C7B6B', fontSize: '0.98rem' }}>
                  {locationLabel}
                </p>
              ) : null}
            </div>
          </div>

          {profile.bio ? (
            <p style={{ color: '#D9D2C7', lineHeight: 1.7, margin: '0 0 20px' }}>
              {profile.bio}
            </p>
          ) : (
            <p style={{ color: '#8C7B6B', lineHeight: 1.7, margin: '0 0 20px' }}>
              This host has not added a bio yet.
            </p>
          )}

          <Link
            href={`/book-show?host_id=${profile.id}`}
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410',
              textDecoration: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontWeight: 700,
              fontSize: '0.95rem'
            }}
          >
            Request to Book
          </Link>
        </section>
      </div>
    </main>
  )
}
