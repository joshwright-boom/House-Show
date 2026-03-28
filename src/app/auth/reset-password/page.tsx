'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleReset = async () => {
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Password reset successful! Redirecting to login...')
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
    } catch (error) {
      setMessage('Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
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
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '8px' }}>Reset Password</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.9rem', marginBottom: '36px' }}>Enter your new password below</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>New Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter new password" 
              style={inputStyle} 
            />
          </div>
          
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Confirm new password" 
              style={inputStyle} 
            />
          </div>

          {message && (
            <p style={{ 
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              color: message.includes('successful') ? '#22c55e' : '#ff6b6b', 
              background: message.includes('successful') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(127,29,29,0.2)',
              border: message.includes('successful') ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(248,113,113,0.35)',
              borderRadius: '8px',
              padding: '12px 14px',
              width: 'calc(100% - 32px)',
              maxWidth: '520px',
              fontFamily: "'DM Sans', sans-serif", 
              fontSize: '0.85rem' 
            }}>
              {message}
            </p>
          )}

          <button 
            onClick={handleReset} 
            disabled={loading} 
            style={{
              background: loading ? '#8C7B6B' : 'linear-gradient(135deg, #D4820A, #F0A500)',
              color: '#1A1410', 
              border: 'none', 
              borderRadius: '4px', 
              padding: '14px',
              fontSize: '1rem', 
              fontWeight: 600, 
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer', 
              marginTop: '8px',
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>
          Remember your password?{' '}<a href="/auth/login" style={{ color: '#F0A500' }}>Sign in</a>
        </p>
      </div>
    </main>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <p style={{ color: '#8C7B6B' }}>Loading...</p>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
