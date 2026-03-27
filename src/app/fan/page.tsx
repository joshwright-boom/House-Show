'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
const OKLAHOMA_DEFAULT = { lat: 36.5, lng: -95.8939 }

interface ShowRow {
  id: string
  artist_user_id?: string | null
  artist_name?: string | null
  venue_name?: string | null
  venue_address?: string | null
  show_date?: string | null
  created_at?: string | null
  ticket_price?: number | null
  status?: string | null
}

interface MusicianProfile {
  id: string
  name?: string | null
  photo_url?: string | null
  genre?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface SearchMusician {
  id: string
  name: string
  latitude: number
  longitude: number
  photo_url?: string | null
}

interface MapProfile {
  id: string
  name?: string | null
  user_type: 'musician' | 'host'
  latitude: number
  longitude: number
}

interface FanShow {
  id: string
  artist_user_id: string
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
  const selectedMarkerRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchMusician[]>([])
  const [selectedMusician, setSelectedMusician] = useState<SearchMusician | null>(null)
  const [allShows, setAllShows] = useState<FanShow[]>([])
  const [mapProfiles, setMapProfiles] = useState<MapProfile[]>([])
  const [followedMusicians, setFollowedMusicians] = useState<string[]>([])
  const [savedShowIds, setSavedShowIds] = useState<string[]>([])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login?redirect=/fan'
        return
      }

