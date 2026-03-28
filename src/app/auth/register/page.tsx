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
