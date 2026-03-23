'use client'

import { useEffect, useRef, useState } from 'react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// Sample venues to show on the map
const SAMPLE_VENUES = [
  { id: 1, name: 'The Backyard Sessions', lat: 0, lng: 0, offsetLat: 0.18, offsetLng: -0.22, capacity: 40, type: 'Backyard', status: 'available', host: 'Marcus T.' },
  { id: 2, name: 'Loft on 5th', lat: 0, lng: 0, offsetLat: -0.31, offsetLng: 0.41, capacity: 25, type: 'Loft', status: 'booked', host: 'Sarah K.' },
  { id: 3, name: 'The Living Room Stage', lat: 0, lng: 0, offsetLat: 0.52, offsetLng: 0.19, capacity: 20, type: 'Living Room', status: 'available', host: 'Devon R.' },
  { id: 4, name: 'Rooftop Collective', lat: 0, lng: 0, offsetLat: -0.44, offsetLng: -0.38, capacity: 60, type: 'Rooftop', status: 'available', host: 'Priya M.' },
  { id: 5, name: 'Garden House', lat: 0, lng: 0, offsetLat: 0.71, offsetLng: -0.55, capacity: 35, type: 'Garden', status: 'booked', host: 'James W.' },
  { id: 6, name: 'The Warehouse Spot', lat: 0, lng: 0, offsetLat: -0.62, offsetLng: 0.68, capacity: 80, type: 'Warehouse', status: 'available', host: 'Nadia C.' },
]

export default function RadarPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<typeof SAMPLE_VENUES[0] | null>(null)
  const [loading, setLoading] = useState(true)
  const [locationError, setLocationError] = useState(false)
  const [venues, setVenues] = useState(SAMPLE_VENUES)

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

    // Place venues relative to user location
    const placed = SAMPLE_VENUES.map(v => ({
      ...v,
      lat: userLocation.lat + v.offsetLat,
      lng: userLocation.lng + v.offsetLng,
    }))
    setVenues(placed)

    // Dynamically load Mapbox GL JS
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

        // Add 100-mile radius circle
        const radiusKm = 160.934
        const points = 64
        const coords = []
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

        // Add venue markers
        placed.forEach((venue) => {
          const el = document.createElement('div')
          el.style.cssText = `
            width: 14px; height: 14px; border-radius: 50%;
            background: ${venue.status === 'available' ? '#22c55e' : '#D4820A'};
            border: 2px solid ${venue.status === 'available' ? '#16a34a' : '#92400e'};
            cursor: pointer;
            box-shadow: 0 0 10px ${venue.status === 'available' ? 'rgba(34,197,94,0.5)' : 'rgba(212,130,10,0.5)'};
            transition: transform 0.15s;
          `
          el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.8)' })
          el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
          el.addEventListener('click', () => setSelectedVenue(venue))

new (window as unknown as Window & { mapboxgl: { Marker: new (el: HTMLElement) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } } } }).mapboxgl.Marker(el)
            .setLngLat([venue.lng, venue.lat])
            .addTo(map)
        })

        // User location dot
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

  const availableCount = venues.filter(v => v.status === 'available').length

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
              {availableCount} VENUES AVAILABLE
            </span>
          </div>
          <a href="/dashboard" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>Dashboard</a>
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* SIDEBAR */}
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

          {/* Legend */}
          <div style={{ padding: '0 24px 16px', display: 'flex', gap: '16px' }}>
            {[{ color: '#22c55e', label: 'Available' }, { color: '#D4820A', label: 'Booked' }, { color: '#F0A500', label: 'You' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}80` }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '1px' }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div style={{ height: '1px', background: 'rgba(212,130,10,0.1)', margin: '0 24px 16px' }} />

          {/* Venue list */}
          {venues.map((venue) => (
            <div
              key={venue.id}
              onClick={() => setSelectedVenue(selectedVenue?.id === venue.id ? null : venue)}
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(212,130,10,0.08)',
                cursor: 'pointer',
                background: selectedVenue?.id === venue.id ? 'rgba(212,130,10,0.08)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#F5F0E8', fontWeight: 500 }}>{venue.name}</span>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                  background: venue.status === 'available' ? '#22c55e' : '#D4820A',
                }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '1px' }}>{venue.type.toUpperCase()}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '1px' }}>{venue.capacity} CAP</span>
              </div>
            </div>
          ))}
        </div>

        {/* MAP */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, background: '#1A1410',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#F0A500', marginBottom: '12px' }}>
                Scanning your area...
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#8C7B6B', letterSpacing: '2px' }}>
                LOADING VENUE RADAR
              </div>
            </div>
          )}

          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {/* Selected venue card */}
          {selectedVenue && (
            <div style={{
              position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
              background: '#2C2218', border: '1px solid rgba(212,130,10,0.3)',
              borderRadius: '8px', padding: '20px 28px', minWidth: '300px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#F5F0E8', marginBottom: '4px' }}>{selectedVenue.name}</h3>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#8C7B6B', letterSpacing: '2px' }}>
                    {selectedVenue.type.toUpperCase()} · {selectedVenue.capacity} CAPACITY
                  </span>
                </div>
                <div style={{
                  background: selectedVenue.status === 'available' ? 'rgba(34,197,94,0.15)' : 'rgba(212,130,10,0.15)',
                  border: `1px solid ${selectedVenue.status === 'available' ? 'rgba(34,197,94,0.4)' : 'rgba(212,130,10,0.4)'}`,
                  color: selectedVenue.status === 'available' ? '#22c55e' : '#D4820A',
                  padding: '4px 10px', borderRadius: '4px',
                  fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', letterSpacing: '1px',
                }}>
                  {selectedVenue.status.toUpperCase()}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>
                  Hosted by {selectedVenue.host}
                </span>
                {selectedVenue.status === 'available' && (
                  <a href="/auth/register" style={{
                    background: 'linear-gradient(135deg, #D4820A, #F0A500)', color: '#1A1410',
                    padding: '8px 18px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", display: 'inline-block',
                  }}>Request Booking</a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