      setCurrentUserId(user.id)

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
      setSavedShowIds(JSON.parse(localStorage.getItem('fan_saved_shows') || '[]'))
    } catch {
      setSavedShowIds([])
    }
  }, [])

  useEffect(() => {
    const term = search.trim()
    if (!term) {
      setSearchResults([])
      return
    }

    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, latitude, longitude, photo_url')
        .eq('user_type', 'musician')
        .ilike('name', `%${term}%`)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(8)

      if (error) {
        console.error('Fan search query error:', error)
        setSearchResults([])
        return
      }

      const results = (data || [])
        .map((row) => ({
          id: row.id,
          name: row.name || 'Musician',
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          photo_url: row.photo_url || null
        }))
        .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))

      setSearchResults(results)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    const loadShows = async () => {
      try {
        const { data: shows, error: showsError } = await supabase
          .from('shows')
          .select('id, artist_user_id, artist_name, venue_name, venue_address, show_date, created_at, ticket_price, status')
          .eq('status', 'on_sale')
          .order('show_date', { ascending: true })

        if (showsError) {
          console.error('Fan shows query error:', showsError)
          setAllShows([])
          return
        }

        const publishedShows = (shows || []) as ShowRow[]
        const musicianIds = Array.from(new Set(publishedShows.map((show) => show.artist_user_id).filter(Boolean)))

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

        const merged: FanShow[] = publishedShows
          .map((show) => {
            const musician = show.artist_user_id ? profilesById.get(show.artist_user_id) : null
            return {
              id: show.id,
              artist_user_id: show.artist_user_id || '',
              musician_name: musician?.name || show.artist_name || 'Musician',
              musician_photo: musician?.photo_url || null,
              genre: musician?.genre || 'Live Music',
              venue_address: show.venue_name || show.venue_address || 'Venue TBD',
              show_date: show.show_date || show.created_at || '',
              ticket_price: Number(show.ticket_price || 0),
              latitude: Number(musician?.latitude ?? NaN),
              longitude: Number(musician?.longitude ?? NaN)
            }
          })
          .filter((show) => Boolean(show.id)) as FanShow[]

        setAllShows(merged)
      } finally {
        setLoading(false)
      }
    }

    loadShows()
  }, [])

  useEffect(() => {
    const loadFollows = async () => {
      if (!currentUserId) return

      const { data, error } = await supabase
        .from('follows')
        .select('musician_id')
        .eq('fan_id', currentUserId)

      if (error) {
        console.error('Fan follows query error:', error)
        setFollowedMusicians([])
        return
      }

      setFollowedMusicians((data || []).map((row) => row.musician_id).filter(Boolean))
    }

    loadFollows()
  }, [currentUserId])

  useEffect(() => {
    const loadMapProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, user_type, latitude, longitude')
        .in('user_type', ['musician', 'host'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error) {
        console.error('Fan map profiles query error:', error)
        setMapProfiles([])
        return
      }

      const profiles = (data || [])
        .map((profile) => ({
          id: profile.id,
          name: profile.name || (profile.user_type === 'host' ? 'Host' : 'Musician'),
          user_type: profile.user_type,
          latitude: Number(profile.latitude),
          longitude: Number(profile.longitude)
        }))
        .filter((profile) =>
          (profile.user_type === 'musician' || profile.user_type === 'host') &&
          Number.isFinite(profile.latitude) &&
          Number.isFinite(profile.longitude)
        ) as MapProfile[]

      setMapProfiles(profiles)
    }

    loadMapProfiles()
  }, [])

  const filteredShows = useMemo(() => allShows, [allShows])

  const followingShows = useMemo(
    () => filteredShows.filter((show) => followedMusicians.includes(show.artist_user_id)),
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
        center: [OKLAHOMA_DEFAULT.lng, OKLAHOMA_DEFAULT.lat],
        zoom: 7,
      })
      mapRef.current = map
    }

    document.head.appendChild(script)
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
      if (link.parentNode) link.parentNode.removeChild(link)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current as any
    const markers: any[] = []

    mapProfiles.forEach((profile) => {
      const pin = document.createElement('div')
      pin.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%;
        background: ${profile.user_type === 'host' ? '#F5F0E8' : '#D4820A'};
        border: 2px solid ${profile.user_type === 'host' ? '#D9D2C7' : '#F5F0E8'};
        box-shadow: 0 0 12px ${profile.user_type === 'host' ? 'rgba(245,240,232,0.7)' : 'rgba(212,130,10,0.7)'};
        cursor: pointer;
      `
      const marker = new (window as any).mapboxgl.Marker(pin)
        .setLngLat([profile.longitude, profile.latitude])
        .setPopup(
          new (window as any).mapboxgl.Popup({ offset: 12 }).setHTML(`
            <div style="color:#1A1410;padding:4px 2px;">
              <div style="font-weight:700;margin-bottom:6px;">${profile.name || (profile.user_type === 'host' ? 'Host' : 'Musician')}</div>
              <a href="/${profile.user_type === 'host' ? 'host' : 'artist'}/${profile.id}" style="color:#D4820A;text-decoration:none;font-weight:600;">View Profile</a>
            </div>
          `)
        )
        .addTo(map)
      markers.push(marker)
    })

    return () => markers.forEach((marker) => marker.remove())
  }, [mapProfiles])

  useEffect(() => {
    if (!mapRef.current || !selectedMusician || !(window as any).mapboxgl) return

    const map = mapRef.current as any
    selectedMarkerRef.current?.remove?.()

    const pin = document.createElement('div')
    pin.style.cssText = `
      width: 20px; height: 20px; border-radius: 50%;
      background: #F0A500;
      border: 3px solid #F5F0E8;
      box-shadow: 0 0 16px rgba(240,165,0,0.8);
    `

    selectedMarkerRef.current = new (window as any).mapboxgl.Marker(pin)
      .setLngLat([selectedMusician.longitude, selectedMusician.latitude])
      .addTo(map)

    return () => {
      selectedMarkerRef.current?.remove?.()
      selectedMarkerRef.current = null
    }
  }, [selectedMusician])

  const toggleFollow = async (musicianId: string) => {
    if (!currentUserId || !musicianId) return

    const isFollowing = followedMusicians.includes(musicianId)

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('fan_id', currentUserId)
        .eq('musician_id', musicianId)

      if (error) {
        console.error('Unfollow musician error:', error)
        return
      }

      setFollowedMusicians((prev) => prev.filter((id) => id !== musicianId))
      return
    }

    const { error } = await supabase
      .from('follows')
      .upsert(
        {
          fan_id: currentUserId,
          musician_id: musicianId
        },
        { onConflict: 'fan_id,musician_id' }
      )

    if (error) {
      console.error('Follow musician error:', error)
      return
    }

    setFollowedMusicians((prev) => prev.includes(musicianId) ? prev : [...prev, musicianId])
  }

  const toggleSaved = (showId: string) => {
    const next = savedShowIds.includes(showId)
      ? savedShowIds.filter((id) => id !== showId)
      : [...savedShowIds, showId]
    setSavedShowIds(next)
    localStorage.setItem('fan_saved_shows', JSON.stringify(next))
  }

  const flyToMusician = (musician: SearchMusician) => {
    const map = mapRef.current as any
    if (!map) return

    map.flyTo({
      center: [musician.longitude, musician.latitude],
      zoom: 10,
      essential: true
    })

    new (window as any).mapboxgl.Popup({ offset: 12 })
      .setLngLat([musician.longitude, musician.latitude])
      .setText(musician.name)
      .addTo(map)

    setSelectedMusician(musician)
    setSearch(musician.name)
    setSearchResults([])
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
            {show.artist_user_id ? (
              <a
                href={`/artist/${show.artist_user_id}`}
                style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#F5F0E8', textDecoration: 'none' }}
              >
                {show.musician_name}
              </a>
            ) : (
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem' }}>{show.musician_name}</div>
            )}
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
            onClick={() => toggleFollow(show.artist_user_id)}
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
            {followedMusicians.includes(show.artist_user_id) ? 'Following' : 'Follow'}
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
            background: 'rgba(44,34,24,0.35)',
            position: 'relative'
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search musicians by name..."
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
          {searchResults.length > 0 && (
            <div
              style={{
                marginTop: '8px',
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '10px',
                background: 'rgba(26,20,16,0.95)',
                overflow: 'hidden'
              }}
            >
              {searchResults.map((musician) => (
                <button
                  key={musician.id}
                  type="button"
                  onClick={() => flyToMusician(musician)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(212,130,10,0.15)',
                    color: '#F5F0E8',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '0.92rem'
                  }}
                >
                  {musician.name}
                </button>
              ))}
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
