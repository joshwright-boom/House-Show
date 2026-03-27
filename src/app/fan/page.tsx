'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
const TULSA_LOCATION = { lat: 36.1539, lng: -95.9928 }

interface AcceptedRequestRow {
  id: string
  musician_id: string
  venue_address?: string | null
  proposed_date?: string | null
  show_date?: string | null
  created_at?: string | null
  ticket_price?: number | null
  status: string
}

interface MusicianProfile {
  id: string
  name?: string | null
  photo_url?: string | null
  genre?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface FanShow {
  id: string
  musician_id: string
  musician_name: string
  musician_photo?: string | null
  genre: string
  venue_address: string
  show_date: string
  ticket_price: number
  latitude: number
  longitude: number
}

const parseCity = (address: string) => {
  if (!address) return ''
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 2]
  return address
}

const formatDate = (value: string) => {
  if (!value) return 'Date TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function FanDashboardPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [userLocation, setUserLocation] = useState(TULSA_LOCATION)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [allShows, setAllShows] = useState<FanShow[]>([])
  const [followedMusicians, setFollowedMusicians] = useState<string[]>([])
  const [savedShowIds, setSavedShowIds] = useState<string[]>([])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login?redirect=/fan'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (profile?.user_type !== 'fan') {
        window.location.href = '/dashboard'
        return
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      setFollowedMusicians(JSON.parse(localStorage.getItem('fan_following') || '[]'))
      setSavedShowIds(JSON.parse(localStorage.getItem('fan_saved_shows') || '[]'))
    } catch {
      setFollowedMusicians([])
      setSavedShowIds([])
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => setUserLocation(TULSA_LOCATION)
    )
  }, [])

  useEffect(() => {
    const loadShows = async () => {
      try {
        const { data: requests, error: requestsError } = await supabase
          .from('booking_requests')
          .select('id, musician_id, venue_address, proposed_date, show_date, created_at, ticket_price, status')
          .eq('status', 'accepted')
          .order('created_at', { ascending: true })

        if (requestsError) {
          console.error('Fan shows query error:', requestsError)
          setAllShows([])
          return
        }

        const acceptedRequests = (requests || []) as AcceptedRequestRow[]
        const musicianIds = Array.from(new Set(acceptedRequests.map((request) => request.musician_id).filter(Boolean)))

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, photo_url, genre, latitude, longitude')
          .in('id', musicianIds)

        if (profilesError) {
          console.error('Fan musician query error:', profilesError)
        }

        const profilesById = new Map<string, MusicianProfile>()
        ;(profiles || []).forEach((profile) => {
          profilesById.set(profile.id, profile as MusicianProfile)
        })

        const merged: FanShow[] = acceptedRequests
          .map((request) => {
            const musician = profilesById.get(request.musician_id)
            if (!musician?.latitude || !musician?.longitude) return null

            return {
              id: request.id,
              musician_id: request.musician_id,
              musician_name: musician.name || 'Musician',
              musician_photo: musician.photo_url || null,
              genre: musician.genre || 'Live Music',
              venue_address: request.venue_address || 'Venue TBD',
              show_date: request.show_date || request.proposed_date || request.created_at || '',
              ticket_price: Number(request.ticket_price || 0),
              latitude: musician.latitude,
              longitude: musician.longitude
            }
          })
          .filter(Boolean) as FanShow[]

        setAllShows(merged)
      } finally {
        setLoading(false)
      }
    }

    loadShows()
  }, [])

  const filteredShows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return allShows
    return allShows.filter((show) =>
      show.musician_name.toLowerCase().includes(term) ||
      show.genre.toLowerCase().includes(term) ||
      parseCity(show.venue_address).toLowerCase().includes(term)
    )
  }, [allShows, search])

  const followingShows = useMemo(
    () => filteredShows.filter((show) => followedMusicians.includes(show.musician_id)),
    [filteredShows, followedMusicians]
  )

  const savedShows = useMemo(
    () => filteredShows.filter((show) => savedShowIds.includes(show.id)),
    [filteredShows, savedShowIds]
  )

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
        mapboxgl: { accessToken: string; Map: new (config: object) => unknown }
      }).mapboxgl
      mapboxgl.accessToken = MAPBOX_TOKEN
      if (!mapContainer.current) return

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [userLocation.lng, userLocation.lat],
        zoom: 8,
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

    filteredShows.forEach((show) => {
      const pin = document.createElement('div')
      pin.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%;
        background: #D4820A;
        border: 2px solid #F5F0E8;
        box-shadow: 0 0 12px rgba(212,130,10,0.7);
      `
      const marker = new (window as any).mapboxgl.Marker(pin)
        .setLngLat([show.longitude, show.latitude])
        .addTo(map)
      markers.push(marker)
    })

    return () => markers.forEach((marker) => marker.remove())
  }, [filteredShows])

  const toggleFollow = (musicianId: string) => {
    const next = followedMusicians.includes(musicianId)
      ? followedMusicians.filter((id) => id !== musicianId)
      : [...followedMusicians, musicianId]
    setFollowedMusicians(next)
    localStorage.setItem('fan_following', JSON.stringify(next))
  }

  const toggleSaved = (showId: string) => {
    const next = savedShowIds.includes(showId)
      ? savedShowIds.filter((id) => id !== showId)
      : [...savedShowIds, showId]
    setSavedShowIds(next)
    localStorage.setItem('fan_saved_shows', JSON.stringify(next))
  }

  const renderShowCard = (show: FanShow) => (
    <article
      key={show.id}
      style={{
        border: '1px solid rgba(212,130,10,0.25)',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'rgba(44,34,24,0.45)'
      }}
    >
      <div style={{ height: '132px', background: 'linear-gradient(135deg, rgba(212,130,10,0.4), rgba(245,240,232,0.06))' }} />
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <img
            src={show.musician_photo || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=60'}
            alt={show.musician_name}
            style={{ width: '40px', height: '40px', borderRadius: '999px', objectFit: 'cover', border: '1px solid rgba(212,130,10,0.35)' }}
          />
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem' }}>{show.musician_name}</div>
            <div style={{ color: '#8C7B6B', fontSize: '0.83rem' }}>{show.genre}</div>
          </div>
        </div>
        <p style={{ color: '#8C7B6B', margin: '0 0 6px' }}>{formatDate(show.show_date)}</p>
        <p style={{ color: '#8C7B6B', margin: '0 0 6px' }}>{parseCity(show.venue_address)}</p>
        <p style={{ color: '#F0A500', margin: '0 0 12px', fontWeight: 700 }}>${show.ticket_price.toFixed(2)}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={`/shows/${show.id}`}
            style={{
              background: 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410',
              textDecoration: 'none',
              borderRadius: '8px',
              padding: '9px 12px',
              fontWeight: 700,
              fontSize: '0.88rem'
            }}
          >
            Get Tickets
          </a>
          <button
            onClick={() => toggleFollow(show.musician_id)}
            style={{
              background: 'transparent',
              color: '#F5F0E8',
              border: '1px solid rgba(212,130,10,0.25)',
              borderRadius: '8px',
              padding: '9px 12px',
              fontWeight: 600,
              fontSize: '0.83rem',
              cursor: 'pointer'
            }}
          >
            {followedMusicians.includes(show.musician_id) ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => toggleSaved(show.id)}
            style={{
              background: 'transparent',
              color: '#F5F0E8',
              border: '1px solid rgba(212,130,10,0.25)',
              borderRadius: '8px',
              padding: '9px 12px',
              fontWeight: 600,
              fontSize: '0.83rem',
              cursor: 'pointer'
            }}
          >
            {savedShowIds.includes(show.id) ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </article>
  )

  return (
    <main style={{ padding: '22px 16px 40px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <section style={{ marginBottom: '18px' }}>
          <h1 style={{ margin: '0 0 10px', fontFamily: "'Playfair Display', serif", fontSize: '2.4rem' }}>
            Fan Dashboard
          </h1>
          <p style={{ color: '#8C7B6B', margin: 0 }}>
            Discover nearby house shows, follow your favorite artists, and save events you don&apos;t want to miss.
          </p>
        </section>

        <section
          style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '14px',
            background: 'rgba(44,34,24,0.35)'
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search artist, genre, or city..."
            style={{
              width: '100%',
              background: 'rgba(26,20,16,0.85)',
              border: '1px solid rgba(212,130,10,0.25)',
              borderRadius: '10px',
              color: '#F5F0E8',
              padding: '12px 14px',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
        </section>

        <section
          style={{
            width: '100%',
            height: '420px',
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '14px',
            overflow: 'hidden',
            marginBottom: '20px'
          }}
          ref={mapContainer}
        />

        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: '0 0 12px', fontFamily: "'Playfair Display', serif", fontSize: '1.8rem' }}>Upcoming Shows</h2>
          {loading ? (
            <p style={{ color: '#8C7B6B' }}>Loading nearby shows...</p>
          ) : filteredShows.length === 0 ? (
            <p style={{ color: '#8C7B6B' }}>No matching shows yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {filteredShows.map(renderShowCard)}
            </div>
          )}
        </section>

        <section id="following" style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: '0 0 12px', fontFamily: "'Playfair Display', serif", fontSize: '1.7rem' }}>Following</h2>
          {followingShows.length === 0 ? (
            <p style={{ color: '#8C7B6B' }}>Follow artists to see their upcoming shows here.</p>
          ) : (
            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {followingShows.map(renderShowCard)}
            </div>
          )}
        </section>

        <section id="saved">
          <h2 style={{ margin: '0 0 12px', fontFamily: "'Playfair Display', serif", fontSize: '1.7rem' }}>Saved Shows</h2>
          {savedShows.length === 0 ? (
            <p style={{ color: '#8C7B6B' }}>Save shows to keep them handy for later.</p>
          ) : (
            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {savedShows.map(renderShowCard)}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
