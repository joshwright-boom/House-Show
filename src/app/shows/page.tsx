'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
const TULSA_LOCATION = { lat: 36.1539, lng: -95.9928 }
const HUNDRED_MILES_IN_KM = 160.934

interface AcceptedRequestRow {
  id: string
  musician_id: string
  venue_address?: string | null
  proposed_date?: string | null
  show_date?: string | null
  date?: string | null
  created_at?: string | null
  ticket_price?: number | null
  musician_revenue_percent?: number | null
  host_revenue_percent?: number | null
  musician_split?: number | null
  host_split?: number | null
  status: string
}

interface MusicianProfile {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
}

interface ShowCard {
  id: string
  musician_id: string
  musician_name: string
  venue_address: string
  proposed_date?: string | null
  show_date?: string | null
  created_at?: string | null
  ticket_price: number
  musician_revenue_percent: number
  host_revenue_percent: number
  latitude: number
  longitude: number
}

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Date TBD'
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const getGeneralLocation = (address: string) => {
  if (!address) return 'Location TBD'
  const cityStateMatch = address.match(/([A-Za-z.\s]+),\s*([A-Z]{2})(?:\s+\d{5})?$/)
  if (cityStateMatch) {
    return `${cityStateMatch[1].trim()}, ${cityStateMatch[2].trim()}`
  }
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const city = parts[parts.length - 2]
    const state = (parts[parts.length - 1].match(/[A-Z]{2}/)?.[0] || parts[parts.length - 1]).trim()
    return `${city}, ${state}`
  }
  return address
}

const getDisplayDateLabel = (show: ShowCard) => {
  const actualDate = show.show_date || show.proposed_date
  if (actualDate) return formatDate(actualDate)
  if (show.created_at) return `${formatDate(show.created_at)} (Date TBD)`
  return 'Date TBD'
}

