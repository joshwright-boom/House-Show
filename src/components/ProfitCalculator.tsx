'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  compact?: boolean
  initialArtistPct?: number
  initialHostPct?: number
}

const PRESETS: [number, number][] = [
  [60, 33], [70, 23], [50, 43], [75, 18], [55, 38],
  [65, 28], [80, 13], [45, 48], [72, 21], [58, 35],
]

export default function ProfitCalculator({
  compact = false,
  initialArtistPct = 60,
  initialHostPct = 33,
}: Props) {
  const [artistPct, setArtistPct] = useState(initialArtistPct)
  const [hostPct, setHostPct] = useState(initialHostPct)
  const [ticketPrice, setTicketPrice] = useState(20)
  const [ticketsSold, setTicketsSold] = useState(30)
  const [animOpacity, setAnimOpacity] = useState(1)
  const [userInteracted, setUserInteracted] = useState(false)
  const presetIndexRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (userInteracted) return

    intervalRef.current = setInterval(() => {
      setAnimOpacity(0)
      setTimeout(() => {
        presetIndexRef.current = (presetIndexRef.current + 1) % PRESETS.length
        const [a, h] = PRESETS[presetIndexRef.current]
        setArtistPct(a)
        setHostPct(h)
        setAnimOpacity(1)
      }, 400)
    }, 2200)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [userInteracted])

  const handleArtistSlider = (val: number) => {
    if (!userInteracted) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setUserInteracted(true)
      setAnimOpacity(1)
    }
    const bounded = Math.min(86, Math.max(40, val))
    setArtistPct(bounded)
    setHostPct(93 - bounded)
  }

  const handleHostSlider = (val: number) => {
    if (!userInteracted) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setUserInteracted(true)
      setAnimOpacity(1)
    }
    const bounded = Math.min(53, Math.max(7, val))
    setHostPct(bounded)
    setArtistPct(93 - bounded)
  }

  const artistEarns = Math.round(ticketPrice * ticketsSold * (artistPct / 100))
  const hostEarns = Math.round(ticketPrice * ticketsSold * (hostPct / 100))
  const totalDoor = Math.round(ticketPrice * ticketsSold)

  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(212,130,10,0.2)',
    borderRadius: '12px',
    padding: '28px 24px',
    background: 'rgba(44,34,24,0.3)',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.68rem',
    color: '#D4820A',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginBottom: '12px',
  }

  const sliderLabelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    color: '#F5F0E8',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#D4820A',
    cursor: 'pointer',
    height: '4px',
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Animated split display */}
      <div>
        <div style={{ ...labelStyle, marginBottom: '16px' }}>
          {userInteracted ? 'Your split' : 'Every deal is different — splits are negotiated'}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '32px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            opacity: animOpacity,
            transition: 'opacity 0.4s',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.6rem', fontWeight: 900, color: '#F0A500', lineHeight: 1 }}>
              {artistPct}%
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#8C7B6B', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '6px' }}>
              Artist
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.6rem', fontWeight: 900, color: '#F0A500', lineHeight: 1 }}>
              {hostPct}%
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#8C7B6B', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '6px' }}>
              Host
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.6rem', fontWeight: 900, color: '#4A4240', lineHeight: 1 }}>
              7%
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#4A4240', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '6px' }}>
              Platform
            </div>
          </div>
        </div>
      </div>

      {/* Ticket price & tickets sold (hidden when compact) */}
      {!compact && (
        <div>
          <div style={labelStyle}>See what you&apos;d make</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={sliderLabelStyle as React.CSSProperties}>
                <span>Ticket Price</span>
                <span style={{ color: '#F0A500', fontWeight: 600 }}>${ticketPrice}</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={ticketPrice}
                onChange={(e) => setTicketPrice(Number(e.target.value))}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#4A4240', marginTop: '4px' }}>
                <span>$5</span><span>$100</span>
              </div>
            </div>
            <div>
              <div style={sliderLabelStyle as React.CSSProperties}>
                <span>Tickets Sold</span>
                <span style={{ color: '#F0A500', fontWeight: 600 }}>{ticketsSold}</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={ticketsSold}
                onChange={(e) => setTicketsSold(Number(e.target.value))}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#4A4240', marginTop: '4px' }}>
                <span>10</span><span>100</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Negotiate the split */}
      <div>
        <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span>Negotiate the split</span>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.72rem',
            color: '#4A4240',
            background: 'rgba(74,66,64,0.2)',
            border: '1px solid rgba(74,66,64,0.3)',
            borderRadius: '4px',
            padding: '2px 8px',
            letterSpacing: '0.5px',
            textTransform: 'none',
          }}>
            7% locked
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={sliderLabelStyle as React.CSSProperties}>
              <span>Artist %</span>
              <span style={{ color: '#F0A500', fontWeight: 600 }}>{artistPct}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={86}
              value={artistPct}
              onChange={(e) => handleArtistSlider(Number(e.target.value))}
              style={sliderStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#4A4240', marginTop: '4px' }}>
              <span>40%</span><span>86%</span>
            </div>
          </div>
          <div>
            <div style={sliderLabelStyle as React.CSSProperties}>
              <span>Host %</span>
              <span style={{ color: '#F0A500', fontWeight: 600 }}>{hostPct}%</span>
            </div>
            <input
              type="range"
              min={7}
              max={53}
              value={hostPct}
              onChange={(e) => handleHostSlider(Number(e.target.value))}
              style={sliderStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#4A4240', marginTop: '4px' }}>
              <span>7%</span><span>53%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div style={{ background: 'rgba(26,20,16,0.6)', border: '1px solid rgba(212,130,10,0.15)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Artist earns</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#F0A500' }}>${artistEarns.toLocaleString()}</div>
        </div>
        <div style={{ background: 'rgba(26,20,16,0.6)', border: '1px solid rgba(212,130,10,0.15)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Host earns</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#F0A500' }}>${hostEarns.toLocaleString()}</div>
        </div>
        <div style={{ background: 'rgba(26,20,16,0.6)', border: '1px solid rgba(212,130,10,0.15)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#8C7B6B', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Total door</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#F5F0E8' }}>${totalDoor.toLocaleString()}</div>
        </div>
      </div>

      {/* Footnote */}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: '#4A4240', lineHeight: 1.5, margin: 0 }}>
        Split is negotiated between artist and host before the show. Platform fee is always 7%.
      </p>

    </div>
  )
}
