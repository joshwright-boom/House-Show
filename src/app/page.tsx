'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [musicianRevenue, setMusicianRevenue] = useState(0)
  const [hostRevenue, setHostRevenue] = useState(0)
  const [loadingRevenue, setLoadingRevenue] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ id: user.id, email: user.email })
        await fetchRevenue(user.id)
      } else {
        setLoadingRevenue(false)
      }
    }
    
    checkUser()
  }, [])

  const fetchRevenue = async (userId: string) => {
    try {
      // Mock revenue data - replace with actual Supabase query
      const mockMusicianRevenue = 1247.50
      const mockHostRevenue = 534.75
      
      setMusicianRevenue(mockMusicianRevenue)
      setHostRevenue(mockHostRevenue)
    } catch (error) {
      console.error('Error fetching revenue:', error)
    } finally {
      setLoadingRevenue(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 48px', borderBottom: '1px solid rgba(212,130,10,0.15)',
        position: 'sticky', top: 0, background: 'rgba(26,20,16,0.95)',
        backdropFilter: 'blur(12px)', zIndex: 100,
      }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#F0A500' }}>
          HouseShow
        </span>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#how-it-works" style={{ color: '#8C7B6B', fontSize: '0.9rem' }}>How It Works</a>
          <a href="#revenue" style={{ color: '#8C7B6B', fontSize: '0.9rem' }}>Revenue</a>
          <a href="/auth/login" style={{
            border: '1px solid rgba(240,165,0,0.4)', color: '#F0A500',
            padding: '8px 20px', borderRadius: '4px', fontSize: '0.85rem',
          }}>Sign In</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '90vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
        padding: '80px 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(212,130,10,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '24px' }}>
          Live Music · House Shows · Real Revenue
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.8rem, 6vw, 5.5rem)', fontWeight: 900, lineHeight: 1.1, color: '#F5F0E8', maxWidth: '800px', marginBottom: '24px' }}>
          Your talent.<br />Their living room.<br />
          <em style={{ color: '#F0A500' }}>Everyone wins.</em>
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1.15rem', color: '#8C7B6B', maxWidth: '500px', lineHeight: 1.7, marginBottom: '48px' }}>
          Book intimate live performances. Split the door. Build your scene. The Airbnb for house shows is here.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/auth/register?type=musician" style={{
            background: 'linear-gradient(135deg, #D4820A, #F0A500)', color: '#1A1410',
            padding: '16px 36px', borderRadius: '4px', fontSize: '1rem', fontWeight: 600,
            boxShadow: '0 4px 24px rgba(212,130,10,0.35)', display: 'inline-block',
          }}>I&apos;m a Musician</a>
          <a href="/auth/register?type=host" style={{
            border: '1.5px solid rgba(240,165,0,0.5)', color: '#F5F0E8',
            padding: '16px 36px', borderRadius: '4px', fontSize: '1rem', display: 'inline-block',
          }}>I Want to Host</a>
        </div>
        <div style={{ display: 'flex', gap: '48px', marginTop: '80px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[{ num: '50%', label: 'GOES TO THE ARTIST' }, { num: '45%', label: 'GOES TO THE HOST' }, { num: '5%', label: 'PLATFORM FEE' }].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: 700, color: '#F0A500' }}>{s.num}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#8C7B6B', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TWO PATHS */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: 'rgba(212,130,10,0.1)' }}>
        {[
          { role: 'Musicians', tagline: 'Play intimate shows. Keep the money.', features: ['Build a profile with your Spotify, YouTube & SoundCloud', 'Set your rate and availability', 'Get booked by hosts in your area', 'Sell tickets directly — 70% of every door goes to you', '100-mile venue radar shows every opportunity nearby'], cta: 'Create Artist Profile', href: '/auth/register?type=musician' },
          { role: 'Hosts', tagline: 'Turn your space into a venue.', features: ['List your home, backyard, or small venue', 'Browse artists by genre, price, and availability', 'Handle tickets and RSVPs in one place', 'Keep 30% of every ticket sold at your show', 'Build a reputation as the best house show host in town'], cta: 'List Your Space', href: '/auth/register?role=host' },
        ].map((p) => (
          <div key={p.role} style={{ background: '#1A1410', padding: '64px 48px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>For {p.role}</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#F5F0E8', lineHeight: 1.2, marginBottom: '32px' }}>{p.tagline}</h2>
            <ul style={{ listStyle: 'none', marginBottom: '40px' }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#8C7B6B', lineHeight: 1.5 }}>
                  <span style={{ color: '#F0A500', flexShrink: 0 }}>→</span>{f}
                </li>
              ))}
            </ul>
            <a href={p.href} style={{ display: 'inline-block', background: 'linear-gradient(135deg, #D4820A, #F0A500)', color: '#1A1410', padding: '14px 28px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 600 }}>{p.cta}</a>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '100px 48px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>The Flow</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 700, color: '#F5F0E8', textAlign: 'center', marginBottom: '64px' }}>From profile to payout in 5 steps</h2>
        {[
          { n: '01', title: 'Build your profile', body: 'Musicians link Spotify, YouTube, and SoundCloud. Hosts list their space with photos and capacity.' },
          { n: '02', title: 'Get matched', body: 'Artists browse the 100-mile venue radar. Hosts browse available artists by genre and price.' },
          { n: '03', title: 'Book the show', body: 'Send a booking request. Both parties confirm the date, rate, and ticket price.' },
          { n: '04', title: 'Sell tickets', body: 'HouseShow handles the ticketing page. Both parties promote to their audiences.' },
          { n: '05', title: 'Get paid', body: 'Show ends. Stripe splits automatically: 70% artist, 30% host, 10% platform. Instant payouts.' },
        ].map((step, i) => (
          <div key={step.n} style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', padding: '32px 0', borderBottom: i < 4 ? '1px solid rgba(212,130,10,0.1)' : 'none' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 900, color: 'rgba(240,165,0,0.15)', lineHeight: 1, flexShrink: 0, width: '80px' }}>{step.n}</div>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#F5F0E8', marginBottom: '8px' }}>{step.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#8C7B6B', lineHeight: 1.6 }}>{step.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* REVENUE */}
      <section id="revenue" style={{ padding: '100px 48px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>Your Earnings</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 700, color: '#F5F0E8', textAlign: 'center', marginBottom: '64px' }}>Revenue Dashboard</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Musician Revenue Card */}
          <div style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '16px',
            padding: '40px',
            background: 'rgba(44,34,24,0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎸</div>
            <h3 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '1.5rem', 
              color: '#F5F0E8', 
              marginBottom: '16px' 
            }}>
              Revenue as a Musician
            </h3>
            
            {loadingRevenue ? (
              <div style={{ color: '#8C7B6B' }}>Loading...</div>
            ) : user ? (
              <>
                <div style={{ 
                  fontFamily: "'Space Mono', monospace", 
                  fontSize: '2.2rem', 
                  color: '#F0A500', 
                  fontWeight: 600, 
                  marginBottom: '8px' 
                }}>
                  ${musicianRevenue.toFixed(2)}
                </div>
                <p style={{ 
                  fontFamily: "'DM Sans', sans-serif", 
                  color: '#8C7B6B', 
                  fontSize: '0.9rem',
                  marginBottom: '24px'
                }}>
                  Total earnings from performances
                </p>
                <a href="/dashboard" style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                  color: '#1A1410',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'none'
                }}>
                  View Details
                </a>
              </>
            ) : (
              <>
                <div style={{ 
                  fontFamily: "'Space Mono', monospace", 
                  fontSize: '1.5rem', 
                  color: '#8C7B6B', 
                  fontWeight: 600, 
                  marginBottom: '16px' 
                }}>
                  Sign in to view
                </div>
                <p style={{ 
                  fontFamily: "'DM Sans', sans-serif", 
                  color: '#8C7B6B', 
                  fontSize: '0.9rem',
                  marginBottom: '24px'
                }}>
                  Connect your account to see your earnings
                </p>
                <a href="/auth/login" style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                  color: '#1A1410',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'none'
                }}>
                  Sign In
                </a>
              </>
            )}
          </div>

          {/* Host Revenue Card */}
          <div style={{
            border: '1px solid rgba(212,130,10,0.2)',
            borderRadius: '16px',
            padding: '40px',
            background: 'rgba(44,34,24,0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🏠</div>
            <h3 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '1.5rem', 
              color: '#F5F0E8', 
              marginBottom: '16px' 
            }}>
              Revenue as a Host
            </h3>
            
            {loadingRevenue ? (
              <div style={{ color: '#8C7B6B' }}>Loading...</div>
            ) : user ? (
              <>
                <div style={{ 
                  fontFamily: "'Space Mono', monospace", 
                  fontSize: '2.2rem', 
                  color: '#F0A500', 
                  fontWeight: 600, 
                  marginBottom: '8px' 
                }}>
                  ${hostRevenue.toFixed(2)}
                </div>
                <p style={{ 
                  fontFamily: "'DM Sans', sans-serif", 
                  color: '#8C7B6B', 
                  fontSize: '0.9rem',
                  marginBottom: '24px'
                }}>
                  Total earnings from hosting shows
                </p>
                <a href="/dashboard" style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                  color: '#1A1410',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'none'
                }}>
                  View Details
                </a>
              </>
            ) : (
              <>
                <div style={{ 
                  fontFamily: "'Space Mono', monospace", 
                  fontSize: '1.5rem', 
                  color: '#8C7B6B', 
                  fontWeight: 600, 
                  marginBottom: '16px' 
                }}>
                  Sign in to view
                </div>
                <p style={{ 
                  fontFamily: "'DM Sans', sans-serif", 
                  color: '#8C7B6B', 
                  fontSize: '0.9rem',
                  marginBottom: '24px'
                }}>
                  Connect your account to see your earnings
                </p>
                <a href="/auth/login" style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                  color: '#1A1410',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  textDecoration: 'none'
                }}>
                  Sign In
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(212,130,10,0.15)', padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: '#F0A500' }}>HouseShow</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#8C7B6B' }}>houseshow.net · Live music for real people</span>
      </footer>

    </main>
  )
}
