'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function RegisterContent() {
  const searchParams = useSearchParams()
  const [role, setRole] = useState<'musician' | 'host' | 'fan'>('musician')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [termsError, setTermsError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const roleParam = searchParams.get('role') || searchParams.get('type')
    if (roleParam === 'host') {
      setRole('host')
    } else if (roleParam === 'fan') {
      setRole('fan')
    }
  }, [searchParams])

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { user_type: role }
      }
    })
    if (error) setMessage(error.message)
  }

  const handleRegister = async () => {
    if (!agreedToTerms) {
      setTermsError('You must agree to the Terms of Service and Privacy Policy.')
      return
    }

    setLoading(true)
    setMessage('')
    setTermsError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, role, user_type: role }
      }
    })
    if (error) {
      setMessage(error.message)
    } else {
      if (data.user?.id) {
        const registrationName = `${firstName} ${lastName}`.trim() || firstName.trim() || lastName.trim() || 'HouseShow User'
        const { error: profileInsertError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              name: registrationName,
              user_type: role
            },
            { onConflict: 'id' }
          )

        if (profileInsertError) {
          console.error('Profile insert error after sign up:', profileInsertError)
        }
      }
      setSuccess(true)
    }
    setLoading(false)
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
    fontSize: '0.6rem',
    color: '#D4820A',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '24px' }}>🎸</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#F5F0E8', marginBottom: '16px' }}>Check your email</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', lineHeight: 1.7 }}>
            We sent a confirmation link to <strong style={{ color: '#F0A500' }}>{email}</strong>. Click it to activate your account, then come back to sign in.
          </p>
          <a href="/auth/login" style={{ display: 'inline-block', marginTop: '32px', background: 'linear-gradient(135deg, #D4820A, #F0A500)', color: '#1A1410', padding: '14px 28px', borderRadius: '4px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            Go to Sign In
          </a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ width: '100%', maxWidth: '480px', border: '1px solid rgba(212,130,10,0.2)', borderRadius: '8px', padding: '48px', background: 'rgba(44,34,24,0.5)' }}>
        <a href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500', display: 'block', marginBottom: '40px' }}>HouseShow</a>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '8px' }}>Create your account</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '0.9rem', marginBottom: '32px' }}>Join the HouseShow network. It&apos;s free to start.</p>

        {/* Role selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          {(['musician', 'host', 'fan'] as const).map((r) => (
            <div key={r} onClick={() => setRole(r)} style={{
              border: role === r ? '1.5px solid #F0A500' : '1px solid rgba(212,130,10,0.25)',
              borderRadius: '6px', padding: '16px', textAlign: 'center', cursor: 'pointer',
              background: role === r ? 'rgba(240,165,0,0.08)' : 'transparent',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>
                {r === 'musician' ? '🎸' : r === 'host' ? '🏠' : '🎟️'}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: role === r ? '#F0A500' : '#8C7B6B', fontWeight: 500 }}>
                I&apos;m a {r === 'musician' ? 'Musician' : r === 'host' ? 'Host' : 'Fan'}
              </div>
            </div>
          ))}
        </div>

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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,130,10,0.15)' }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#8C7B6B' }}>or sign up with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212,130,10,0.15)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
            </div>
          </div>
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

          <div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#8C7B6B', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => {
                  setAgreedToTerms(e.target.checked)
                  if (e.target.checked) setTermsError('')
                }}
                style={{ marginTop: '2px' }}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#F0A500' }}>
                  Terms of Service
                </a>{' '}
                and Privacy Policy
              </span>
            </label>
            {termsError && (
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
                fontSize: '0.82rem'
              }}>
                {termsError}
              </p>
            )}
          </div>

          <button onClick={handleRegister} disabled={loading} style={{
            background: loading ? '#8C7B6B' : 'linear-gradient(135deg, #D4820A, #F0A500)',
            color: '#1A1410', border: 'none', borderRadius: '4px', padding: '14px',
            fontSize: '1rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px',
          }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: '#8C7B6B' }}>
          Already have an account?{' '}<a href="/auth/login" style={{ color: '#F0A500' }}>Sign in</a>
        </p>
      </div>
    </main>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
