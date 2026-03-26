'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface VenueHost {
  id: string
  name: string
  bio: string
  photo_url?: string
  user_type: 'host'
  latitude: number
  longitude: number
  location_address?: string
  availability_status?: 'based_here' | 'on_tour' | 'open_to_travel'
  zip_code?: string
}

export default function VenueRadarPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<VenueHost | null>(null)
  const [loading, setLoading] = useState(true)
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
          .select('id, name, bio, photo_url, user_type, latitude, longitude, location_address, availability_status, zip_code')
          .eq('user_type', 'host')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        if (hosts) {
          const nearby = hosts.filter((host) => {
            if (!host.latitude || !host.longitude) return false
            const distance = calculateDistance(userLocation.lat, userLocation.lng, host.latitude, host.longitude)
            return distance <= 160.934 || distance < 0.01
          })
          setVenues(nearby)
        }
      } catch (error) {
        console.error('Error loading venues:', error)
      }
    }

    loadNearbyVenues()

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'
    script.onload = () => {
      const mapboxgl = (window as unknown as Window & { mapboxgl: { accessToken: string; Map: new (config: object) => unknown } }).mapboxgl
      mapboxgl.accessToken = MAPBOX_TOKEN
      if (!mapContainer.current) return

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [userLocation.lng, userLocation.lat],
        zoom: 9,
      })
      mapRef.current = map

      const mapInstance = map as {
        on: (event: string, cb: () => void) => void
        addSource: (id: string, config: object) => void
        addLayer: (config: object) => void
        getCanvas: () => HTMLElement
      }

      mapInstance.on('load', () => {
        setLoading(false)

        const radiusKm = 160.934
        const points = 64
        const coords: number[][] = []
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI
          const dx = (radiusKm / 111.32) * Math.cos(angle)
          const dy = (radiusKm / (111.32 * Math.cos(userLocation.lat * Math.PI / 180))) * Math.sin(angle)
          coords.push([userLocation.lng + dy, userLocation.lat + dx])
        }
        coords.push(coords[0])

        mapInstance.addSource('radius', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [coords] },
            properties: {}
          }
        })

        mapInstance.addLayer({
          id: 'radius-fill',
          type: 'fill',
          source: 'radius',
          paint: { 'fill-color': '#D4820A', 'fill-opacity': 0.06 }
        })
        mapInstance.addLayer({
          id: 'radius-line',
          type: 'line',
          source: 'radius',
          paint: { 'line-color': '#D4820A', 'line-width': 1.5, 'line-opacity': 0.4, 'line-dasharray': [4, 4] }
        })

        const userEl = document.createElement('div')
        userEl.style.cssText = `
          width: 18px; height: 18px; border-radius: 50%;
          background: #F0A500;
          border: 3px solid #fff;
          box-shadow: 0 0 16px rgba(240,165,0,0.7);
        `
        new (window as unknown as Window & { mapboxgl: { Marker: new (el: HTMLElement) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker(userEl)
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map)

        mapInstance.getCanvas().style.cursor = 'grab'
      })
    }

    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
      document.head.removeChild(link)
    }
  }, [userLocation])

  useEffect(() => {
    if (!mapRef.current || !userLocation || venues.length === 0) return

    venues.forEach((venue) => {
      const isAvailable = venue.availability_status === 'based_here' || venue.availability_status === 'open_to_travel'
      const el = document.createElement('div')
      el.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: ${isAvailable ? '#22c55e' : '#D4820A'};
        border: 2px solid ${isAvailable ? '#16a34a' : '#92400e'};
        cursor: pointer;
        box-shadow: 0 0 10px ${isAvailable ? 'rgba(34,197,94,0.5)' : 'rgba(212,130,10,0.5)'};
        transition: transform 0.15s;
      `
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.8)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
      el.addEventListener('click', () => { window.location.href = `/request-show/${venue.id}` })

      new (window as unknown as Window & { mapboxgl: { Marker: new (el: HTMLElement) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker(el)
        .setLngLat([venue.longitude, venue.latitude])
        .addTo(mapRef.current as any)
    })
  }, [userLocation, venues])

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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: '320px', flexShrink: 0, borderRight: '1px solid rgba(212,130,10,0.15)',
          overflowY: 'auto', background: '#1A1410',
        }}>
          <div style={{ padding: '24px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Venue Radar
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#F5F0E8', marginBottom: '4px' }}>
              100-Mile Radius
            </h2>
            {locationError && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#8C7B6B', marginBottom: '16px' }}>
                📍 Showing Tulsa, OK — allow location for your area
              </p>
            )}
          </div>

          <div style={{ padding: '0 24px 16px', display: 'flex', gap: '16px' }}>
            {[{ color: '#22c55e', label: 'Available Venue' }, { color: '#D4820A', label: 'Unavailable' }, { color: '#F0A500', label: 'You' }].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}80` }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '1px' }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div style={{ height: '1px', background: 'rgba(212,130,10,0.1)', margin: '0 24px 16px' }} />

          {venues.map((venue) => {
            const isAvailable = venue.availability_status === 'based_here' || venue.availability_status === 'open_to_travel'
            return (
              <a
                key={venue.id}
                href={`/request-show/${venue.id}`}
                style={{
                  display: 'block',
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(212,130,10,0.08)',
                  background: selectedVenue?.id === venue.id ? 'rgba(212,130,10,0.08)' : 'transparent',
                  transition: 'background 0.15s',
                  textDecoration: 'none'
                }}
                onMouseEnter={() => setSelectedVenue(venue)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#F5F0E8', fontWeight: 500 }}>{venue.name}</span>
                  <div
                    style={{
                      width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                      background: isAvailable ? '#22c55e' : '#D4820A',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '1px' }}>
                    {isAvailable ? 'AVAILABLE VENUE' : 'UNAVAILABLE'}
                  </span>
                  {venue.location_address && (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '1px' }}>
                      {venue.location_address.split(',')[0]}
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, background: '#1A1410',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#F0A500', marginBottom: '12px' }}>
                Finding venues...
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#8C7B6B', letterSpacing: '2px' }}>
                LOADING VENUE RADAR
              </div>
            </div>
          )}

          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </main>
  )
}
