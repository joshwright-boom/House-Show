'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
const TULSA_LOCATION = { lat: 36.1539, lng: -95.9928 }

interface MusicianPin {
  id: string
  name: string
  latitude: number
  longitude: number
}

interface ShowRow {
  id: string
  artist_name?: string | null
  venue_name?: string | null
  show_date?: string | null
  ticket_price?: number | null
  status?: string | null
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Date TBD'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function ShowsPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [userLocation, setUserLocation] = useState(TULSA_LOCATION)
  const [musicians, setMusicians] = useState<MusicianPin[]>([])
  const [shows, setShows] = useState<ShowRow[]>([])
  const [loadingShows, setLoadingShows] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => setUserLocation(TULSA_LOCATION)
    )
  }, [])

  useEffect(() => {
    const loadMusicianPins = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, latitude, longitude')
        .eq('user_type', 'musician')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error) {
        console.error('Musician pin query error:', error)
        setMusicians([])
        return
      }

      const mapped = (data || [])
        .map((profile) => ({
          id: profile.id,
          name: profile.name || 'Musician',
          latitude: Number(profile.latitude),
          longitude: Number(profile.longitude)
        }))
        .filter((profile) => Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude))

      setMusicians(mapped)
    }

    loadMusicianPins()
  }, [])

  useEffect(() => {
    const loadOnSaleShows = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('id, artist_name, venue_name, show_date, ticket_price, status')
          .eq('status', 'on_sale')
          .order('show_date', { ascending: true })

        if (error) {
          console.error('Shows query error:', error)
          setShows([])
          return
        }

        setShows((data || []) as ShowRow[])
      } finally {
        setLoadingShows(false)
      }
    }

    loadOnSaleShows()
  }, [])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !MAPBOX_TOKEN) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'
    script.onload = () => {
      const mapboxgl = (window as unknown as Window & {
        mapboxgl: {
          accessToken: string
          Map: new (config: object) => unknown
        }
      }).mapboxgl

      mapboxgl.accessToken = MAPBOX_TOKEN
      if (!mapContainer.current) return

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [userLocation.lng, userLocation.lat],
        zoom: 8
      })

      mapRef.current = map
    }

    document.head.appendChild(script)
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
      if (link.parentNode) link.parentNode.removeChild(link)
    }
  }, [userLocation])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current as any
    const markers: any[] = []

    const userPin = document.createElement('div')
    userPin.style.cssText = `
      width: 18px; height: 18px; border-radius: 50%;
      background: #F5F0E8;
      border: 3px solid #D4820A;
      box-shadow: 0 0 14px rgba(212,130,10,0.6);
    `
    const userMarker = new (window as any).mapboxgl.Marker(userPin)
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map)
    markers.push(userMarker)

    musicians.forEach((musician) => {
      const pin = document.createElement('div')
      pin.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: #D4820A;
        border: 2px solid #F5F0E8;
        box-shadow: 0 0 10px rgba(212,130,10,0.75);
      `

      const popup = new (window as any).mapboxgl.Popup({ offset: 16 }).setText(musician.name)
      const marker = new (window as any).mapboxgl.Marker(pin)
        .setLngLat([musician.longitude, musician.latitude])
        .setPopup(popup)
        .addTo(map)

      markers.push(marker)
    })

    return () => {
      markers.forEach((marker) => marker.remove())
    }
  }, [musicians, userLocation])

  const sortedShows = useMemo(() => shows, [shows])

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '30px 20px' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <section style={{ marginBottom: '16px' }}>
          <a href="/" style={{ color: '#D4820A', textDecoration: 'none', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>
            HouseShow
          </a>
          <h1 style={{ marginTop: '14px', marginBottom: '8px', fontFamily: "'Playfair Display', serif", fontSize: '2.5rem' }}>
            Discover Live Shows
          </h1>
          <p style={{ color: '#8C7B6B', margin: 0 }}>
            Explore musicians near you and grab tickets to upcoming house shows.
          </p>
        </section>

        <section style={{ marginBottom: '28px' }}>
          <div
            ref={mapContainer}
            style={{
              width: '100%',
              height: '460px',
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '14px',
              overflow: 'hidden'
            }}
          />
          <p style={{ color: '#8C7B6B', fontSize: '0.84rem', marginTop: '8px' }}>
            Tap a pin to see the musician name.
          </p>
        </section>

        <section>
          <h2 style={{ marginBottom: '14px', fontFamily: "'Playfair Display', serif", fontSize: '2rem' }}>
            Show Bulletin Board
          </h2>
          {loadingShows ? (
            <p style={{ color: '#8C7B6B' }}>Loading shows...</p>
          ) : sortedShows.length === 0 ? (
            <div
              style={{
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '12px',
                padding: '22px',
                color: '#8C7B6B',
                background: 'rgba(44,34,24,0.24)'
              }}
            >
              No upcoming shows yet — check back soon.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {sortedShows.map((show) => (
                <article
                  key={show.id}
                  style={{
                    border: '1px solid rgba(212,130,10,0.2)',
                    borderRadius: '12px',
                    padding: '16px',
                    background: 'rgba(44,34,24,0.35)'
                  }}
                >
                  <h3 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display', serif", fontSize: '1.45rem' }}>
                    {show.artist_name || 'Artist TBA'}
                  </h3>
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>
                    Venue: {show.venue_name || 'Venue TBD'}
                  </p>
                  <p style={{ margin: '0 0 6px', color: '#8C7B6B' }}>
                    Date: {formatDate(show.show_date)}
                  </p>
                  <p style={{ margin: '0 0 12px', color: '#8C7B6B' }}>
                    Ticket Price: ${Number(show.ticket_price || 0).toFixed(2)}
                  </p>
                  <a
                    href={`/shows/${show.id}`}
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                      color: '#1A1410',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontWeight: 700
                    }}
                  >
                    Get Tickets
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
