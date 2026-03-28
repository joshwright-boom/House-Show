'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Musician {
  id: string
  name: string
  bio: string
  photo_url?: string
  user_type: 'musician'
  latitude: number
  longitude: number
  location_address?: string
  availability_status?: 'based_here' | 'on_tour' | 'open_to_travel'
  tour_dates?: string
  zip_code?: string
  distanceMiles: number
}

export default function RadarPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [musicians, setMusicians] = useState<Musician[]>([])

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

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          // Default to Tulsa if location denied
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

    const loadNearbyMusicians = async () => {
      try {
        const { data: musicians } = await supabase
          .from('profiles')
          .select('id, name, bio, photo_url, user_type, latitude, longitude, location_address, availability_status, tour_dates, zip_code')
          .eq('user_type', 'musician')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        if (musicians) {
          const nearby: Musician[] = []

          musicians.forEach((musician) => {
            if (!musician.latitude || !musician.longitude) return

            const distanceKm = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              musician.latitude,
              musician.longitude
            )

            const distanceMiles = distanceKm / 1.60934
            const isAvailable = musician.availability_status === 'based_here' || musician.availability_status === 'open_to_travel'

            if (!isAvailable || (distanceMiles > 100 && distanceMiles >= 0.01)) return

            nearby.push({
              ...musician,
              distanceMiles
            })
          })

          nearby.sort((a, b) => a.distanceMiles - b.distanceMiles)

          setMusicians(nearby)
        }
      } catch (error) {
        console.error('Error loading musicians:', error)
      }
    }

    loadNearbyMusicians()
  }, [userLocation])

  const availableCount = musicians.filter(m => m.availability_status === 'based_here' || m.availability_status === 'open_to_travel').length

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 32px', borderBottom: '1px solid rgba(212,130,10,0.15)',
        background: 'rgba(26,20,16,0.98)', zIndex: 200, flexShrink: 0,
      }}>
        <a href="/dashboard" style={{ fontFamily: "Playfair Display, serif", fontSize: "1.4rem", color: "#F0A500" }}>HouseShow</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#8C7B6B', letterSpacing: '1px' }}>
              {availableCount} MUSICIANS AVAILABLE
            </span>
          </div>
          <a href="/dashboard" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>Dashboard</a>
        </div>
      </nav>

      <section style={{ flex: 1, padding: '24px 32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Musician Radar
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
            Nearby available musicians, sorted closest first.
          </p>

          {musicians.length === 0 ? (
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              color: '#8C7B6B',
              fontFamily: "'DM Sans', sans-serif"
            }}>
              No available musicians found within 100 miles.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {musicians.map((musician) => (
                <article
                  key={musician.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    padding: '20px',
                    background: 'rgba(44,34,24,0.3)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: '#F5F0E8', marginBottom: '6px' }}>
                        {musician.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#22c55e', letterSpacing: '1px' }}>
                          AVAILABLE
                        </span>
                        {musician.location_address && (
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#8C7B6B', letterSpacing: '1px' }}>
                            {musician.location_address.split(',')[0]}
                          </span>
                        )}
                        {typeof musician.distanceMiles === 'number' && (
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#8C7B6B', letterSpacing: '1px' }}>
                            {Math.round(musician.distanceMiles)} MI
                          </span>
                        )}
                      </div>
                    </div>
                    <a href={`/find-musicians?contact=${musician.id}`} style={{
                      background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                      color: '#1A1410',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      display: 'inline-block',
                      textDecoration: 'none'
                    }}>
                      Contact Musician
                    </a>
                  </div>
                  {musician.bio && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#8C7B6B', lineHeight: '1.5', margin: 0 }}>
                      {musician.bio}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
