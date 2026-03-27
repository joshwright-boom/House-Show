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
            <p style={{ color: '#ff6b6b', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem' }}>{message}</p>
          )}

          {resetMessage && (
            <p style={{ color: '#22c55e', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem' }}>{resetMessage}</p>
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
