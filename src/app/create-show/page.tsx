'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface Show {
  id: string
  show_name: string
  venue_name: string
  venue_address: string
  date: string
  time: string
  ticket_price: number
  max_capacity: number
  show_description: string
  genre_preference: string
  host_id: string
  artist_user_id?: string
  status: 'open' | 'booked' | 'cancelled'
  created_at: string
}

interface Musician {
  id: string
  name: string
  bio: string
  photo_url?: string
  user_type: 'musician'
  city?: string
  latitude?: number
  longitude?: number
  location_address?: string
}

export default function CreateShow() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null)
  const [musicianSearch, setMusicianSearch] = useState('')
  const [musicianResults, setMusicianResults] = useState<Musician[]>([])
  const [searchingMusicians, setSearchingMusicians] = useState(false)
  const [showMusicianDropdown, setShowMusicianDropdown] = useState(false)
  
  // Map state
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [hostLocation, setHostLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyMusicians, setNearbyMusicians] = useState<Musician[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState(false)
  
  const [formData, setFormData] = useState({
    show_name: '',
    venue_name: '',
    venue_address: '',
    date: '',
    time: '',
    ticket_price: '',
    max_capacity: '',
    show_description: '',
    genre_preference: 'Any'
  })
  
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      // Check if user is a host
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
      
      if (profile?.user_type !== 'host') {
        router.push('/dashboard')
        return
      }
      
      setUser({ id: user.id, email: user.email })
    }
    
    checkUser()
  }, [router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const searchMusicians = async (query: string) => {
    if (!query.trim()) {
      setMusicianResults([])
      setShowMusicianDropdown(false)
      return
    }

    setSearchingMusicians(true)
    try {
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user!.id)
        .single()

      console.log('Host profile city:', hostProfile?.city)
      
      let musicianQuery = supabase
        .from('profiles')
        .select('id, name, bio, photo_url, user_type, city')
        .eq('user_type', 'musician')
        .limit(10)

      // If host has a city, prioritize musicians from same city
      if (hostProfile?.city) {
        musicianQuery = musicianQuery.ilike('city', `%${hostProfile.city}%`)
        console.log('Searching musicians in city:', hostProfile.city)
      } else {
        musicianQuery = musicianQuery.ilike('name', `%${query}%`)
        console.log('Searching musicians by name:', query)
      }

      const { data, error } = await musicianQuery

      if (error) throw error
      setMusicianResults(data || [])
      setShowMusicianDropdown(true)
    } catch (error) {
      console.error('Error searching musicians:', error)
      setMusicianResults([])
    } finally {
      setSearchingMusicians(false)
    }
  }

  const handleMusicianSearch = (value: string) => {
    setMusicianSearch(value)
    searchMusicians(value)
  }

  const selectMusician = (musician: Musician) => {
    setSelectedMusician(musician)
    setMusicianSearch(musician.name)
    setShowMusicianDropdown(false)
  }

  const clearMusician = () => {
    setSelectedMusician(null)
    setMusicianSearch('')
    setShowMusicianDropdown(false)
  }

  // Load host location and nearby musicians
  useEffect(() => {
    if (!user) return

    const loadHostLocationAndMusicians = async () => {
      try {
        // Get host profile with location
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('latitude, longitude, location_address')
          .eq('id', user.id)
          .single()

        if (hostProfile?.latitude && hostProfile?.longitude) {
          setHostLocation({ lat: hostProfile.latitude, lng: hostProfile.longitude })
          
          // Load nearby musicians (within 100 miles)
          const { data: musicians } = await supabase
            .from('profiles')
            .select('id, name, bio, photo_url, user_type, latitude, longitude, location_address')
            .eq('user_type', 'musician')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)

          if (musicians) {
            // Filter musicians within ~100 miles (simple distance calculation)
            const nearby = musicians.filter(musician => {
              if (!musician.latitude || !musician.longitude) return false
              
              const distance = calculateDistance(
                hostProfile.latitude, 
                hostProfile.longitude, 
                musician.latitude, 
                musician.longitude
              )
              return distance <= 160.934 // 100 miles in km
            })
            
            setNearbyMusicians(nearby)
          } else {
            // No host location, show all musicians
            setNearbyMusicians(musicians || [])
          }
        } else {
          setMapError(true)
        }
      } catch (error) {
        console.error('Error loading location data:', error)
        setMapError(true)
      } finally {
        setMapLoading(false)
      }
    }

    loadHostLocationAndMusicians()
  }, [user])

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

  // Initialize map
  useEffect(() => {
    if (!hostLocation || !mapContainer.current || mapRef.current) return

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
      })

      mapRef.current = map

      const mapInstance = map as {
        on: (event: string, cb: () => void) => void
        getCanvas: () => HTMLElement
      }

      mapInstance.on('load', () => {
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
            width: 16px; height: 16px; border-radius: 50%;
            background: #22c55e;
            border: 2px solid #fff;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(34,197,94,0.5);
            transition: transform 0.15s;
          `
          musicianEl.addEventListener('mouseenter', () => { musicianEl.style.transform = 'scale(1.5)' })
          musicianEl.addEventListener('mouseleave', () => { musicianEl.style.transform = 'scale(1)' })
          musicianEl.addEventListener('click', () => {
            selectMusician(musician)
            // Scroll to musician search field
            document.getElementById('musician-search-field')?.scrollIntoView({ behavior: 'smooth' })
          })

          new (window as unknown as Window & { mapboxgl: { Marker: new (el: HTMLElement) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker(musicianEl)
            .setLngLat([musician.longitude, musician.latitude])
            .addTo(map)
        })

        mapInstance.getCanvas().style.cursor = 'grab'
      })
    }
    document.head.appendChild(script)
  }, [hostLocation, nearbyMusicians])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    
    try {
      const showData = {
        show_name: formData.show_name,
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        date: formData.date,
        time: formData.time,
        ticket_price: parseFloat(formData.ticket_price),
        max_capacity: parseInt(formData.max_capacity),
        show_description: formData.show_description,
        genre_preference: formData.genre_preference,
        host_id: user.id,
        artist_user_id: selectedMusician?.id || null,
        status: 'open',
        created_at: new Date().toISOString()
      }
      
      // Save to Supabase
      const { error } = await supabase
        .from('shows')
        .insert(showData)
      
      if (error) {
        console.error('Error creating show:', error)
        alert('Error creating show. Please try again.')
        return
      }
      
      // Redirect to bookings page
      router.push('/bookings')
    } catch (error) {
      console.error('Error creating show:', error)
      alert('Error creating show. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Loading...</p>
    </div>
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
          background: #1A1410;
          color: '#F5F0E8';
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
      
      <main style={{ minHeight: '100vh', background: '#1A1410', padding: '48px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
          <a href="/bookings" style={{ color: '#8C7B6B', fontSize: '0.9rem', textDecoration: 'none' }}>← Back to Bookings</a>
        </nav>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Create Show
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Host a House Show
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Create a listing for your house show and connect with talented musicians in your area.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Show Name */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Show Name
              </label>
              <input
                type="text"
                value={formData.show_name}
                onChange={(e) => handleInputChange('show_name', e.target.value)}
                placeholder="e.g., Cozy Acoustic Night"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Venue Name */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Name
              </label>
              <input
                type="text"
                value={formData.venue_name}
                onChange={(e) => handleInputChange('venue_name', e.target.value)}
                placeholder="e.g., Sarah's Living Room"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Venue Address */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Address
              </label>
              <input
                type="text"
                value={formData.venue_address}
                onChange={(e) => handleInputChange('venue_address', e.target.value)}
                placeholder="123 Main St, City, State"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Date and Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>
            </div>

            {/* Ticket Price and Capacity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Ticket Price ($)
                </label>
                <input
                  type="number"
                  value={formData.ticket_price}
                  onChange={(e) => handleInputChange('ticket_price', e.target.value)}
                  placeholder="25"
                  min="1"
                  step="0.01"
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Max Capacity
                </label>
                <input
                  type="number"
                  value={formData.max_capacity}
                  onChange={(e) => handleInputChange('max_capacity', e.target.value)}
                  placeholder="20"
                  min="1"
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(44,34,24,0.3)',
                    color: '#F5F0E8',
                    fontSize: '1rem',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                />
              </div>
            </div>

            {/* Genre Preference */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Genre Preference
              </label>
              <select
                value={formData.genre_preference}
                onChange={(e) => handleInputChange('genre_preference', e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                <option value="Any">Any</option>
                <option value="Folk/Acoustic">Folk/Acoustic</option>
                <option value="Jazz">Jazz</option>
                <option value="Rock">Rock</option>
                <option value="Classical">Classical</option>
                <option value="Electronic">Electronic</option>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Nearby Musicians Map */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Nearby Musicians
              </label>
              <div style={{
                background: 'rgba(26,20,16,0.5)',
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                {mapLoading ? (
                  <div style={{
                    height: '300px',
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
                    height: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8C7B6B',
                    fontFamily: "'DM Sans', sans-serif",
                    textAlign: 'center',
                    gap: '8px'
                  }}>
                    <div>Location not available</div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Add your location to your profile to see nearby musicians
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      height: '300px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '12px'
                    }} ref={mapContainer}></div>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '0.85rem',
                      fontFamily: "'DM Sans', sans-serif",
                      color: '#8C7B6B'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#F0A500',
                          border: '2px solid #fff'
                        }}></div>
                        <span>Your Location</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          border: '2px solid #fff'
                        }}></div>
                        <span>Nearby Musicians ({nearbyMusicians.length})</span>
                      </div>
                    </div>
                    {nearbyMusicians.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.8rem',
                        color: '#D4820A',
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        Click on a musician pin to select them
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Musician Selection */}
            <div id="musician-search-field">
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Preferred Musician (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={musicianSearch}
                    onChange={(e) => handleMusicianSearch(e.target.value)}
                    placeholder="Search for a musician..."
                    onFocus={() => musicianResults.length > 0 && setShowMusicianDropdown(true)}
                    style={{
                      flex: 1,
                      padding: '16px',
                      border: '1px solid rgba(212,130,10,0.2)',
                      borderRadius: '8px',
                      background: 'rgba(44,34,24,0.3)',
                      color: '#F5F0E8',
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                  />
                  {selectedMusician && (
                    <button
                      type="button"
                      onClick={clearMusician}
                      style={{
                        padding: '16px',
                        background: 'rgba(212,130,10,0.2)',
                        border: '1px solid rgba(212,130,10,0.3)',
                        borderRadius: '8px',
                        color: '#D4820A',
                        fontSize: '0.9rem',
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {/* Musician Dropdown */}
                {showMusicianDropdown && musicianResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'rgba(26,20,16,0.95)',
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10
                  }}>
                    {musicianResults.map((musician) => (
                      <div
                        key={musician.id}
                        onClick={() => selectMusician(musician)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(212,130,10,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(240,165,0,0.1)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {musician.photo_url && (
                          <img
                            src={musician.photo_url}
                            alt={musician.name}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '0.95rem',
                            color: '#F5F0E8',
                            fontWeight: 500
                          }}>
                            {musician.name}
                          </div>
                          {musician.city && (
                            <div style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '0.8rem',
                              color: '#8C7B6B',
                              marginTop: '2px'
                            }}>
                              📍 {musician.city}
                            </div>
                          )}
                          {musician.bio && (
                            <div style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '0.8rem',
                              color: '#8C7B6B',
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {musician.bio}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchingMusicians && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    padding: '16px',
                    textAlign: 'center',
                    color: '#8C7B6B',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.9rem'
                  }}>
                    Searching...
                  </div>
                )}
              </div>
            </div>

            {/* Show Description */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Show Description
              </label>
              <textarea
                value={formData.show_description}
                onChange={(e) => handleInputChange('show_description', e.target.value)}
                placeholder="Describe your venue, the atmosphere, and what kind of show you're looking to host..."
                rows={4}
                required
                style={{
                  width: '100%',
                  padding: '16px',
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Creating Show...' : 'Create Show'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
