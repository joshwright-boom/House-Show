'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ShowRecord {
  id: string
  show_name: string
  artist_name: string
  venue_name: string
  full_address?: string | null
  neighborhood?: string | null
  city?: string | null
  date: string
  time: string
  ticket_price: number
  max_capacity: number
  show_description: string
  host_id: string
  artist_user_id?: string | null
  spotify_url?: string | null
  youtube_url?: string | null
  soundcloud_url?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  status: string
}

const getShowDateValue = (show: Record<string, any>) =>
  show.date || show.show_date || show.event_date || show.scheduled_date || ''

const getShowCapacity = (show: Record<string, any>) =>
  show.max_capacity || show.capacity || 0

const getShowNameValue = (show: Record<string, any>) =>
  show.show_name || show.artist_name || show.title || 'HouseShow Event'

const getShowTimeValue = (show: Record<string, any>) =>
  show.show_time || show.time || 'TBD'

const getShowHostId = (show: Record<string, any>) =>
  show.host_user_id || show.host_id || ''

const getVenueNameValue = (show: Record<string, any>) =>
  show.venue_name || show.location_name || show.space_name || 'Venue'

const getPublicAreaValue = (show: Record<string, any>) =>
  show.neighborhood || show.city || show.venue_address || show.location_address || ''

const formatPublicArea = (neighborhood?: string | null, city?: string | null) => {
  if (neighborhood?.trim()) return `${neighborhood.trim()} area`
  if (city?.trim()) return city.trim()
  return ''
}

const formatTime = (value: string) => {
  if (!value || value === 'TBD') return 'TBD'
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value

  const rawHour = Number(match[1])
  const minutes = match[2]
  const period = rawHour >= 12 ? 'PM' : 'AM'
  const hour12 = rawHour % 12 || 12
  return `${hour12}:${minutes} ${period}`
}

const getArtistSocialLinks = (show: ShowRecord | null) => {
  if (!show) return []

  const links = []
  if (show.spotify_url) links.push({ name: 'Spotify', url: show.spotify_url, icon: '🎵' })
  if (show.youtube_url) links.push({ name: 'YouTube', url: show.youtube_url, icon: '🎬' })
  if (show.soundcloud_url) links.push({ name: 'SoundCloud', url: show.soundcloud_url, icon: '🎧' })
  if (show.facebook_url) links.push({ name: 'Facebook', url: show.facebook_url, icon: '📘' })
  if (show.instagram_url) links.push({ name: 'Instagram', url: show.instagram_url, icon: '📷' })
  return links
}

