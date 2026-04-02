'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [showReset, setShowReset] = useState(false)

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
    if (error) setMessage(error.message)
  }

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (profile?.user_type === 'fan') {
        window.location.href = '/fan'
      } else if (profile?.user_type === 'host') {
        window.location.href = '/dashboard/host'
      } else {
        window.location.href = '/dashboard/musician'
      }
    }
    setLoading(false)
  }

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setResetMessage('Please enter your email address first')
      return
    }

    setResetLoading(true)
    setResetMessage('')
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) {
        setResetMessage(error.message)
      } else {
        setResetMessage('Password reset email sent! Check your inbox.')
        setShowReset(false)
      }
    } catch (error) {
      setResetMessage('Failed to send reset email. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(26,20,16,0.8)',
    border: '1px solid rgba(212,130,10,0.25)',
    borderRadius: '4px',
    padding: '12px 16px',
    color: '#F5F0E8',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.95rem',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block' as const,
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.65rem',
    color: '#D4820A',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ width: '100%', maxWidth: '420px', border: '1px solid rgba(212,130,10,0.2)', borderRadius: '8px', padding: '48px', background: 'rgba(44,34,24,0.5)' }}>
        <a href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', display: 'block', marginBottom: '40px' }}>HouseShow</a>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '8px' }}>Welcome back</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.9rem', marginBottom: '36px' }}>Sign in to your HouseShow account</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => handleOAuth('google')} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid rgba(212,130,10,0.25)',
            background: 'rgba(26,20,16,0.8)', color: '#F5F0E8', fontSize: '0.95rem',
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button onClick={() => handleOAuth('apple')} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid rgba(212,130,10,0.25)',
            background: 'rgba(26,20,16,0.8)', color: '#F5F0E8', fontSize: '0.95rem',
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F5F0E8"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,130,10,0.15)' }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#8C7B6B' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,130,10,0.15)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </div>

          {message && (
            <p style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              color: '#ff6b6b',
              background: 'rgba(127,29,29,0.2)',
              border: '1px solid rgba(248,113,113,0.35)',
              borderRadius: '8px',
              padding: '12px 14px',
              width: 'calc(100% - 32px)',
              maxWidth: '520px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.85rem'
            }}>{message}</p>
          )}

          {resetMessage && (
            <p style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              color: '#22c55e',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
              width: 'calc(100% - 32px)',
              maxWidth: '520px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.85rem'
            }}>{resetMessage}</p>
          )}

          <button onClick={handleLogin} disabled={loading} style={{
            background: loading ? '#8C7B6B' : 'linear-gradient(135deg, #D4820A, #F0A500)',
            color: '#1A1410', border: 'none', borderRadius: '4px', padding: '14px',
            fontSize: '1rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px',
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={resetLoading}
              style={{
                background: 'none',
                border: 'none',
                color: '#F0A500',
                fontSize: '0.85rem',
                fontFamily: "'DM Sans', sans-serif",
                cursor: resetLoading ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                padding: '4px 8px'
              }}
            >
              {resetLoading ? 'Sending...' : 'Forgot password?'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>
          No account?{' '}<a href="/auth/register" style={{ color: '#F0A500' }}>Create one free</a>
        </p>
      </div>
    </main>
  )
}