export default function ShowsPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [hasPreciseLocation, setHasPreciseLocation] = useState(true)
  const [loading, setLoading] = useState(true)
  const [allShows, setAllShows] = useState<ShowCard[]>([])
  const [distanceFilter, setDistanceFilter] = useState<'25' | '50' | '100' | 'all'>('100')

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(Boolean(data.session))
    }

    checkSession()
  }, [])

  const showsNearby = useMemo(() => {
    if (!userLocation) return allShows
    if (!hasPreciseLocation || distanceFilter === 'all') return allShows
    const maxKm = distanceFilter === '25' ? 40.234 : distanceFilter === '50' ? 80.467 : HUNDRED_MILES_IN_KM
    return allShows.filter((show) => {
      const distance = calculateDistanceKm(userLocation.lat, userLocation.lng, show.latitude, show.longitude)
      return distance <= maxKm
    })
  }, [allShows, userLocation, hasPreciseLocation, distanceFilter])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setHasPreciseLocation(true)
        },
        () => {
          setUserLocation(TULSA_LOCATION)
          setLocationError(true)
          setHasPreciseLocation(false)
        }
      )
    } else {
      setUserLocation(TULSA_LOCATION)
      setLocationError(true)
      setHasPreciseLocation(false)
    }
  }, [])

  useEffect(() => {
    const loadAcceptedShows = async () => {
      try {
        const { data: requests, error: requestsError } = await supabase
          .from('booking_requests')
          .select('*')
          .eq('status', 'accepted')
          .order('created_at', { ascending: true })

        if (requestsError) {
          console.error('Accepted shows query error:', requestsError)
          setAllShows([])
          return
        }

        const acceptedRequests = (requests || []) as AcceptedRequestRow[]
        if (acceptedRequests.length === 0) {
          setAllShows([])
          return
        }

        const musicianIds = Array.from(new Set(acceptedRequests.map((request) => request.musician_id).filter(Boolean)))
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, latitude, longitude')
          .in('id', musicianIds)

        if (profilesError) {
          console.error('Musician profile query error:', profilesError)
        }

        const profilesById = new Map<string, MusicianProfile>()
        ;(profiles || []).forEach((profile) => {
          profilesById.set(profile.id, profile as MusicianProfile)
        })

        const mergedShows: ShowCard[] = acceptedRequests
          .map((request) => {
            const profile = profilesById.get(request.musician_id)
            if (!profile?.latitude || !profile?.longitude) return null

            return {
              id: request.id,
              musician_id: request.musician_id,
              musician_name: profile.name || 'Musician',
              venue_address: request.venue_address || 'Venue TBD',
              proposed_date: request.proposed_date || null,
              show_date: request.show_date || request.date || null,
              created_at: request.created_at || null,
              ticket_price: Number(request.ticket_price || 0),
              musician_revenue_percent: Number(request.musician_revenue_percent ?? request.musician_split ?? 0),
              host_revenue_percent: Number(request.host_revenue_percent ?? request.host_split ?? 0),
              latitude: profile.latitude,
              longitude: profile.longitude
            }
          })
          .filter(Boolean) as ShowCard[]

        setAllShows(mergedShows)
      } catch (error) {
        console.error('Error loading accepted shows:', error)
        setAllShows([])
      } finally {
        setLoading(false)
      }
    }

    loadAcceptedShows()
  }, [])

  useEffect(() => {
    if (!userLocation || !mapContainer.current || mapRef.current || !MAPBOX_TOKEN) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'
    script.onload = () => {
      const mapboxgl = (window as unknown as Window & {
        mapboxgl: { accessToken: string; Map: new (config: object) => unknown }
      }).mapboxgl
      mapboxgl.accessToken = MAPBOX_TOKEN
      if (!mapContainer.current) return

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [userLocation.lng, userLocation.lat],
        zoom: 9,
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
    if (!mapRef.current || !userLocation) return

    const map = mapRef.current as any
    const markers: any[] = []

    // User location marker
    const userEl = document.createElement('div')
    userEl.style.cssText = `
      width: 18px; height: 18px; border-radius: 50%;
      background: #F5F0E8;
      border: 3px solid #D4820A;
      box-shadow: 0 0 14px rgba(212,130,10,0.6);
    `
    const userMarker = new (window as any).mapboxgl.Marker(userEl)
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map)
    markers.push(userMarker)

    showsNearby.forEach((show) => {
      const pin = document.createElement('div')
      pin.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: #D4820A;
        border: 2px solid #F5F0E8;
        box-shadow: 0 0 12px rgba(212,130,10,0.7);
      `
      const marker = new (window as any).mapboxgl.Marker(pin)
        .setLngLat([show.longitude, show.latitude])
        .addTo(map)
      markers.push(marker)
    })

    return () => {
      markers.forEach((marker) => marker.remove())
    }
  }, [showsNearby, userLocation])

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '32px 20px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <a href="/" style={{ color: '#D4820A', textDecoration: 'none', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>
            HouseShow
          </a>
          <h1 style={{ marginTop: '14px', marginBottom: '10px', fontFamily: "'Playfair Display', serif", fontSize: '2.4rem' }}>
            Upcoming Shows Near You
          </h1>
          <p style={{ color: '#8C7B6B' }}>
            Browse accepted shows within 100 miles and follow artists you love.
          </p>
          {locationError && (
            <p style={{ color: '#8C7B6B', marginTop: '8px' }}>
              📍 Location unavailable, showing results near Tulsa, OK.
            </p>
          )}
        </div>

        <div
          ref={mapContainer}
          style={{
            width: '100%',
            height: '460px',
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '14px',
            marginBottom: '28px',
            overflow: 'hidden'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ color: '#8C7B6B', fontSize: '0.9rem' }}>Distance:</span>
          {(['25', '50', '100', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDistanceFilter(range)}
              style={{
                border: distanceFilter === range ? '1px solid #D4820A' : '1px solid rgba(212,130,10,0.25)',
                background: distanceFilter === range ? 'rgba(212,130,10,0.2)' : 'transparent',
                color: distanceFilter === range ? '#F5F0E8' : '#8C7B6B',
                borderRadius: '999px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '0.82rem'
              }}
            >
              {range === 'all' ? 'All' : `${range} miles`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: '#8C7B6B' }}>Loading shows...</div>
        ) : showsNearby.length === 0 ? (
          <div style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '12px',
            padding: '24px',
            color: '#8C7B6B',
            background: 'rgba(44,34,24,0.2)'
          }}>
            No shows near you yet — check back soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px', maxHeight: '560px', overflowY: 'auto', paddingRight: '6px' }}>
            {showsNearby.map((show) => (
              <article
                key={show.id}
                style={{
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '12px',
                  padding: '18px',
                  background: 'rgba(44,34,24,0.35)'
                }}
              >
                <h2 style={{ marginBottom: '8px', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#F5F0E8' }}>
                  {show.musician_name}
                </h2>
                <p style={{ marginBottom: '6px', color: '#8C7B6B' }}>Location: {getGeneralLocation(show.venue_address)}</p>
                <p style={{ marginBottom: '6px', color: '#8C7B6B' }}>Date: {getDisplayDateLabel(show)}</p>
                <p style={{ marginBottom: '6px', color: '#8C7B6B' }}>Ticket Price: ${show.ticket_price}</p>
                <p style={{ marginBottom: '6px', color: '#8C7B6B' }}>
                  Musician Revenue: {show.musician_revenue_percent}% • Host Revenue: {show.host_revenue_percent}%
                </p>
                <a
                  href={
                    isLoggedIn
                      ? `/shows/${show.id}`
                      : `/auth/register?redirect=${encodeURIComponent(`/shows/${show.id}`)}`
                  }
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
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
                <p style={{ marginTop: '10px', marginBottom: 0, color: '#8C7B6B', fontSize: '0.82rem' }}>
                  Free to browse — account required to purchase tickets.
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
