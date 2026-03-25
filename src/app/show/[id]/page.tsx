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
          venue_name: data.venue_name,
          venue_address: data.venue_address,
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
  const mapsUrl = show
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(show.venue_address)}`
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

  const shareByEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(show?.show_name || 'HouseShow')}&body=${encodeURIComponent(shareText)}`
  }

  const startCheckout = async () => {
    if (!show) return

    try {
      setCheckoutLoading(true)

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: show.id,
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
    <main style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8', padding: '48px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', textDecoration: 'none' }}>HouseShow</a>
          <a href="/bookings" style={{ color: '#8C7B6B', textDecoration: 'none' }}>Back to Bookings</a>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '32px' }}>
          <section style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '16px', padding: '32px', background: 'rgba(44,34,24,0.35)' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Ticket Page
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', marginBottom: '16px' }}>
              {show.show_name}
            </h1>
            <div style={{ color: '#8C7B6B', fontSize: '1rem', marginBottom: '24px', lineHeight: '1.7' }}>
              <div>{formatDate(show.date)} at {show.time}</div>
              <div>{show.venue_name}</div>
              <div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#F0A500', textDecoration: 'none' }}
                >
                  {show.venue_address}
                </a>
              </div>
            </div>
            <p style={{ color: '#F5F0E8', lineHeight: '1.7', fontSize: '1rem', marginBottom: '24px' }}>
              {show.show_description}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                onClick={copyLink}
                style={{
                  background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                  color: '#1A1410',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 18px',
                  fontWeight: 600,
                  cursor: 'pointer'
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
                  padding: '12px 18px',
                  cursor: 'pointer'
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
                  padding: '12px 18px',
                  cursor: 'pointer'
                }}
              >
                Share on Facebook
              </button>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  color: '#F5F0E8',
                  textDecoration: 'none',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '12px 18px'
                }}
              >
                Open in Maps
              </a>
              <a
                href={`sms:?body=${encodeURIComponent(`Come to ${show.show_name} on ${formatDate(show.date)} at ${show.venue_name}. ${showUrl}`)}`}
                style={{
                  display: 'inline-block',
                  color: '#F5F0E8',
                  textDecoration: 'none',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '12px 18px'
                }}
              >
                Share by Text
              </a>
              <button
                onClick={shareByEmail}
                style={{
                  background: 'transparent',
                  color: '#F5F0E8',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  padding: '12px 18px',
                  cursor: 'pointer'
                }}
              >
                Share by Email
              </button>
            </div>
            <div style={{ color: '#8C7B6B', lineHeight: '1.6' }}>
              Use these buttons to promote the show across text, email, X, and Facebook with the same ticket link.
            </div>
          </section>

          <aside style={{ border: '1px solid rgba(212,130,10,0.2)', borderRadius: '16px', padding: '24px', background: 'rgba(44,34,24,0.35)', height: 'fit-content' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Buy Tickets
            </div>
            <div style={{ fontSize: '2rem', color: '#F0A500', fontWeight: 700, marginBottom: '16px' }}>
              ${Number(show.ticket_price).toFixed(2)}
            </div>
            <div style={{ color: '#8C7B6B', marginBottom: '16px' }}>
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
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#F5F0E8' }}>
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
          </aside>
        </div>
      </div>
    </main>
  )
}
