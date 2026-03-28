'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Helper function to get emoji for genre
const getGenreEmoji = (genre: string) => {
  const genreEmojis: { [key: string]: string } = {
    'rock': '🎸',
    'indie rock': '🎸',
    'jazz': '🎺',
    'folk': '🎻',
    'electronic': '🎹',
    'blues': '🎵',
    'pop': '🎤',
    'classical': '🎻',
    'hip hop': '🎧',
    'country': '🤠',
    'r&b': '🎵',
    'metal': '🤘'
  }
  return genreEmojis[genre.toLowerCase()] || '🎵'
}

// Helper function to get emoji for venue type
const getVenueEmoji = (type: string) => {
  const venueEmojis: { [key: string]: string } = {
    'indoor': '🏛️',
    'outdoor': '🎪',
    'theater': '🎭',
    'club': '🎷',
    'stadium': '🏟️',
    'hall': '🎼',
    'bar': '🍺',
    'restaurant': '🍽️'
  }
  return venueEmojis[type.toLowerCase()] || '🏛️'
}

export default function BrowsePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [musicians, setMusicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from Supabase on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch musicians from Supabase
        const { data: musiciansData, error: musiciansError } = await supabase
          .from('artist_profiles')
          .select('id, user_id, name, bio, genre, location, minimum_guarantee')

        if (musiciansError) {
          console.error('Error fetching musicians:', musiciansError)
        } else if (musiciansData) {
          const userIds = musiciansData.map((musician: any) => musician.user_id).filter(Boolean)
          const { data: profileRows, error: profilesError } = await supabase
            .from('profiles')
            .select('id, profile_image_url, instagram_url, spotify_url, youtube_url, soundcloud_url, facebook_url')
            .in('id', userIds)

          if (profilesError) {
            console.error('Error fetching musician profile images:', profilesError)
          }

          const profilesById = new Map(
            (profileRows || []).map((profile: any) => [profile.id, profile])
          )

          const formattedMusicians = musiciansData.map((musician: any) => ({
            id: musician.id,
            stageName: musician.name || 'Unknown Artist',
            genre: musician.genre?.trim() || 'Independent',
            rate: musician.minimum_guarantee && musician.minimum_guarantee > 0
              ? `$${Number(musician.minimum_guarantee).toFixed(0)}/show`
              : 'Negotiable',
            city: musician.location || 'Unknown Location',
            image: getGenreEmoji(musician.genre?.trim() || 'Independent'),
            bio: musician.bio,
            photo_url: profilesById.get(musician.user_id)?.profile_image_url || null,
            instagram_url: profilesById.get(musician.user_id)?.instagram_url || null,
            spotify_url: profilesById.get(musician.user_id)?.spotify_url || null,
            youtube_url: profilesById.get(musician.user_id)?.youtube_url || null,
            soundcloud_url: profilesById.get(musician.user_id)?.soundcloud_url || null,
            facebook_url: profilesById.get(musician.user_id)?.facebook_url || null
          }))
          setMusicians(formattedMusicians)
        }

      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load musicians.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredMusicians = musicians.filter(musician =>
    musician.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    musician.stageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (musician.bio && musician.bio.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleBookMusician = (musicianId: string) => {
    console.log('Request to book musician:', musicianId)
    // Navigate to booking form with musician ID
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
        
        .heading {
          font-family: 'Playfair Display', serif;
        }
        
        input, button {
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>

      {/* Sticky Navigation */}
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
            <a href="/dashboard" style={{
              textDecoration: 'none',
              color: 'inherit'
            }}>
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
            <a href="/browse" style={{
              color: '#F0A500',
              textDecoration: 'none',
              fontWeight: '500'
            }}>
              Browse
            </a>
            <a href="/create-show" style={{
              color: '#8C7B6B',
              textDecoration: 'none'
            }}>
              Create Show
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px'
      }}>
        {/* Header */}
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

        {/* Search Bar */}
        <div style={{
          marginBottom: '40px'
        }}>
          <div style={{
            maxWidth: '500px',
            margin: '0 auto'
          }}>
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

        {/* Loading State */}
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

        {/* Error State */}
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

        {/* Content Grid */}
        {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px'
          }}>
            {filteredMusicians.map(musician => (
              <div key={musician.id} style={{
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
              }}>
                <div style={{
                  height: '160px',
                  background: '#1A1410',
                  borderBottom: '1px solid rgba(212,130,10,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  textAlign: 'center',
                  overflow: 'hidden'
                }}>
                  {musician.photo_url ? (
                    <img
                      src={musician.photo_url}
                      alt={musician.stageName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  ) : (
                    musician.image
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
                    {musician.stageName}
                  </h3>
                  
                  <div style={{
                    fontSize: '14px',
                    color: '#F0A500',
                    textAlign: 'center',
                    marginBottom: '16px',
                    fontWeight: '500'
                  }}>
                    {musician.genre}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    fontSize: '14px',
                    color: '#8C7B6B'
                  }}>
                    <span>📍 {musician.city}</span>
                    <span>{musician.rate}</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    marginBottom: '20px',
                    minHeight: '24px'
                  }}>
                    {[
                      { icon: '📷', url: musician.instagram_url, label: 'Instagram' },
                      { icon: '🎵', url: musician.spotify_url, label: 'Spotify' },
                      { icon: '▶️', url: musician.youtube_url, label: 'YouTube' },
                      { icon: '☁️', url: musician.soundcloud_url, label: 'SoundCloud' },
                      { icon: '👤', url: musician.facebook_url, label: 'Facebook' }
                    ]
                      .filter((link) => Boolean(link.url))
                      .map((link) => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={link.label}
                          style={{
                            textDecoration: 'none',
                            fontSize: '18px',
                            lineHeight: 1
                          }}
                        >
                          {link.icon}
                        </a>
                      ))}
                  </div>
                  
                  <button
                    onClick={() => handleBookMusician(musician.id)}
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

        {/* No Results */}
        {filteredMusicians.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#8C7B6B'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
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
