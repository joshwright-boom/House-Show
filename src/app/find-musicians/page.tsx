'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Musician {
  id: string
  user_id: string
  name: string
  bio: string
  profile_image_url?: string
  latitude: number
  longitude: number
  location?: string
  genre?: string
  spotify_url?: string | null
  soundcloud_url?: string | null
  facebook_url?: string | null
  youtube_url?: string | null
  instagram_url?: string | null
  distanceMiles: number
}

const getArtistInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
const getArtistSocialLinks = (artist: Musician) => {
  const links = []
  if (artist.spotify_url) links.push({ name: 'Spotify', url: artist.spotify_url, icon: '🎵' })
  if (artist.soundcloud_url) links.push({ name: 'SoundCloud', url: artist.soundcloud_url, icon: '🎧' })
  if (artist.instagram_url) links.push({ name: 'Instagram', url: artist.instagram_url, icon: '📷' })
  if (artist.facebook_url) links.push({ name: 'Facebook', url: artist.facebook_url, icon: '📘' })
  if (artist.youtube_url) links.push({ name: 'YouTube', url: artist.youtube_url, icon: '🎬' })
  return links
}

export default function FindMusicians() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [hostLocation, setHostLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyMusicians, setNearbyMusicians] = useState<Musician[]>([])
  const [locationError, setLocationError] = useState<string | null>(null)
  const [artistsLoading, setArtistsLoading] = useState(true)

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Load user and browser location
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser({ id: user.id, email: user.email })
          
          // Get user profile to check user type and location
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('user_type, latitude, longitude, zip_code')
            .eq('id', user.id)
            .single()

          // Check if user is a host
          if (userProfile?.user_type !== 'host') {
            window.location.href = '/dashboard'
            return
          }

          if (!navigator.geolocation) {
            setLocationError('Location access is not available in this browser.')
            setArtistsLoading(false)
            return
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              setHostLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              })
              setLocationError(null)
            },
            () => {
              setLocationError('Enable location access to see artists near you.')
              setArtistsLoading(false)
            }
          )
        } else {
          // Redirect to login if not authenticated
          window.location.href = '/auth/login'
        }
      } catch (error) {
        console.error('Error loading user:', error)
        window.location.href = '/auth/login'
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Load nearby musicians
  useEffect(() => {
    if (!user || !hostLocation) return

    const loadNearbyMusicians = async () => {
      try {
        setArtistsLoading(true)

        const { data: musicians, error: musiciansError } = await supabase
          .from('artist_profiles')
          .select('id, user_id, name, bio, latitude, longitude, location, genre')
          .eq('available', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        if (musiciansError) {
          throw musiciansError
        }

        if (musicians) {
          const userIds = musicians.map((musician) => musician.user_id).filter(Boolean)
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

          const nearby = musicians
            .map((musician) => {
              const linkedProfile = profilesById.get(musician.user_id)
              const distanceMiles = calculateDistance(
              hostLocation.lat, 
              hostLocation.lng, 
              musician.latitude, 
              musician.longitude
              )

              return {
                ...musician,
                user_id: musician.user_id,
                profile_image_url: linkedProfile?.photo_url || undefined,
                spotify_url: linkedProfile?.spotify_url || null,
                soundcloud_url: linkedProfile?.soundcloud_url || null,
                facebook_url: linkedProfile?.facebook_url || null,
                youtube_url: linkedProfile?.youtube_url || null,
                instagram_url: linkedProfile?.instagram_url || null,
                distanceMiles
              }
            })
            .filter((musician) => musician.distanceMiles <= 100)
            .sort((a, b) => a.distanceMiles - b.distanceMiles)

          setNearbyMusicians(nearby)
        }
      } catch (error) {
        console.error('Error loading musicians:', error)
        setLocationError('Unable to load nearby artists right now.')
      } finally {
        setArtistsLoading(false)
      }
    }

    loadNearbyMusicians()
  }, [user, hostLocation])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1A1410',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F5F0E8',
        fontFamily: "'DM Sans', sans-serif"
      }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1A1410',
      color: '#F5F0E8',
      fontFamily: "'DM Sans', sans-serif",
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <a
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#F0A500',
              textDecoration: 'none',
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.4rem',
              fontWeight: '700',
              background: 'transparent'
            }}
          >
            HouseShow
          </a>
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '2.5rem',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Find Musicians
        </h1>

        {/* Musicians List */}
        <div style={{
          background: 'rgba(26,20,16,0.5)',
          border: '1px solid rgba(212,130,10,0.2)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            marginBottom: '24px'
          }}>
            Artists Within 100 Miles
          </h2>

          {artistsLoading ? (
            <div style={{
              textAlign: 'center',
              color: '#8C7B6B',
              padding: '40px'
            }}>
              Finding nearby artists...
            </div>
          ) : locationError ? (
            <div style={{
              textAlign: 'center',
              color: '#8C7B6B',
              padding: '40px'
            }}>
              {locationError}
            </div>
          ) : nearbyMusicians.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#8C7B6B',
              padding: '40px'
            }}>
              No artists found within 100 miles of your location.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '24px'
            }}>
              {nearbyMusicians.map((musician) => (
                <div
                  key={musician.id}
                  style={{
                    background: 'rgba(44,34,24,0.3)',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    gap: '24px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap'
                  }}
                >
                  {musician.profile_image_url?.trim() ? (
                    <img
                      src={musician.profile_image_url}
                      alt={musician.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div
                      aria-label={musician.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(26,20,16,0.95)',
                        border: '1px solid rgba(212,130,10,0.35)',
                        color: '#D4820A',
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '2rem',
                        fontWeight: 700
                      }}
                    >
                      {getArtistInitial(musician.name)}
                    </div>
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1.3rem',
                      marginBottom: '8px',
                      color: '#F5F0E8'
                    }}>
                      {musician.name}
                    </div>
                    <div style={{ color: '#8C7B6B', marginBottom: musician.bio ? '12px' : '10px', fontSize: '0.95rem' }}>
                      {musician.genre ? `Artist • ${musician.genre}` : 'Artist'}
                    </div>
                    
                    {musician.bio && (
                      <p style={{
                      color: '#8C7B6B',
                      marginBottom: '12px',
                      lineHeight: '1.5'
                    }}>
                      {musician.bio}
                    </p>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      fontSize: '0.9rem',
                      color: '#8C7B6B',
                      flexWrap: 'wrap'
                    }}>
                      <div>{musician.genre || 'Genre not listed'}</div>
                      <div>📍 {musician.location?.split(',')[0] || 'Location not listed'}</div>
                      <div>{Math.round(musician.distanceMiles)} miles away</div>
                    </div>
                    {getArtistSocialLinks(musician).length > 0 && (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
                        {getArtistSocialLinks(musician).map((link) => (
                          <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              background: 'rgba(240,165,0,0.1)',
                              border: '1px solid rgba(240,165,0,0.2)',
                              borderRadius: '6px',
                              color: '#F0A500',
                              textDecoration: 'none',
                              fontSize: '0.85rem',
                              fontFamily: 'DM Sans, sans-serif',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                            {link.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href={`/book-show?musician_id=${musician.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 24px',
                        background: '#D4820A',
                        border: '1px solid rgba(212,130,10,0.3)',
                        borderRadius: '8px',
                        color: '#F5F0E8',
                        fontSize: '1rem',
                        fontFamily: "'DM Sans', sans-serif",
                        textDecoration: 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Invite to Show
                    </a>
                    <a
                      href={`/artist/${musician.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 24px',
                        background: 'transparent',
                        border: '1px solid rgba(212,130,10,0.3)',
                        borderRadius: '8px',
                        color: '#F5F0E8',
                        fontSize: '1rem',
                        fontFamily: "'DM Sans', sans-serif",
                        textDecoration: 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