export default function ShowPage({ params }: { params: { id: string } }) {
  const [show, setShow] = useState<ShowRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isFanUser, setIsFanUser] = useState(false)
  const [isFollowingArtist, setIsFollowingArtist] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [copied, setCopied] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [liabilityAgreed, setLiabilityAgreed] = useState(false)

  useEffect(() => {
    const loadViewer = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCurrentUserId(null)
        setIsFanUser(false)
        return
      }

      setCurrentUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
      setIsFanUser(profile?.user_type === 'fan')
    }

    loadViewer()
  }, [])

  useEffect(() => {
    const loadShow = async () => {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select('*')
          .or(`id.eq.${params.id},slug.eq.${params.id}`)
          .single()

        if (error) {
          setError(error.message || 'Unable to load show.')
          return
        }

        const artistUserId = data.artist_user_id || null
        const artistProfileId = data.artist_id || data.musician_id || null
        const artistProfileFilters = [
          artistProfileId ? `id.eq.${artistProfileId}` : null,
          artistUserId ? `user_id.eq.${artistUserId}` : null
        ].filter(Boolean)

        let artistSocials: Pick<
          ShowRecord,
          'spotify_url' | 'youtube_url' | 'soundcloud_url' | 'facebook_url' | 'instagram_url'
        > = {
          spotify_url: null,
          youtube_url: null,
          soundcloud_url: null,
          facebook_url: null,
          instagram_url: null
        }

        if (artistProfileFilters.length > 0) {
          const { data: artistProfiles, error: artistProfilesError } = await supabase
            .from('artist_profiles')
            .select('id, user_id, spotify_url, youtube_url, soundcloud_url, facebook_url, instagram_url')
            .or(artistProfileFilters.join(','))

          if (artistProfilesError) {
            console.error('Error loading artist social links:', artistProfilesError)
          } else if (artistProfiles?.length) {
            const matchedArtistProfile =
              artistProfiles.find((profile) => artistProfileId && profile.id === artistProfileId) ||
              artistProfiles.find((profile) => artistUserId && profile.user_id === artistUserId) ||
              artistProfiles[0]

            artistSocials = {
              spotify_url: matchedArtistProfile?.spotify_url || null,
              youtube_url: matchedArtistProfile?.youtube_url || null,
              soundcloud_url: matchedArtistProfile?.soundcloud_url || null,
              facebook_url: matchedArtistProfile?.facebook_url || null,
              instagram_url: matchedArtistProfile?.instagram_url || null
            }
          }
        }

        setShow({
          id: data.id,
          show_name: getShowNameValue(data),
          artist_name: data.artist_name || getShowNameValue(data),
          venue_name: getVenueNameValue(data),
          full_address: data.full_address || null,
          neighborhood: data.neighborhood || getPublicAreaValue(data),
          city: data.city || null,
          date: getShowDateValue(data),
          time: getShowTimeValue(data),
          ticket_price: data.ticket_price,
          max_capacity: getShowCapacity(data),
          show_description: data.show_description,
          host_id: getShowHostId(data),
          artist_user_id: artistUserId || artistProfileId,
          spotify_url: artistSocials.spotify_url,
          youtube_url: artistSocials.youtube_url,
          soundcloud_url: artistSocials.soundcloud_url,
          facebook_url: artistSocials.facebook_url,
          instagram_url: artistSocials.instagram_url,
          status: data.status
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load show.')
      } finally {
        setLoading(false)
      }
    }

    loadShow()
  }, [params.id])

  useEffect(() => {
    const loadFollowingStatus = async () => {
      if (!currentUserId || !show?.artist_user_id || !isFanUser) {
        setIsFollowingArtist(false)
        return
      }

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('fan_id', currentUserId)
        .eq('musician_id', show.artist_user_id)
        .maybeSingle()

      if (error) {
        console.error('Follow status error:', error)
        setIsFollowingArtist(false)
        return
      }

      setIsFollowingArtist(Boolean(data))
    }

    loadFollowingStatus()
  }, [currentUserId, isFanUser, show?.artist_user_id])

  const showUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/show/${params.id}`
  }, [params.id])

  const totalPrice = show ? Number(show.ticket_price) * ticketQuantity : 0
  const venueName = show?.venue_name?.trim() || ''
  const publicArea = formatPublicArea(show?.neighborhood, show?.city)
  const artistSocialLinks = getArtistSocialLinks(show)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

  const copyLink = async () => {
    if (!showUrl) return
    await navigator.clipboard.writeText(showUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const shareText = show
    ? `Come to ${show.show_name} on ${formatDate(show.date)} at ${show.venue_name}. Get tickets here: ${showUrl}`
    : ''

  const shareOnX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(showUrl)}`, '_blank')
  }

  const handleFollowArtist = async () => {
    if (!currentUserId || !show?.artist_user_id || !isFanUser || followLoading) return
    try {
      setFollowLoading(true)
      const { error } = await supabase
        .from('follows')
        .upsert(
          {
            fan_id: currentUserId,
            musician_id: show.artist_user_id
          },
          { onConflict: 'fan_id,musician_id' }
        )

      if (error) {
        console.error('Follow artist error:', error)
        return
      }

      setIsFollowingArtist(true)
    } finally {
      setFollowLoading(false)
    }
  }

  const startCheckout = async () => {
    if (!show) return
    console.log('Checkout liability state before trigger:', {
      showId: show.id,
      liabilityAgreed,
      ticketQuantity
    })
    if (!liabilityAgreed || checkoutLoading) {
      console.log('Checkout blocked because liability checkbox is not checked:', {
        showId: show.id,
        liabilityAgreed,
        checkoutLoading
      })
      return
    }

    try {
      setCheckoutLoading(true)
      const liabilityAgreedAt = new Date().toISOString()

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: show.id,
          showName: show.show_name,
          showDate: show.date,
          showTime: show.time,
          venueName: show.venue_name,
          venueAddress: show.full_address || '',
          ticketPrice: show.ticket_price,
          quantity: ticketQuantity,
          liabilityAgreed: true,
          liabilityAgreedAt
        })
      })

      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Unable to start checkout')
      }

      window.location.href = data.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to start checkout')
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F0E8' }}>
        Loading show...
      </main>
    )
  }

  if (error || !show) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ maxWidth: '520px', textAlign: 'center', color: '#F5F0E8' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '16px' }}>Show unavailable</h1>
          <p style={{ color: '#8C7B6B', marginBottom: '24px' }}>{error || 'This show could not be loaded.'}</p>
          <a href="/bookings" style={{ color: '#F0A500', textDecoration: 'none' }}>Back to Bookings</a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '20px 14px' }}>
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>HouseShow</a>
          <a href="/bookings" style={{ color: '#8C7B6B', textDecoration: 'none', fontSize: '0.92rem' }}>Back to Bookings</a>
        </nav>

        <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '12px', padding: '18px', background: 'rgba(44,34,24,0.35)' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', lineHeight: 1.2, marginBottom: '12px', wordBreak: 'break-word' }}>
            {show.show_name}
          </h1>
          {show.artist_user_id ? (
            <a
              href={`/artist/${show.artist_user_id}`}
              style={{ display: 'inline-block', marginBottom: '10px', color: '#F0A500', textDecoration: 'none', fontWeight: 700 }}
            >
              {show.artist_name}
            </a>
          ) : null}
          <div style={{ color: '#F5F0E8', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '6px' }}>
            {formatDate(show.date)} at {formatTime(show.time)}
          </div>
          {venueName ? (
            <div style={{ color: '#F5F0E8', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '6px' }}>
              {venueName}
            </div>
          ) : null}
          {publicArea ? (
            <div style={{ color: '#8C7B6B', fontSize: '0.95rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {publicArea}
            </div>
          ) : null}
          {isFanUser && show.artist_user_id ? (
            <button
              onClick={handleFollowArtist}
              disabled={isFollowingArtist || followLoading}
              style={{
                display: 'inline-block',
                marginTop: '10px',
                marginLeft: '10px',
                background: isFollowingArtist ? 'rgba(212,130,10,0.2)' : 'transparent',
                border: '1px solid rgba(212,130,10,0.35)',
                color: '#F5F0E8',
                borderRadius: '8px',
                padding: '8px 12px',
                fontWeight: 600,
                cursor: isFollowingArtist || followLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isFollowingArtist ? 'Following' : followLoading ? 'Following...' : 'Follow Artist'}
            </button>
          ) : null}
          {artistSocialLinks.length > 0 ? (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              {artistSocialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '9px 13px',
                    background: 'rgba(240,165,0,0.08)',
                    border: '1px solid rgba(212,130,10,0.28)',
                    borderRadius: '8px',
                    color: '#F0A500',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                >
                  <span>{link.icon}</span>
                  <span>{link.name}</span>
                </a>
              ))}
            </div>
          ) : null}
        </section>

        <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '12px', padding: '18px', background: 'rgba(44,34,24,0.35)' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Buy Tickets
          </div>
          <div style={{ fontSize: '2rem', color: '#F0A500', fontWeight: 700, marginBottom: '12px' }}>
            ${Number(show.ticket_price).toFixed(2)}
          </div>
          <div style={{ color: '#8C7B6B', marginBottom: '14px' }}>
            Capacity: {show.max_capacity} people
          </div>
          <label style={{ display: 'block', color: '#8C7B6B', marginBottom: '8px' }}>Quantity</label>
          <input
            type="number"
            min={1}
            max={show.max_capacity}
            value={ticketQuantity}
            onChange={(e) => setTicketQuantity(Math.max(1, Number(e.target.value) || 1))}
            style={{
              width: '100%',
              background: 'rgba(26,20,16,0.8)',
              border: '1px solid rgba(212,130,10,0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#F5F0E8',
              marginBottom: '14px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', color: '#F5F0E8' }}>
            <span>Total</span>
            <span style={{ color: '#F0A500', fontWeight: 700 }}>${totalPrice.toFixed(2)}</span>
          </div>
          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px', color: '#F5F0E8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={liabilityAgreed}
              onChange={(e) => setLiabilityAgreed(e.target.checked)}
              style={{ marginTop: '4px', accentColor: '#D4820A' }}
            />
            <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              I understand that house concerts are private events. I agree to hold the host and HouseShow harmless for any injury, loss, or damages incurred at this event.
            </span>
          </label>
          <button
            onClick={startCheckout}
            disabled={checkoutLoading || !liabilityAgreed}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 18px',
              fontWeight: 700,
              cursor: checkoutLoading || !liabilityAgreed ? 'not-allowed' : 'pointer',
              opacity: checkoutLoading || !liabilityAgreed ? 0.7 : 1
            }}
          >
            {checkoutLoading ? 'Opening Checkout...' : 'Continue to Checkout'}
          </button>
        </section>

        <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '12px', padding: '18px', background: 'rgba(44,34,24,0.35)' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={copyLink}
              style={{
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 14px',
                fontWeight: 600,
                cursor: 'pointer',
                flex: '1 1 140px'
              }}
            >
              {copied ? 'Link Copied' : 'Copy Show Link'}
            </button>
            <button
              onClick={shareOnX}
              style={{
                background: 'transparent',
                color: '#F5F0E8',
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '8px',
                padding: '11px 14px',
                cursor: 'pointer',
                flex: '1 1 120px'
              }}
            >
              Share on X
            </button>
            <button
              onClick={shareOnFacebook}
              style={{
                background: 'transparent',
                color: '#F5F0E8',
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '8px',
                padding: '11px 14px',
                cursor: 'pointer',
                flex: '1 1 140px'
              }}
            >
              Share on Facebook
            </button>
            <a
              href={`sms:?body=${encodeURIComponent(`Check out this show: ${showUrl}`)}`}
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: '#F5F0E8',
                border: '1px solid rgba(212,130,10,0.2)',
                borderRadius: '8px',
                padding: '11px 14px',
                cursor: 'pointer',
                flex: '1 1 140px',
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              Share via Text
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
