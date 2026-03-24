'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<{ email?: string; user_type?: string; active_mode?: string } | null>(null)
  const [activeMode, setActiveMode] = useState<'musician' | 'host'>('musician')
  const [switchingMode, setSwitchingMode] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      // Get user profile to determine user type and active mode
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, active_mode')
        .eq('id', user.id)
        .single()

      setUser({ 
        email: user.email,
        user_type: profile?.user_type || 'musician',
        active_mode: profile?.active_mode || 'musician'
      })
    }

    loadUser()
  }, [])

  useEffect(() => {
    const loadActiveMode = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_mode')
        .eq('id', user.id)
        .single()

      if (profile?.active_mode === 'musician' || profile?.active_mode === 'host') {
        setActiveMode(profile.active_mode)
      }
    }

    loadActiveMode()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const switchMode = async (newMode: 'musician' | 'host') => {
    if (switchingMode) return

    try {
      setSwitchingMode(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      
      const { error } = await supabase
        .from('profiles')
        .update({ active_mode: newMode })
        .eq('id', currentUser.id)

      if (error) {
        console.error('Error switching mode:', error)
        return
      }

      setActiveMode(newMode)
      setUser(prev => prev ? { ...prev, active_mode: newMode } : null)
    } catch (error) {
      console.error('Error switching mode:', error)
    } finally {
      setSwitchingMode(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', padding: '48px' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
        <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
        <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid rgba(212,130,10,0.3)', color: '#8C7B6B', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem' }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Mode Toggle */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Active Mode
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '12px'
          }}>
            <button
              onClick={() => switchMode('musician')}
              disabled={switchingMode}
              style={{
                padding: '12px 18px',
                borderRadius: '6px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9rem',
                fontWeight: '600',
                border: activeMode === 'musician' ? '1px solid #D4820A' : '1px solid rgba(212,130,10,0.3)',
                cursor: switchingMode ? 'not-allowed' : 'pointer',
                background: activeMode === 'musician' ? '#D4820A' : 'transparent',
                color: activeMode === 'musician' ? '#1A1410' : '#F5F0E8',
              }}
            >
              Musician Mode
            </button>
            <button
              onClick={() => switchMode('host')}
              disabled={switchingMode}
              style={{
                padding: '12px 18px',
                borderRadius: '6px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.9rem',
                fontWeight: '600',
                border: activeMode === 'host' ? '1px solid #D4820A' : '1px solid rgba(212,130,10,0.3)',
                cursor: switchingMode ? 'not-allowed' : 'pointer',
                background: activeMode === 'host' ? '#D4820A' : 'transparent',
                color: activeMode === 'host' ? '#1A1410' : '#F5F0E8',
              }}
            >
              Host Mode
            </button>
          </div>
          {switchingMode && (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#D4820A', marginTop: '8px' }}>
              Switching mode...
            </div>
          )}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
          You&apos;re in
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', color: '#F5F0E8', marginBottom: '16px' }}>
          Welcome to HouseShow
        </h1>
        {user && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Signed in as <span style={{ color: '#F0A500' }}>{user.email}</span>
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            ...(activeMode === 'host' ? [
              { icon: '🏠', title: 'My Host Profile', desc: 'Build your host profile', href: '/host-profile' },
              { icon: '🎵', title: 'Find Musicians', desc: 'Discover and invite local musicians', href: '/find-musicians' },
              { icon: '📅', title: 'My Bookings', desc: 'Manage your upcoming shows', href: '/bookings' },
            ] : [
              { icon: '🎸', title: 'My Artist Profile', desc: 'Build your musician profile', href: '/profile' },
              { icon: '🏠', title: 'Find Hosts', desc: 'Discover hosts and venues near you', href: '/find-hosts' },
              { icon: '📅', title: 'My Bookings', desc: 'Manage your upcoming shows', href: '/bookings' },
            ])
          ].flat().map((card) => (
            <a key={card.title} href={card.href} style={{
              display: 'block', border: '1px solid rgba(212,130,10,0.2)', borderRadius: '8px',
              padding: '28px 24px', background: 'rgba(44,34,24,0.3)', cursor: 'pointer',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{card.icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '6px' }}>{card.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>{card.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
