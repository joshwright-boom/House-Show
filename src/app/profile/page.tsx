'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  name: string
  bio: string
  photo_url: string
  user_type: 'musician' | 'host'
  created_at: string
}

export default function Profile() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    photo_url: '',
    user_type: 'musician' as 'musician' | 'host'
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }
      
      setUser({ id: user.id, email: user.email })
      
      // Load existing profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        setFormData({
          name: profileData.name || '',
          bio: profileData.bio || '',
          photo_url: profileData.photo_url || '',
          user_type: profileData.user_type || 'musician'
        })
      }
    }
    
    checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      const profileData = {
        id: user.id,
        name: formData.name,
        bio: formData.bio,
        photo_url: formData.photo_url,
        user_type: formData.user_type,
        updated_at: new Date().toISOString()
      }
      
      if (profile) {
        // Update existing profile
        await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)
      } else {
        // Create new profile
        await supabase
          .from('profiles')
          .insert(profileData)
      }
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!user) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Loading...</p>
    </div>
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: #1A1410;
          color: #F5F0E8;
          font-family: 'DM Sans', sans-serif;
        }
      `}</style>
      
      <main style={{ minHeight: '100vh', background: '#1A1410', padding: '48px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
          <a href="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
          <a href="/dashboard" style={{ color: '#8C7B6B', fontSize: '0.9rem', textDecoration: 'none' }}>← Back to Dashboard</a>
        </nav>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Profile Builder
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Build Your Profile
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Create your {formData.user_type === 'musician' ? 'artist' : 'host'} profile to start connecting with the HouseShow community.
          </p>

          {saveSuccess && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '32px',
              color: '#22c55e',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9rem'
            }}>
              ✓ Profile saved successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* User Type Selection */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                I am a...
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { value: 'musician', label: 'Musician 🎸', desc: 'Looking for venues to play' },
                  { value: 'host', label: 'Host 🏠', desc: 'Looking for artists to book' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleInputChange('user_type', type.value)}
                    style={{
                      flex: 1,
                      padding: '20px',
                      border: formData.user_type === type.value 
                        ? '2px solid #F0A500' 
                        : '1px solid rgba(212,130,10,0.2)',
                      borderRadius: '8px',
                      background: formData.user_type === type.value 
                        ? 'rgba(240,165,0,0.1)' 
                        : 'rgba(44,34,24,0.3)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px', color: '#F5F0E8' }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#8C7B6B' }}>
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={formData.user_type === 'musician' ? 'Your artist name or band name' : 'Your name'}
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Bio */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder={formData.user_type === 'musician' 
                  ? 'Tell us about your music, influences, and what kind of shows you\'re looking for...' 
                  : 'Tell us about your space, what kind of music you enjoy, and what makes your venue special...'
                }
                rows={4}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif",
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Photo URL */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Photo URL (Optional)
              </label>
              <input
                type="url"
                value={formData.photo_url}
                onChange={(e) => handleInputChange('photo_url', e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid rgba(212,130,10,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(44,34,24,0.3)',
                  color: '#F5F0E8',
                  fontSize: '1rem',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: 'linear-gradient(135deg, #D4820A, #F0A500)',
                color: '#1A1410',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
