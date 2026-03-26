'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ShowRecord {
  id: string
  show_name: string
  venue_name: string
  venue_address: string
  date: string
  time: string
  ticket_price: number
  max_capacity: number
  show_description: string
  host_id: string
  artist_user_id?: string | null
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

const getVenueAddressValue = (show: Record<string, any>) =>
  show.venue_address || show.location_address || show.address || ''

export default function ShowPage({ params }: { params: { id: string } }) {
  const [show, setShow] = useState<ShowRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [copied, setCopied] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

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
        setShow({
          id: data.id,
          show_name: getShowNameValue(data),
          venue_name: getVenueNameValue(data),
          venue_address: getVenueAddressValue(data),
          date: getShowDateValue(data),
          time: getShowTimeValue(data),
          ticket_price: data.ticket_price,
          max_capacity: getShowCapacity(data),
          show_description: data.show_description,
          host_id: getShowHostId(data),
          artist_user_id: data.artist_user_id || data.artist_id || data.musician_id || null,
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

  const showUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/show/${params.id}`
  }, [params.id])

  const totalPrice = show ? Number(show.ticket_price) * ticketQuantity : 0
  const venueName = show?.venue_name?.trim() || ''
  const venueAddress = show?.venue_address?.trim() || ''
  const mapsUrl = show
    ? `https://maps.google.com/?q=${encodeURIComponent(venueAddress)}`
    : ''

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

  const startCheckout = async () => {
    if (!show) return

    try {
      setCheckoutLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: show.id,
          userId: user.id,
          showName: show.show_name,
          ticketPrice: show.ticket_price,
          quantity: ticketQuantity
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
          <div style={{ color: '#F5F0E8', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '6px' }}>
            {formatDate(show.date)} at {show.time}
          </div>
          {venueName ? (
            <div style={{ color: '#F5F0E8', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '6px' }}>
              {venueName}
            </div>
          ) : null}
          {venueAddress ? (
            <div style={{ color: '#8C7B6B', fontSize: '0.95rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {venueAddress}
            </div>
          ) : null}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: '8px', color: '#D4820A', textDecoration: 'none', fontWeight: 600 }}
          >
            Get Directions
          </a>
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
          <button
            onClick={startCheckout}
            disabled={checkoutLoading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 18px',
              fontWeight: 700,
              cursor: checkoutLoading ? 'not-allowed' : 'pointer',
              opacity: checkoutLoading ? 0.7 : 1
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
