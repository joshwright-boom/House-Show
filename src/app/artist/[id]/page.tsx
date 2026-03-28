'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ArtistProfile {
  id: string
  name?: string | null
  bio?: string | null
  photo_url?: string | null
  spotify_url?: string | null
  youtube_url?: string | null
  soundcloud_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  website_url?: string | null
}

interface ArtistShow {
  id: string
  artist_name?: string | null
  venue_name?: string | null
  show_date?: string | null
  ticket_price?: number | null
  status?: string | null
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Date TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function ArtistProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<ArtistProfile | null>(null)
  const [shows, setShows] = useState<ArtistShow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isFanUser, setIsFanUser] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    const loadArtist = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, bio, photo_url, spotify_url, youtube_url, soundcloud_url, instagram_url, facebook_url, website_url')
          .eq('id', params.id)
          .eq('user_type', 'musician')
          .maybeSingle()

        if (profileError) {
          console.error('Artist profile error:', profileError)
        }
        setProfile(profileData as ArtistProfile | null)

        const { data: showsData, error: showsError } = await supabase
          .from('shows')
          .select('id, artist_name, venue_name, show_date, ticket_price, status')
          .eq('artist_user_id', params.id)
          .eq('status', 'on_sale')
          .order('show_date', { ascending: true })

        if (showsError) {
          console.error('Artist shows error:', showsError)
          setShows([])
        } else {
          setShows((showsData || []) as ArtistShow[])
        }
      } finally {
        setLoading(false)
      }
    }

    loadArtist()
  }, [params.id])

  useEffect(() => {
    const loadViewerFollowState = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      const isFan = userProfile?.user_type === 'fan'
      setIsFanUser(isFan)
      if (!isFan) return

      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('fan_id', user.id)
        .eq('musician_id', params.id)
        .maybeSingle()
      setIsFollowing(Boolean(existingFollow))
    }

    loadViewerFollowState()
  }, [params.id])

  const followArtist = async () => {
    if (!currentUserId || !isFanUser || followLoading) return
    try {
      setFollowLoading(true)
      const { error } = await supabase
        .from('follows')
        .upsert(
          { fan_id: currentUserId, musician_id: params.id },
          { onConflict: 'fan_id,musician_id' }
        )
      if (error) {
        console.error('Follow artist error:', error)
        return
      }
      setIsFollowing(true)
    } finally {
      setFollowLoading(false)
    }
  }

  const links = [
    { name: 'Spotify', icon: '🎵', url: profile?.spotify_url },
    { name: 'YouTube', icon: '🎬', url: profile?.youtube_url },
    { name: 'SoundCloud', icon: '🎧', url: profile?.soundcloud_url },
    { name: 'Instagram', icon: '📷', url: profile?.instagram_url },
    { name: 'Facebook', icon: '📘', url: profile?.facebook_url },
    { name: 'Website', icon: '🌐', url: profile?.website_url }
  ].filter((link) => Boolean(link.url))

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading artist profile...
      </main>
    )
  }

  if (!profile) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Artist not found.
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '30px 20px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <a href="/shows" style={{ color: '#D4820A', textDecoration: 'none', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>
          HouseShow
        </a>

        <section style={{ marginTop: '18px', border: '1px solid rgba(212,130,10,0.2)', borderRadius: '14px', padding: '18px', background: 'rgba(44,34,24,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <img
              src={profile.photo_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=260&q=60'}
              alt={profile.name || 'Artist'}
              style={{ width: '84px', height: '84px', borderRadius: '999px', objectFit: 'cover' }}
            />
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '2rem' }}>
                {profile.name || 'Artist'}
              </h1>
              {isFanUser ? (
                <button
                  onClick={followArtist}
                  disabled={isFollowing || followLoading}
                  style={{
                    marginTop: '8px',
                    background: isFollowing ? 'rgba(212,130,10,0.2)' : 'transparent',
                    border: '1px solid rgba(212,130,10,0.35)',
                    color: '#F5F0E8',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontWeight: 600,
                    cursor: isFollowing || followLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isFollowing ? 'Following' : followLoading ? 'Following...' : 'Follow'}
                </button>
              ) : null}
            </div>
          </div>
          {profile.bio ? (
            <p style={{ color: '#8C7B6B', lineHeight: 1.6, marginBottom: links.length > 0 ? '14px' : 0 }}>
              {profile.bio}
            </p>
          ) : null}

          {links.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid rgba(212,130,10,0.25)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#F5F0E8',
                    textDecoration: 'none'
                  }}
                >
                  <span>{link.icon}</span>
                  {link.name}
                </a>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: '20px' }}>
          <h2 style={{ marginBottom: '12px', fontFamily: "'Playfair Display', serif", fontSize: '1.8rem' }}>Upcoming Shows</h2>
          {shows.length === 0 ? (
            <p style={{ color: '#8C7B6B' }}>No upcoming shows listed right now.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {shows.map((show) => (
                <article
                  key={show.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    padding: '14px',
                    background: 'rgba(44,34,24,0.35)'
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display', serif" }}>{show.artist_name || profile.name}</h3>
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>Venue: {show.venue_name || 'Venue TBD'}</p>
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>Date: {formatDate(show.show_date)}</p>
                  <p style={{ margin: '0 0 12px', color: '#F0A500', fontWeight: 700 }}>${Number(show.ticket_price || 0).toFixed(2)}</p>
                  <a
                    href={`/show/${show.id}`}
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                      color: '#1A1410',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      padding: '9px 12px',
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
