'use client'

import { useState, useEffect } from 'react'

// Mock data for musicians (fallback)
const mockMusicians = [
  {
    id: 1,
    stageName: "The Midnight Souls",
    genre: "Indie Rock",
    rate: 500,
    city: "Nashville, TN",
    image: "🎸"
  },
  {
    id: 2,
    stageName: "Jazz Quartet",
    genre: "Jazz",
    rate: 750,
    city: "New Orleans, LA",
    image: "🎺"
  },
  {
    id: 3,
    stageName: "Acoustic Dreams",
    genre: "Folk",
    rate: 300,
    city: "Austin, TX",
    image: "🎻"
  },
  {
    id: 4,
    stageName: "Electronic Pulse",
    genre: "Electronic",
    rate: 600,
    city: "Los Angeles, CA",
    image: "🎹"
  },
  {
    id: 5,
    stageName: "Blues Brothers",
    genre: "Blues",
    rate: 400,
    city: "Chicago, IL",
    image: "🎵"
  }
]

// Mock data for venues (fallback)
const mockVenues = [
  {
    id: 1,
    name: "The Blue Note",
    capacity: 150,
    city: "Nashville, TN",
    type: "Indoor",
    image: "🏛️"
  },
  {
    id: 2,
    name: "Riverside Amphitheater",
    capacity: 2000,
    city: "New Orleans, LA",
    type: "Outdoor",
    image: "🎪"
  },
  {
    id: 3,
    name: "The Underground",
    capacity: 80,
    city: "Austin, TX",
    type: "Indoor",
    image: "🎭"
  },
  {
    id: 4,
    name: "Sunset Plaza",
    capacity: 500,
    city: "Los Angeles, CA",
    type: "Outdoor",
    image: "🌅"
  },
  {
    id: 5,
    name: "Jazz Club",
    capacity: 120,
    city: "Chicago, IL",
    type: "Indoor",
    image: "🎷"
  }
]

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
  const [activeTab, setActiveTab] = useState<'musicians' | 'venues'>('musicians')
  const [searchTerm, setSearchTerm] = useState('')
  const [musicians, setMusicians] = useState(mockMusicians)
  const [venues, setVenues] = useState(mockVenues)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from Supabase on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch artist profiles
        const musiciansResponse = await fetch('/api/artists')
        if (musiciansResponse.ok) {
          const artistsData = await musiciansResponse.json()
          if (artistsData.length > 0) {
            const formattedArtists = artistsData.map((artist: any) => ({
              id: artist.id,
              stageName: artist.stage_name || artist.name || 'Unknown Artist',
              genre: artist.genre || 'Other',
              rate: artist.rate_per_show || artist.rate || 0,
              city: artist.city || 'Unknown Location',
              image: getGenreEmoji(artist.genre || 'other')
            }))
            setMusicians(formattedArtists)
          }
        }

        // Fetch venues
        const venuesResponse = await fetch('/api/venues')
        if (venuesResponse.ok) {
          const venuesData = await venuesResponse.json()
          if (venuesData.length > 0) {
            const formattedVenues = venuesData.map((venue: any) => ({
              id: venue.id,
              name: venue.name || 'Unknown Venue',
              capacity: venue.capacity || 0,
              city: venue.city || 'Unknown Location',
              type: venue.venue_type || venue.type || 'Indoor',
              image: getVenueEmoji(venue.venue_type || venue.type || 'indoor')
            }))
            setVenues(formattedVenues)
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data. Showing sample data.')
        // Keep mock data as fallback
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredMusicians = musicians.filter(musician =>
    musician.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    musician.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    musician.stageName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredVenues = venues.filter(venue =>
    venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleBookMusician = (musicianId: number) => {
    console.log('Request to book musician:', musicianId)
    // Navigate to booking form or open modal
  }

  const handleRequestVenue = (venueId: number) => {
    console.log('Request venue:', venueId)
    // Navigate to venue request form or open modal
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
            <a href="/" style={{
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '48px'
        }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(212,130,10,0.05)',
            borderRadius: '12px',
            padding: '4px'
          }}>
            <button
              onClick={() => setActiveTab('musicians')}
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: activeTab === 'musicians' ? '#D4820A' : 'transparent',
                color: activeTab === 'musicians' ? '#1A1410' : '#F5F0E8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Find Musicians
            </button>
            <button
              onClick={() => setActiveTab('venues')}
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: activeTab === 'venues' ? '#D4820A' : 'transparent',
                color: activeTab === 'venues' ? '#1A1410' : '#F5F0E8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Find Venues
            </button>
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
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '32px',
            textAlign: 'center',
            color: '#FCA5A5'
          }}>
            {error}
          </div>
        )}

        {/* Content Grid */}
        {!loading && (
          <>
            {activeTab === 'musicians' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '32px'
              }}>
                {filteredMusicians.map(musician => (
              <div key={musician.id} style={{
                backgroundColor: '#2A1F1A',
                borderRadius: '16px',
                padding: '32px',
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
                  fontSize: '48px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {musician.image}
                </div>
                
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
                  <span>${musician.rate}/show</span>
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
            ))}
              </div>
            )}

            {activeTab === 'venues' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '32px'
              }}>
                {filteredVenues.map(venue => (
              <div key={venue.id} style={{
                backgroundColor: '#2A1F1A',
                borderRadius: '16px',
                padding: '32px',
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
                  fontSize: '48px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {venue.image}
                </div>
                
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#F5F0E8',
                  fontFamily: 'Playfair Display, serif',
                  textAlign: 'center'
                }}>
                  {venue.name}
                </h3>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  fontSize: '14px',
                  color: '#8C7B6B'
                }}>
                  <span>📍 {venue.city}</span>
                  <span>{venue.type}</span>
                </div>
                
                <div style={{
                  textAlign: 'center',
                  marginBottom: '20px',
                  fontSize: '16px',
                  color: '#F0A500',
                  fontWeight: '500'
                }}>
                  Capacity: {venue.capacity} guests
                </div>
                
                <button
                  onClick={() => handleRequestVenue(venue.id)}
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
                  Request This Space
                </button>
              </div>
            ))}
              </div>
            )}

            {/* No Results */}
            {((activeTab === 'musicians' && filteredMusicians.length === 0) ||
              (activeTab === 'venues' && filteredVenues.length === 0)) && (
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
                  Try adjusting your search terms or browse all {activeTab === 'musicians' ? 'musicians' : 'venues'}.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
