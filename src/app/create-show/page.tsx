'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface Show {
  id: string
  show_name: string
  venue_name: string
  venue_address: string
  neighborhood?: string
  full_address?: string
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
  zip_code?: string
  latitude?: number
  longitude?: number
  location_address?: string
}

const getShowDateValue = (show: Record<string, any>) =>
  show.date || show.show_date || show.event_date || show.scheduled_date || ''

const normalizeDateForInput = (value?: string | null) => {
  if (!value) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (isoMatch) return isoMatch[1]

  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return value
}

interface BookingRequestDraft {
  id: string
  host_id: string
  musician_id: string
  proposed_date: string
  show_date?: string
  venue_address: string
  ticket_price: number
  message: string
}

function CreateShowContent() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [userRole, setUserRole] = useState<'host' | 'musician' | null>(null)
  const [requestDraft, setRequestDraft] = useState<BookingRequestDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null)
  const [musicianSearch, setMusicianSearch] = useState('')
  const [musicianResults, setMusicianResults] = useState<Musician[]>([])
  const [searchingMusicians, setSearchingMusicians] = useState(false)
  const [showMusicianDropdown, setShowMusicianDropdown] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  
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
    neighborhood: '',
    full_address: '',
    venue_address: '',
    date: '',
    time: '',
    ticket_price: '',
    max_capacity: '',
    show_description: '',
    genre_preference: 'Any'
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get('requestId')

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
      
      if (profile?.user_type !== 'host' && !requestId) {
        router.push('/dashboard')
        return
      }
      
      if (profile?.user_type === 'host' || profile?.user_type === 'musician') {
        setUserRole(profile.user_type)
      }

      setUser({ id: user.id, email: user.email })

      if (profile?.user_type === 'host') {
        const { data: hostProfile } = await supabase
          .from('host_profiles')
          .select('venue_name, address, capacity')
          .eq('id', user.id)
          .maybeSingle()

        if (hostProfile) {
          setFormData(prev => ({
            ...prev,
            venue_name: prev.venue_name || hostProfile.venue_name || '',
            neighborhood: prev.neighborhood || hostProfile.address || '',
            full_address: prev.full_address || hostProfile.address || '',
            venue_address: prev.venue_address || hostProfile.address || '',
            max_capacity: prev.max_capacity || (hostProfile.capacity ? String(hostProfile.capacity) : '')
          }))
        }
      }
    }
    
    checkUser()
  }, [router])

  useEffect(() => {
    const loadRequestDraft = async () => {
      if (!user || !requestId) return

      const { data: request, error } = await supabase
        .from('booking_requests')
        .select('id, host_id, musician_id, proposed_date, show_date, venue_address, ticket_price, message')
        .eq('id', requestId)
        .single()

      if (error || !request) {
        console.error('Error loading booking request draft:', error)
        return
      }

      if (request.host_id !== user.id && request.musician_id !== user.id) {
        console.error('Current user is not part of this booking request')
        return
      }

      setRequestDraft(request as BookingRequestDraft)

      const { data: artistProfile, error: artistProfileError } = await supabase
        .from('artist_profiles')
        .select('id, user_id, name')
        .eq('id', request.musician_id)
        .maybeSingle()

      if (artistProfileError) {
        console.error('Error loading artist profile for request draft:', artistProfileError)
      }

      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('host_profiles')
        .select('id, neighborhood')
        .eq('id', request.host_id)
        .maybeSingle()

      if (hostProfileError) {
        console.error('Error loading host profile for request draft:', hostProfileError)
      }

      if (artistProfile?.name) {
        setMusicianSearch(artistProfile.name)
      }

      setFormData(prev => ({
        ...prev,
        show_name: artistProfile?.name ? `${artistProfile.name} Live` : prev.show_name,
        venue_name: prev.venue_name || request.venue_address,
        neighborhood: hostProfile?.neighborhood || prev.neighborhood,
        full_address: prev.full_address || request.venue_address,
        venue_address: request.venue_address,
        date: normalizeDateForInput(request.proposed_date),
        time: prev.time || '19:00',
        ticket_price: String(request.ticket_price ?? ''),
        max_capacity: prev.max_capacity || '40',
        show_description: request.message || prev.show_description
      }))
    }

    loadRequestDraft()
  }, [user, requestId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    const query = formData.full_address.trim()
    if (query.length < 3 || !MAPBOX_TOKEN) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setAddressLoading(true)
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&limit=5&country=us&access_token=${MAPBOX_TOKEN}`
        )
        const data = await response.json()
        const suggestions: string[] = (data?.features || [])
          .map((feature: { place_name?: string }) => feature.place_name)
          .filter(Boolean)

        setAddressSuggestions(suggestions)
        setShowAddressSuggestions(suggestions.length > 0)
      } catch (error) {
        console.error('Error loading address suggestions:', error)
        setAddressSuggestions([])
        setShowAddressSuggestions(false)
      } finally {
        setAddressLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [formData.full_address])

  const handleSelectAddress = (address: string) => {
    setFormData(prev => ({ ...prev, full_address: address, venue_address: prev.neighborhood || address }))
    setAddressSuggestions([])
    setShowAddressSuggestions(false)
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
        .select('zip_code')
        .eq('id', user!.id)
        .single()

      console.log('Host profile zip code:', hostProfile?.zip_code)
      
      let musicianQuery = supabase
        .from('profiles')
        .select('id, name, bio, photo_url, user_type, zip_code')
        .eq('user_type', 'musician')
        .limit(10)

      // If host has a zip code, prioritize musicians from same zip code
      if (hostProfile?.zip_code) {
        musicianQuery = musicianQuery.ilike('zip_code', `%${hostProfile.zip_code}%`)
        console.log('Searching musicians in zip code:', hostProfile.zip_code)
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

  // Load venue location and nearby musicians
  useEffect(() => {
    if (!user) return

    const loadVenueLocationAndMusicians = async () => {
      try {
        // Only load map when venue address is provided
        if (!formData.full_address || formData.full_address.length < 5) {
          setMapError(true)
          return
        }

        // Use Mapbox Geocoding API to convert venue address to coordinates
        console.log('Geocoding venue address:', formData.full_address)
        const geocodeResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formData.full_address)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&country=us`
        )
        const geocodeData = await geocodeResponse.json()
        
        if (geocodeData.features && geocodeData.features.length > 0) {
          const [lng, lat] = geocodeData.features[0].center
          const location = { lat, lng }
          setHostLocation(location)
          console.log('Geocoded venue location:', location)
          
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
                location.lat, 
                location.lng, 
                musician.latitude, 
                musician.longitude
              )
              return distance <= 160.934 // 100 miles in km
            })
            
            setNearbyMusicians(nearby)
            console.log(`Found ${nearby.length} musicians within 100 miles`)
          } else {
            setNearbyMusicians([])
          }
        } else {
          console.log('Geocoding failed for address:', formData.full_address)
          setMapError(true)
        }
      } catch (error) {
        console.error('Error loading location data:', error)
        setMapError(true)
      } finally {
        setMapLoading(false)
      }
    }

    loadVenueLocationAndMusicians()
  }, [user, formData.full_address])

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
        new (window as unknown as Window & { mapboxgl: { Marker: new (options: { element: HTMLElement; anchor: string }) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker({ element: hostEl, anchor: 'bottom' })
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

          new (window as unknown as Window & { mapboxgl: { Marker: new (options: { element: HTMLElement; anchor: string }) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker({ element: musicianEl, anchor: 'bottom' })
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
    setSubmitError(null)
    
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        throw new Error('Your session expired. Please sign in again and retry.')
      }

      const response = await fetch('/api/create-show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          requestId,
          formData,
          selectedMusicianId: selectedMusician?.id || null,
          artist_name: selectedMusician?.name || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Please try again.')
      }

      router.push(result.showId ? `/show/${result.showId}` : '/bookings')
    } catch (error) {
      console.error('Error creating show:', error)
      setSubmitError(error instanceof Error ? error.message : 'Please try again.')
      alert(`Error creating show: ${error instanceof Error ? error.message : 'Please try again.'}`)
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

          {requestDraft && (
            <div style={{
              marginBottom: '32px',
              padding: '16px 18px',
              borderRadius: '10px',
              border: '1px solid rgba(212,130,10,0.2)',
              background: 'rgba(44,34,24,0.35)',
              color: '#F5F0E8',
              lineHeight: '1.6'
            }}>
              {userRole === 'host'
                ? 'This show is being created from an accepted invitation. Review the details and publish the ticket page.'
                : 'This invitation is accepted. Share this link with the host account to publish the ticket page and start selling tickets.'}
            </div>
          )}

          {submitError && (
            <div style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(180,70,70,0.4)',
              background: 'rgba(100,25,25,0.22)',
              color: '#F5B5B5',
              lineHeight: '1.5',
              width: 'calc(100% - 32px)',
              maxWidth: '560px'
            }}>
              Error creating show: {submitError}
            </div>
          )}

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

            {/* Neighborhood */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Neighborhood or Area
              </label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => {
                  handleInputChange('neighborhood', e.target.value)
                  handleInputChange('venue_address', e.target.value)
                }}
                placeholder="e.g., North Tulsa"
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

            {/* Full Address */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Full Address
              </label>
              <input
                type="text"
                value={formData.full_address}
                onChange={(e) => {
                  handleInputChange('full_address', e.target.value)
                  setShowAddressSuggestions(true)
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowAddressSuggestions(false), 120)
                }}
                placeholder="123 Main St, City, State"
                required
                autoComplete="off"
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
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  border: '1px solid rgba(212,130,10,0.25)',
                  borderRadius: '8px',
                  background: '#241A12',
                  overflow: 'hidden',
                  zIndex: 20,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.35)'
                }}>
                  {addressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={() => handleSelectAddress(suggestion)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(212,130,10,0.12)',
                        padding: '12px 14px',
                        color: '#F5F0E8',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.92rem',
                        cursor: 'pointer'
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {addressLoading && (
                <div style={{
                  marginTop: '8px',
                  color: '#8C7B6B',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.85rem'
                }}>
                  Looking up address suggestions...
                </div>
              )}
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
                          {musician.zip_code && (
                            <div style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '0.8rem',
                              color: '#8C7B6B',
                              marginTop: '2px'
                            }}>
                              📍 {musician.zip_code}
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

export default function CreateShow() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1A1410' }} />}>
      <CreateShowContent />
    </Suspense>
  )
}
