'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MusicianProfile {
  id: string
  name: string
  bio: string
  photo_url?: string
  user_type: 'musician'
  zip_code?: string
  availability_status?: 'based_here' | 'on_tour' | 'open_to_travel'
  tour_dates?: string
  spotify_url?: string
  soundcloud_url?: string
  instagram_url?: string
  facebook_url?: string
  youtube_url?: string
  website_url?: string
}

export default function MusicianProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<MusicianProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, bio, photo_url, user_type, zip_code, availability_status, tour_dates, spotify_url, soundcloud_url, instagram_url, facebook_url, youtube_url, website_url')
          .eq('id', params.id)
          .eq('user_type', 'musician')
          .single()

        if (error) {
          setError(error.message || 'Unable to load musician profile.')
          return
        }

        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load musician profile.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [params.id])

  const socialLinks = [
    { name: 'Spotify', url: profile?.spotify_url, icon: '🎵' },
    { name: 'SoundCloud', url: profile?.soundcloud_url, icon: '🎧' },
    { name: 'Instagram', url: profile?.instagram_url, icon: '📷' },
    { name: 'Facebook', url: profile?.facebook_url, icon: '📘' },
    { name: 'YouTube', url: profile?.youtube_url, icon: '🎬' },
    { name: 'Website', url: profile?.website_url, icon: '🌐' }
  ].filter((link): link is { name: string; url: string; icon: string } => Boolean(link.url))

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F0E8' }}>
        Loading musician profile...
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ textAlign: 'center', color: '#F5F0E8' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', marginBottom: '16px' }}>Musician not found</h1>
          <p style={{ color: '#8C7B6B', marginBottom: '24px' }}>{error || 'This musician profile is unavailable.'}</p>
          <a href="/find-musicians" style={{ color: '#F0A500', textDecoration: 'none' }}>Back to Find Musicians</a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '48px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>HouseShow</a>
          <a href="/find-musicians" style={{ color: '#8C7B6B', textDecoration: 'none' }}>Back to Find Musicians</a>
        </nav>

        <section style={{
          border: '1px solid rgba(212,130,10,0.2)',
          borderRadius: '16px',
          padding: '32px',
          background: 'rgba(44,34,24,0.35)'
        }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name}
                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(240,165,0,0.35)' }}
              />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(240,165,0,0.08)', border: '2px solid rgba(240,165,0,0.2)' }} />
            )}

            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Artist Profile
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', marginBottom: '8px' }}>{profile.name}</h1>
              <div style={{ color: '#8C7B6B', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {profile.availability_status && (
                  <span>
                    {profile.availability_status === 'based_here'
                      ? 'Based Here'
                      : profile.availability_status === 'on_tour'
                        ? 'On Tour'
                        : 'Open to Travel'}
                  </span>
                )}
                {profile.zip_code && <span>📍 {profile.zip_code}</span>}
              </div>
            </div>
          </div>

          {profile.bio && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '12px' }}>About</h2>
              <p style={{ color: '#F5F0E8', lineHeight: '1.7', fontSize: '1rem' }}>{profile.bio}</p>
            </div>
          )}

          {profile.tour_dates && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '12px' }}>Tour Dates</h2>
              <p style={{ color: '#F5F0E8', lineHeight: '1.7', fontSize: '1rem' }}>{profile.tour_dates}</p>
            </div>
          )}

          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '12px' }}>Listen & Connect</h2>
            {socialLinks.length > 0 ? (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'rgba(240,165,0,0.08)',
                      border: '1px solid rgba(240,165,0,0.2)',
                      borderRadius: '8px',
                      color: '#F0A500',
                      textDecoration: 'none'
                    }}
                  >
                    <span>{link.icon}</span>
                    {link.name}
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ color: '#8C7B6B' }}>No social links added yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
