'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Musician {
  id: string
  name: string
  bio: string
  photo_url?: string
  user_type: 'musician'
  zip_code?: string
  latitude?: number
  longitude?: number
  location_address?: string
  availability_status?: 'based_here' | 'on_tour' | 'open_to_travel'
  tour_dates?: string
  genre?: string
}

interface BookingRequest {
  id: string
  host_id: string
  musician_id: string
  proposed_date: string
  venue_address: string
  ticket_price: number
  host_split: number
  musician_split: number
  message: string
  status: 'pending' | 'accepted' | 'declined' | 'countered'
  created_at: string
}

export default function FindMusicians() {
  const PLATFORM_SPLIT = 5
  const AVAILABLE_SPLIT = 100 - PLATFORM_SPLIT
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [hostLocation, setHostLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyMusicians, setNearbyMusicians] = useState<Musician[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState(false)
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    proposed_date: '',
    venue_address: '',
    ticket_price: '',
    host_split: '55',
    musician_split: '40',
    message: ''
  })
  
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Load user and host location
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

          if (userProfile?.latitude && userProfile?.longitude) {
            setHostLocation({ lat: userProfile.latitude, lng: userProfile.longitude })
                } else {
            setMapError(true)
          }
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
        setMapLoading(true)
        
        // First, check for musicians with null coordinates but have zip codes
        const { data: musiciansWithoutCoords } = await supabase
          .from('profiles')
          .select('id, zip_code')
          .eq('user_type', 'musician')
          .is('latitude', null)
          .is('longitude', null)
          .not('zip_code', 'is', null)

        // Update musicians with missing coordinates
        if (musiciansWithoutCoords && musiciansWithoutCoords.length > 0) {
          console.log(`Updating coordinates for ${musiciansWithoutCoords.length} musicians`)
          
          for (const musician of musiciansWithoutCoords) {
            if (musician.zip_code) {
              try {
                // Fetch coordinates from zippopotam.us API
                const response = await fetch(`https://api.zippopotam.us/us/${musician.zip_code}`)
                if (response.ok) {
                  const data = await response.json()
                  if (data && data.places && data.places.length > 0) {
                    const place = data.places[0]
                    const latitude = parseFloat(place.latitude)
                    const longitude = parseFloat(place.longitude)
                    
                    // Update musician's coordinates in database
                    await supabase
                      .from('profiles')
                      .update({ latitude, longitude })
                      .eq('id', musician.id)
                    
                    console.log(`Updated coordinates for musician ${musician.id}`)
                  }
                }
              } catch (error) {
                console.error(`Error fetching coordinates for musician ${musician.id}:`, error)
              }
            }
          }
        }
        
        // Load nearby musicians (within 500 miles) from all geocoded musician profiles
        const { data: musicians, error: musiciansError } = await supabase
          .from('profiles')
          .select('id, name, bio, photo_url, user_type, latitude, longitude, location_address, availability_status, tour_dates, zip_code')
          .eq('user_type', 'musician')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        console.log('Musicians query result:', { error: musiciansError, count: musicians?.length, data: musicians })

        if (musicians) {
          // Filter musicians within ~500 miles
          const nearby = musicians.filter(musician => {
            if (!musician.latitude || !musician.longitude) return false
            
            const distance = calculateDistance(
              hostLocation.lat, 
              hostLocation.lng, 
              musician.latitude, 
              musician.longitude
            )
            console.log(`Musician ${musician.name} is ${distance.toFixed(2)}km away`)
            return distance <= 500 * 1.60934 // Convert miles to km (500 miles default)
          })
          
          setNearbyMusicians(nearby)
          console.log(`Found ${nearby.length} musicians within 500 miles`)
        }
      } catch (error) {
        console.error('Error loading musicians:', error)
      } finally {
        setMapLoading(false)
      }
    }

    loadNearbyMusicians()
  }, [user, hostLocation])

  // Initialize map
  useEffect(() => {
    if (!hostLocation || !mapContainer.current || mapRef.current) return

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not found')
      setMapError(true)
      return
    }

    // Load Mapbox GL JS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'
    script.onload = () => {
      const mapboxgl = (window as unknown as Window & { mapboxgl: { accessToken: string; Map: new (config: object) => unknown; LngLat: new (lng: number, lat: number) => unknown } }).mapboxgl
      mapboxgl.accessToken = MAPBOX_TOKEN

      if (!mapContainer.current) return

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [hostLocation.lng, hostLocation.lat],
        zoom: 10,
        bearing: 0,
        pitch: 0
      })

      mapRef.current = map

      const mapInstance = map as {
        on: (event: string, cb: () => void) => void
        getCanvas: () => HTMLElement
        jumpTo: (options: { center: [number, number]; zoom: number }) => void
      }

      // Ensure zoom is set after map loads
      mapInstance.on('load', () => {
        // Set zoom to ensure it's at city level
        mapInstance.jumpTo({
          center: [hostLocation.lng, hostLocation.lat],
          zoom: 10
        })
        
        // Add host location marker
        const hostEl = document.createElement('div')
        hostEl.style.cssText = `
          width: 20px; height: 20px; border-radius: 50%;
          background: #F0A500;
          border: 3px solid #fff;
          box-shadow: 0 0 16px rgba(240,165,0,0.7);
        `
        new (window as unknown as Window & { mapboxgl: { Marker: new (el: HTMLElement) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker(hostEl)
          .setLngLat([hostLocation.lng, hostLocation.lat])
          .addTo(map)

        // Add musician markers
      nearbyMusicians.forEach(musician => {
        if (!musician.latitude || !musician.longitude) return

        const musicianEl = document.createElement('div')
        musicianEl.style.cssText = `
          width: 12px; height: 12px; border-radius: 50%;
            background: #4CAF50;
            border: 2px solid #fff;
            box-shadow: 0 0 12px rgba(76,175,80,0.7);
          cursor: pointer;
        `

          const marker = new (window as unknown as Window & { mapboxgl: { Marker: new (el: HTMLElement) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker(musicianEl)
          .setLngLat([musician.longitude, musician.latitude])
          .addTo(map)

          // Add click handler
          musicianEl.addEventListener('click', () => {
            setSelectedMusician(musician)
          })
        })
      })
    }
    document.body.appendChild(script)
  }, [hostLocation, nearbyMusicians])

  const handleInviteClick = (musician: Musician) => {
    setSelectedMusician(musician)
    setShowInviteForm(true)
    setInviteForm({
      proposed_date: '',
      venue_address: '',
      ticket_price: '',
      host_split: '55',
      musician_split: '40',
      message: ''
    })
  }

  const clampSplit = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) return 0
    return Math.max(0, Math.min(AVAILABLE_SPLIT, parsed))
  }

  const updateHostSplit = (value: string) => {
    const hostSplit = clampSplit(value)
    const musicianSplit = AVAILABLE_SPLIT - hostSplit
    setInviteForm(prev => ({
      ...prev,
      host_split: String(hostSplit),
      musician_split: String(musicianSplit)
    }))
  }

  const updateMusicianSplit = (value: string) => {
    const musicianSplit = clampSplit(value)
    const hostSplit = AVAILABLE_SPLIT - musicianSplit
    setInviteForm(prev => ({
      ...prev,
      host_split: String(hostSplit),
      musician_split: String(musicianSplit)
    }))
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedMusician) return

    try {
      const bookingData = {
        host_id: user.id,
        musician_id: selectedMusician.id,
        proposed_date: inviteForm.proposed_date,
        venue_address: inviteForm.venue_address,
        ticket_price: parseFloat(inviteForm.ticket_price),
        host_split: parseFloat(inviteForm.host_split),
        musician_split: parseFloat(inviteForm.musician_split),
        message: inviteForm.message,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('booking_requests')
        .insert(bookingData)

      if (error) throw error

      alert('Booking request sent successfully!')
      setShowInviteForm(false)
      setSelectedMusician(null)
    } catch (error) {
      console.error('Booking request error:', JSON.stringify(error))
      alert('Error: ' + JSON.stringify(error))
    }
  }

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

  const ticketPriceValue = Number.parseFloat(inviteForm.ticket_price || '0') || 0
  const hostPerTicket = ticketPriceValue * ((Number.parseFloat(inviteForm.host_split || '0') || 0) / 100)
  const musicianPerTicket = ticketPriceValue * ((Number.parseFloat(inviteForm.musician_split || '0') || 0) / 100)

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

        {/* Map Section */}
        <div style={{
          background: 'rgba(26,20,16,0.5)',
          border: '1px solid rgba(212,130,10,0.2)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            marginBottom: '16px'
          }}>
            Musicians Near You
          </h2>
          
          <div style={{
            background: 'rgba(26,20,16,0.5)',
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            {mapLoading ? (
              <div style={{
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8C7B6B',
                fontFamily: "'DM Sans', sans-serif"
              }}>
                Loading map...
              </div>
            ) : mapError ? (
              <div style={{
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8C7B6B',
                fontFamily: "'DM Sans', sans-serif"
              }}>
                <div style={{ marginBottom: '16px' }}>Location not available</div>
                <div style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                  Please set your location in your profile to see nearby musicians
                </div>
              </div>
            ) : (
              <div
                ref={mapContainer}
                style={{
                  height: '400px',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              />
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            fontSize: '0.9rem',
            color: '#8C7B6B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#F0A500',
                border: '2px solid #fff'
              }} />
              Your Location
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#4CAF50',
                border: '2px solid #fff'
              }} />
              Musicians (100 miles)
            </div>
          </div>
        </div>

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
            Available Musicians
          </h2>

          {nearbyMusicians.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#8C7B6B',
              padding: '40px'
            }}>
              No musicians found within 100 miles of your location.
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
                    alignItems: 'center'
                  }}
                >
                  {musician.photo_url && (
                    <img
                      src={musician.photo_url}
                      alt={musician.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                    />
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <a
                      href={`/musician/${musician.id}`}
                      style={{
                        display: 'inline-block',
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '1.3rem',
                        marginBottom: '8px',
                        color: '#F5F0E8',
                        textDecoration: 'none'
                      }}
                    >
                      {musician.name}
                    </a>
                    
                    <p style={{
                      color: '#8C7B6B',
                      marginBottom: '12px',
                      lineHeight: '1.5'
                    }}>
                      {musician.bio}
                    </p>

                    <a
                      href={`/musician/${musician.id}`}
                      style={{
                        display: 'inline-block',
                        color: '#F0A500',
                        textDecoration: 'none',
                        marginBottom: '12px',
                        fontSize: '0.9rem'
                      }}
                    >
                      View profile and social links
                    </a>
                    
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      fontSize: '0.9rem',
                      color: '#8C7B6B'
                    }}>
                      {musician.availability_status && (
                        <div>
                          Status: {musician.availability_status === 'based_here' ? 'Based Here' : 
                                 musician.availability_status === 'on_tour' ? 'On Tour' : 'Open to Travel'}
                        </div>
                      )}
                      {musician.zip_code && (
                        <div>📍 {musician.zip_code}</div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleInviteClick(musician)}
                    style={{
                      padding: '12px 24px',
                      background: '#D4820A',
                      border: '1px solid rgba(212,130,10,0.3)',
                      borderRadius: '8px',
                      color: '#F5F0E8',
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#F0A500'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#D4820A'
                    }}
                  >
                    Invite to Show
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && selectedMusician && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1A1410',
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.5rem',
              marginBottom: '24px'
            }}>
              Invite {selectedMusician.name} to Your Show
            </h2>

            <form onSubmit={handleInviteSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  color: '#8C7B6B',
                  marginBottom: '8px'
                }}>
                  Proposed Date *
                </label>
                <input
                  type="date"
                  required
                  value={inviteForm.proposed_date}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, proposed_date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  color: '#8C7B6B',
                  marginBottom: '8px'
                }}>
                  Venue Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="123 Main St, City, State"
                  value={inviteForm.venue_address}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, venue_address: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  color: '#8C7B6B',
                  marginBottom: '8px'
                }}>
                  Ticket Price ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="15.00"
                  value={inviteForm.ticket_price}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, ticket_price: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  color: '#8C7B6B',
                  marginBottom: '8px'
                }}>
                  Revenue Split
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      min="0"
                      max={AVAILABLE_SPLIT}
                      value={inviteForm.host_split}
                      onChange={(e) => updateHostSplit(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '8px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '1rem',
                        fontFamily: "'DM Sans', sans-serif",
                        textAlign: 'center'
                      }}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#8C7B6B', marginTop: '4px', textAlign: 'center' }}>
                      Host %
                    </div>
                  </div>
                  
                  <div style={{ color: '#8C7B6B' }}>+</div>
                  
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      min="0"
                      max={AVAILABLE_SPLIT}
                      value={inviteForm.musician_split}
                      onChange={(e) => updateMusicianSplit(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '8px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '1rem',
                        fontFamily: "'DM Sans', sans-serif",
                        textAlign: 'center'
                      }}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#8C7B6B', marginTop: '4px', textAlign: 'center' }}>
                      Musician %
                    </div>
                  </div>
                  
                  <div style={{ color: '#8C7B6B' }}>+</div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid rgba(212,130,10,0.2)',
                      borderRadius: '8px',
                      background: 'rgba(44,34,24,0.3)',
                      color: '#8C7B6B',
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif",
                      textAlign: 'center'
                    }}>
                      5%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#8C7B6B', marginTop: '4px', textAlign: 'center' }}>
                      Platform
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#8C7B6B' }}>
                  Host earns ${hostPerTicket.toFixed(2)} per ticket. Musician earns ${musicianPerTicket.toFixed(2)} per ticket. Platform keeps 5%.
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  color: '#8C7B6B',
                  marginBottom: '8px'
                }}>
                  Message to Musician
                </label>
                <textarea
                  placeholder="Tell them about your venue, audience, and what you have in mind..."
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif",
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#D4820A',
                    border: '1px solid rgba(212,130,10,0.3)',
                    borderRadius: '8px',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer'
                  }}
                >
                  Send Invitation
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'transparent',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
