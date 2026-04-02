'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BrowseArtist {
  id: string
  user_id: string
  name: string
  genre?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  available?: boolean | null
  minimum_guarantee?: number | null
  profile_image_url?: string | null
  spotify_url?: string | null
  soundcloud_url?: string | null
  facebook_url?: string | null
  youtube_url?: string | null
  instagram_url?: string | null
}

const getArtistSocialLinks = (artist: BrowseArtist) => {
  const links = []
  if (artist.spotify_url) links.push({ name: 'Spotify', url: artist.spotify_url, icon: '🎵' })
  if (artist.soundcloud_url) links.push({ name: 'SoundCloud', url: artist.soundcloud_url, icon: '🎧' })
  if (artist.instagram_url) links.push({ name: 'Instagram', url: artist.instagram_url, icon: '📷' })
  if (artist.facebook_url) links.push({ name: 'Facebook', url: artist.facebook_url, icon: '📘' })
  if (artist.youtube_url) links.push({ name: 'YouTube', url: artist.youtube_url, icon: '🎬' })
  return links
}

export default function BrowsePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [artists, setArtists] = useState<BrowseArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('artist_profiles')
          .select('id, user_id, name, genre, location, latitude, longitude, available, minimum_guarantee')

        if (error) {
          throw error
        }

        const userIds = (data || []).map((artist) => artist.user_id).filter(Boolean)
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('id, photo_url, spotify_url, soundcloud_url, facebook_url, youtube_url, instagram_url')
          .in('id', userIds)

        if (profilesError) {
          throw profilesError
        }

        const profilesById = new Map(
          (profileRows || []).map((profile) => [profile.id, profile])
        )

        const mergedArtists = (data || []).map((artist) => ({
          id: artist.id,
          user_id: artist.user_id,
          name: artist.name || 'Artist',
          genre: artist.genre || null,
          location: artist.location || null,
          latitude: artist.latitude ?? null,
          longitude: artist.longitude ?? null,
          available: artist.available ?? null,
          minimum_guarantee: artist.minimum_guarantee ?? null,
          profile_image_url: profilesById.get(artist.user_id)?.photo_url || null,
          instagram_url: profilesById.get(artist.user_id)?.instagram_url || null,
          youtube_url: profilesById.get(artist.user_id)?.youtube_url || null,
          soundcloud_url: profilesById.get(artist.user_id)?.soundcloud_url || null,
          spotify_url: profilesById.get(artist.user_id)?.spotify_url || null,
          facebook_url: profilesById.get(artist.user_id)?.facebook_url || null
        })) as BrowseArtist[]

        setArtists(mergedArtists)
      } catch (err) {
        console.error('Error fetching artists:', err)
        setArtists([])
        setError('Failed to load musicians.')
      } finally {
        setLoading(false)
      }
    }

    fetchArtists()
  }, [])

  const filteredArtists = artists.filter((artist) => {
    const normalizedSearch = searchTerm.toLowerCase()
    const artistName = artist.name.toLowerCase()
    const artistGenre = (artist.genre || 'Independent').toLowerCase()
    const artistLocation = (artist.location || '').toLowerCase()

    return (
      artistLocation.includes(normalizedSearch) ||
      artistGenre.includes(normalizedSearch) ||
      artistName.includes(normalizedSearch)
    )
  })

  const handleBookMusician = (musicianId: string) => {
    window.location.href = `/book-show?musician_id=${musicianId}`
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'DM Sans', sans-serif;
          background-color: #1A1410;
          color: #F5F0E8;
        }
        
        input, button {
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>

      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#1A1410EE',
        borderBottom: '1px solid rgba(212,130,10,0.25)',
        padding: '16px 0',
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#F0A500',
            fontFamily: 'Playfair Display, serif'
          }}>
            <a href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
              HouseShow
            </a>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            fontSize: '14px',
            color: '#8C7B6B'
          }}>
            <a href="/browse" style={{ color: '#F0A500', textDecoration: 'none', fontWeight: '500' }}>
              Browse
            </a>
            <a href="/create-show" style={{ color: '#8C7B6B', textDecoration: 'none' }}>
              Create Show
            </a>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px'
      }}>
        <div style={{
          marginBottom: '48px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#F5F0E8',
            fontFamily: 'Playfair Display, serif'
          }}>
            Discover Talent & Venues
          </h1>
          <p style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: '#8C7B6B',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Connect with amazing musicians and find the perfect venue for your next show.
          </p>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <input
              type="text"
              placeholder="Search by city, genre, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(212,130,10,0.25)',
                backgroundColor: 'rgba(212,130,10,0.05)',
                color: '#F5F0E8',
                fontSize: '16px',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,130,10,0.5)'
                e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,130,10,0.25)'
                e.currentTarget.style.backgroundColor = 'rgba(212,130,10,0.05)'
              }}
            />
          </div>
        </div>

        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            color: '#8C7B6B'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <div>Loading amazing talent and venues...</div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div style={{
            position: 'fixed',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            color: '#FCA5A5',
            width: 'calc(100% - 32px)',
            maxWidth: '520px'
          }}>
            {error}
          </div>
        )}

        {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px'
          }}>
            {filteredArtists.map((artist) => (
              <div
                key={artist.id}
                style={{
                  backgroundColor: '#2A1F1A',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(212,130,10,0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,130,10,0.3)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,130,10,0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  height: '160px',
                  background: '#1A1410',
                  borderBottom: '1px solid rgba(212,130,10,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  color: '#D4820A',
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '3rem',
                  fontWeight: 700
                }}>
                  {artist.profile_image_url?.trim() ? (
                    <img
                      src={artist.profile_image_url}
                      alt={artist.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  ) : (
                    '🎵'
                  )}
                </div>

                <div style={{ padding: '32px' }}>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#F5F0E8',
                    fontFamily: 'Playfair Display, serif',
                    textAlign: 'center'
                  }}>
                    {artist.name}
                  </h3>

                  <div style={{
                    fontSize: '14px',
                    color: '#F0A500',
                    textAlign: 'center',
                    marginBottom: '16px',
                    fontWeight: '500'
                  }}>
                    {artist.genre?.trim() || 'Independent'}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    fontSize: '14px',
                    color: '#8C7B6B'
                  }}>
                    <span>📍 {artist.location || 'Unknown Location'}</span>
                    <span>
                      {artist.minimum_guarantee && artist.minimum_guarantee > 0
                        ? `$${Number(artist.minimum_guarantee).toFixed(0)}/show`
                        : 'Negotiable'}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    marginBottom: '20px',
                    minHeight: '24px'
                  }}>
                    {getArtistSocialLinks(artist).map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '5px 10px',
                          background: 'rgba(240,165,0,0.1)',
                          border: '1px solid rgba(240,165,0,0.2)',
                          borderRadius: '20px',
                          color: '#F0A500',
                          textDecoration: 'none',
                          fontSize: '0.78rem',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 500
                        }}
                      >
                        {link.name}
                      </a>
                    ))}
                  </div>

                  <button
                    onClick={() => handleBookMusician(artist.id)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: '#D4820A',
                      color: '#1A1410',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F0A500'
                      e.currentTarget.style.transform = 'scale(1.02)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#D4820A'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    Request to Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredArtists.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#8C7B6B'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              🔍
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#F5F0E8'
            }}>
              No results found
            </h3>
            <p>
              Try adjusting your search terms or browse all musicians.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
