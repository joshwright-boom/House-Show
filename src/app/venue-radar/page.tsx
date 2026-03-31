'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface VenueHost {
  id: string
  user_id?: string | null
  name: string
  bio: string
  photo_url?: string | null
  venue_photo_url?: string | null
  user_type: 'host'
  latitude: number
  longitude: number
  location_address?: string
  neighborhood?: string
  availability_status?: 'based_here' | 'on_tour' | 'open_to_travel'
  amenities?: string[] | null
  has_sound_equipment?: boolean | null
  venue_capacity?: number | null
  venue_description?: string | null
  hostProfileId?: string | null
  zip_code?: string
  distanceMiles: number
}

type LoadedVenueHost = Omit<VenueHost, 'distanceMiles'>

const getHostInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

export default function VenueRadarPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<VenueHost | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationSearching, setLocationSearching] = useState(false)
  const [venues, setVenues] = useState<VenueHost[]>([])
  const [allHosts, setAllHosts] = useState<LoadedVenueHost[]>([])
  const [hostProfilesById, setHostProfilesById] = useState(new Map<string, {
    id: string
    user_id?: string | null
    venue_description?: string | null
    address?: string | null
    neighborhood?: string | null
    venue_photo_url?: string | null
    amenities?: string[] | null
    has_sound_equipment?: boolean | null
    venue_capacity?: number | null
  }>())

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const requestBrowserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocationError(false)
        },
        () => {
          setUserLocation({ lat: 36.1539, lng: -95.9928 })
          setLocationError(true)
        }
      )
    } else {
      setUserLocation({ lat: 36.1539, lng: -95.9928 })
      setLocationError(true)
    }
  }

  useEffect(() => {
    requestBrowserLocation()
  }, [])

  useEffect(() => {
    const loadAllHosts = async () => {
      try {
        // Start from host_profiles — source of truth for venue data.
        // Hosts may have a host_profiles row without a matching profiles row
        // with user_type=host, so querying profiles first misses them.
        const { data: hostProfiles } = await supabase
          .from('host_profiles')
          .select('*')
          .eq('available', true)

        if (!hostProfiles || hostProfiles.length === 0) {
          setAllHosts([])
          return
        }

        const userIds = hostProfiles.map((hp) => hp.user_id).filter(Boolean)

        // Load profiles for display info (name, photo, availability_status, coordinates)
        let profilesMap = new Map<string, Record<string, any>>()
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, bio, photo_url, latitude, longitude, availability_status')
            .in('id', userIds)
          profilesMap = new Map((profiles || []).map((p) => [p.id, p]))
        }

        const nextHostProfilesById = new Map(
          hostProfiles.map((hp) => [
            hp.user_id || hp.id,
            {
              id: hp.id,
              user_id: hp.user_id || null,
              venue_description: hp.venue_description || null,
              address: hp.address || null,
              neighborhood: hp.neighborhood || null,
              venue_photo_url: hp.venue_photo_url || null,
              amenities: hp.amenities || [],
              has_sound_equipment: hp.has_sound_equipment ?? null,
              venue_capacity: hp.venue_capacity ?? null
            }
          ])
        )
        setHostProfilesById(nextHostProfilesById)

        // Geocode addresses for hosts without coordinates in either table
        const geocodedCoordsByKey = new Map<string, { latitude: number; longitude: number }>()
        await Promise.all(
          hostProfiles.map(async (hp) => {
            const profile = profilesMap.get(hp.user_id)
            if (profile?.latitude != null && profile?.longitude != null) return
            if (hp.latitude != null && hp.longitude != null) return

            const address = (hp.address || '').trim()
            if (!address) return

            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
              )
              const results = await res.json()
              if (results[0]) {
                geocodedCoordsByKey.set(hp.user_id || hp.id, {
                  latitude: parseFloat(results[0].lat),
                  longitude: parseFloat(results[0].lon)
                })
              }
            } catch (error) {
              console.error('Error geocoding host venue address:', error)
            }
          })
        )

        const mergedHosts: LoadedVenueHost[] = hostProfiles.reduce((acc: LoadedVenueHost[], hp) => {
          const profile = profilesMap.get(hp.user_id)
          const fallbackCoords = geocodedCoordsByKey.get(hp.user_id || hp.id)
          const hostLatitude = profile?.latitude ?? hp.latitude ?? fallbackCoords?.latitude
          const hostLongitude = profile?.longitude ?? hp.longitude ?? fallbackCoords?.longitude

          if (hostLatitude == null || hostLongitude == null) return acc

          const hostId = hp.user_id || hp.id
          acc.push({
            id: hostId,
            user_id: hostId,
            name: profile?.name || hp.venue_name || 'Unknown Host',
            bio: hp.venue_description || profile?.bio || '',
            photo_url: profile?.photo_url || null,
            venue_photo_url: hp.venue_photo_url || null,
            user_type: 'host',
            latitude: hostLatitude,
            longitude: hostLongitude,
            neighborhood: hp.neighborhood || '',
            availability_status: profile?.availability_status || 'based_here',
            amenities: hp.amenities || [],
            has_sound_equipment: hp.has_sound_equipment ?? null,
            venue_capacity: hp.venue_capacity ?? null,
            venue_description: hp.venue_description || null,
            hostProfileId: hp.id
          })
          return acc
        }, [])

        setAllHosts(mergedHosts)
      } catch (error) {
        console.error('Error loading venues:', error)
      }
    }

    loadAllHosts()
  }, [])

  useEffect(() => {
    if (!userLocation || allHosts.length === 0) return

    const nearby = allHosts
      .map((host) => {
        const distanceKm = calculateDistance(userLocation.lat, userLocation.lng, host.latitude, host.longitude)
        const distanceMiles = distanceKm / 1.60934
        return {
          ...host,
          distanceMiles
        }
      })
      .filter((host) => !(host.distanceMiles > 100 && host.distanceMiles >= 0.01))
      .sort((a, b) => a.distanceMiles - b.distanceMiles)

    setVenues(nearby)
  }, [userLocation, allHosts])

  const availableCount = venues.filter((v) => v.availability_status === 'based_here' || v.availability_status === 'open_to_travel').length

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!locationSearch.trim()) return

    try {
      setLocationSearching(true)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const results = await res.json()
      if (results[0]) {
        setUserLocation({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) })
        setLocationError(false)
      }
    } catch (error) {
      console.error('Error searching for location:', error)
    } finally {
      setLocationSearching(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 32px', borderBottom: '1px solid rgba(212,130,10,0.15)',
        background: 'rgba(26,20,16,0.98)', zIndex: 200, flexShrink: 0,
      }}>
        <a href="/dashboard" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#8C7B6B', letterSpacing: '1px' }}>
              {availableCount} VENUES AVAILABLE
            </span>
          </div>
          <a href="/dashboard" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>Dashboard</a>
        </div>
      </nav>

      <section style={{ flex: 1, padding: '24px 32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Venue Radar
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '4px' }}>
            100-Mile Radius
          </h2>
          {locationError && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '16px' }}>
              📍 Showing Tulsa, OK — allow location for your area
            </p>
          )}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B', marginBottom: '20px' }}>
            Nearby available venues, sorted closest first.
          </p>

          <form
            onSubmit={handleLocationSearch}
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '20px'
            }}
          >
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search by city, neighborhood, or address"
              style={{
                flex: '1 1 320px',
                minWidth: '240px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.25)',
                background: 'rgba(44,34,24,0.3)',
                color: '#F5F0E8',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.95rem'
              }}
            />
            <button
              type="submit"
              disabled={locationSearching}
              style={{
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                cursor: locationSearching ? 'not-allowed' : 'pointer',
                opacity: locationSearching ? 0.7 : 1
              }}
            >
              Search
            </button>
            <button
              type="button"
              onClick={requestBrowserLocation}
              style={{
                background: 'transparent',
                color: '#F5F0E8',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(212,130,10,0.25)',
                fontSize: '0.9rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer'
              }}
            >
              Use My Location
            </button>
            {locationSearching && (
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>
                Searching...
              </span>
            )}
          </form>

          {venues.length === 0 ? (
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              color: '#8C7B6B',
              fontFamily: "'DM Sans', sans-serif"
            }}>
              No available venues found within 100 miles.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {venues.map((venue) => {
                const hostProfile = hostProfilesById.get(venue.id)
                console.log('Venue radar resolved host_id:', hostProfile?.id || venue.id)

                return (
                <article
                  key={venue.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'rgba(44,34,24,0.3)'
                  }}
                >
                  {venue.venue_photo_url?.trim() ? (
                    <img
                      src={venue.venue_photo_url}
                      alt={venue.name}
                      style={{
                        width: '100%',
                        height: '180px',
                        objectFit: 'cover',
                        display: 'block',
                        borderBottom: '1px solid rgba(212,130,10,0.15)'
                      }}
                    />
                  ) : (
                    <div
                      aria-label={venue.name}
                      style={{
                        width: '100%',
                        height: '180px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(26,20,16,0.95)',
                        borderBottom: '1px solid rgba(212,130,10,0.15)',
                        color: '#D4820A',
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '3rem',
                        fontWeight: 700
                      }}
                    >
                      {getHostInitial(venue.name)}
                    </div>
                  )}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          {venue.photo_url?.trim() ? (
                            <img
                              src={venue.photo_url}
                              alt={venue.name}
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1px solid rgba(212,130,10,0.25)',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <div
                              aria-label={venue.name}
                              style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(26,20,16,0.95)',
                                border: '1px solid rgba(212,130,10,0.25)',
                                color: '#D4820A',
                                fontFamily: "'Playfair Display', serif",
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                flexShrink: 0
                              }}
                            >
                              {getHostInitial(venue.name)}
                            </div>
                          )}
                          <div>
                            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: '#F5F0E8', marginBottom: '8px' }}>
                              {venue.name}
                            </h3>
                            {venue.venue_description && (
                              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B', lineHeight: '1.5', margin: 0 }}>
                                {venue.venue_description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#22c55e', letterSpacing: '1px' }}>
                            {venue.availability_status === 'open_to_travel' ? 'OPEN TO TRAVEL' : 'AVAILABLE'}
                          </span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#D9C6A5' }}>
                            {venue.neighborhood || 'Neighborhood not listed'}
                          </span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B' }}>
                            Sound Equipment: {venue.has_sound_equipment ? 'Yes' : 'No'}
                          </span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B' }}>
                            Capacity: {venue.venue_capacity ? `${venue.venue_capacity} people` : 'Not listed'}
                          </span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B' }}>
                            Amenities: {venue.amenities && venue.amenities.length > 0 ? venue.amenities.join(', ') : 'Not listed'}
                          </span>
                          {typeof venue.distanceMiles === 'number' && (
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B' }}>
                              {Math.round(venue.distanceMiles)} miles away
                            </span>
                          )}
                        </div>
                      </div>
                      <a href={venue.hostProfileId ? '/request-venue?host_id=' + venue.hostProfileId : '/venue-radar'} style={{
                        background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                        color: '#1A1410',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        fontFamily: "'DM Sans', sans-serif",
                        display: 'inline-block',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap'
                      }}>
                        Request Show
                      </a>
                    </div>
                  </div>
                </article>
              )})}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
