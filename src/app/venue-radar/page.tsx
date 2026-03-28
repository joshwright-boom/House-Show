'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface VenueHost {
  id: string
  name: string
  bio: string
  venue_photo_url?: string | null
  user_type: 'host'
  latitude: number
  longitude: number
  location_address?: string
  neighborhood?: string
  availability_status?: 'based_here' | 'on_tour' | 'open_to_travel'
  zip_code?: string
  distanceMiles: number
}

const getHostInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

export default function VenueRadarPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<VenueHost | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [venues, setVenues] = useState<VenueHost[]>([])

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          setUserLocation({ lat: 36.1539, lng: -95.9928 })
          setLocationError(true)
        }
      )
    } else {
      setUserLocation({ lat: 36.1539, lng: -95.9928 })
      setLocationError(true)
    }
  }, [])

  useEffect(() => {
    if (!userLocation) return

    const loadNearbyVenues = async () => {
      try {
        const { data: hosts } = await supabase
          .from('profiles')
          .select('id, name, bio, user_type, latitude, longitude, location_address, availability_status, zip_code')
          .eq('user_type', 'host')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        const hostIds = (hosts || []).map((host) => host.id).filter(Boolean)
        let hostProfilesById = new Map<string, { venue_description?: string | null; address?: string | null; venue_photo_url?: string | null }>()

        if (hostIds.length > 0) {
          const { data: hostProfiles } = await supabase
            .from('host_profiles')
            .select('id, venue_description, address, venue_photo_url')
            .in('id', hostIds)

          hostProfilesById = new Map(
            (hostProfiles || []).map((profile) => [
              profile.id,
              {
                venue_description: profile.venue_description || null,
                address: profile.address || null,
                venue_photo_url: profile.venue_photo_url || null
              }
            ])
          )
        }

        if (hosts) {
          const nearby: VenueHost[] = []

          hosts.forEach((host) => {
            if (!host.latitude || !host.longitude) return

            const distanceKm = calculateDistance(userLocation.lat, userLocation.lng, host.latitude, host.longitude)
            const distanceMiles = distanceKm / 1.60934
            const isAvailable = host.availability_status === 'based_here' || host.availability_status === 'open_to_travel'

            if (!isAvailable || (distanceMiles > 100 && distanceMiles >= 0.01)) return

            const hostProfile = hostProfilesById.get(host.id)
            const neighborhood = hostProfile?.address?.split(',')[0]?.trim() || host.location_address?.split(',')[0]?.trim() || ''

            nearby.push({
              ...host,
              bio: hostProfile?.venue_description || host.bio || '',
              venue_photo_url: hostProfile?.venue_photo_url || null,
              neighborhood,
              distanceMiles
            })
          })

          nearby.sort((a, b) => a.distanceMiles - b.distanceMiles)

          setVenues(nearby)
        }
      } catch (error) {
        console.error('Error loading venues:', error)
      }
    }

    loadNearbyVenues()
  }, [userLocation])

  const availableCount = venues.filter((v) => v.availability_status === 'based_here' || v.availability_status === 'open_to_travel').length

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
              {venues.map((venue) => (
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
                      <div>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: '#F5F0E8', marginBottom: '8px' }}>
                          {venue.name}
                        </h3>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#22c55e', letterSpacing: '1px' }}>
                            {venue.availability_status === 'open_to_travel' ? 'OPEN TO TRAVEL' : 'AVAILABLE'}
                          </span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#D9C6A5' }}>
                            {venue.neighborhood || 'Area not listed'}
                          </span>
                          {typeof venue.distanceMiles === 'number' && (
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B' }}>
                              {Math.round(venue.distanceMiles)} miles away
                            </span>
                          )}
                        </div>
                      </div>
                      <a href={`/request-show/${venue.id}`} style={{
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
                    {venue.bio && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B', lineHeight: '1.5', margin: 0 }}>
                        {venue.bio}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
