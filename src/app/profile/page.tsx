'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  name: string
  bio: string
  photo_url: string
  user_type: 'musician' | 'host'
  spotify_url?: string
  soundcloud_url?: string
  instagram_url?: string
  facebook_url?: string
  youtube_url?: string
  website_url?: string
  created_at: string
}

export default function Profile() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    photo_url: '',
    user_type: 'musician' as 'musician' | 'host',
    spotify_url: '',
    soundcloud_url: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    website_url: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

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
          user_type: profileData.user_type || 'musician',
          spotify_url: profileData.spotify_url || '',
          soundcloud_url: profileData.soundcloud_url || '',
          instagram_url: profileData.instagram_url || '',
          facebook_url: profileData.facebook_url || '',
          youtube_url: profileData.youtube_url || '',
          website_url: profileData.website_url || ''
        })
        // Set photo preview if existing photo exists
        if (profileData.photo_url) {
          setPhotoPreview(profileData.photo_url)
        }
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
        spotify_url: formData.spotify_url || null,
        soundcloud_url: formData.soundcloud_url || null,
        instagram_url: formData.instagram_url || null,
        facebook_url: formData.facebook_url || null,
        youtube_url: formData.youtube_url || null,
        website_url: formData.website_url || null,
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB')
      return
    }

    setUploadingPhoto(true)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update form data and preview
      setFormData(prev => ({ ...prev, photo_url: publicUrl }))
      setPhotoPreview(publicUrl)

    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const getSocialLinks = () => {
    const links = []
    if (profile?.spotify_url) links.push({ name: 'Spotify', url: profile.spotify_url, icon: '🎵' })
    if (profile?.soundcloud_url) links.push({ name: 'SoundCloud', url: profile.soundcloud_url, icon: '🎧' })
    if (profile?.instagram_url) links.push({ name: 'Instagram', url: profile.instagram_url, icon: '📷' })
    if (profile?.facebook_url) links.push({ name: 'Facebook', url: profile.facebook_url, icon: '📘' })
    if (profile?.youtube_url) links.push({ name: 'YouTube', url: profile.youtube_url, icon: '🎬' })
    if (profile?.website_url) links.push({ name: 'Website', url: profile.website_url, icon: '🌐' })
    return links
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
          <a href="/dashboard" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: '#F0A500' }}>HouseShow</a>
          <a href="/dashboard" style={{ color: '#8C7B6B', fontSize: '0.9rem', textDecoration: 'none' }}>← Back to Dashboard</a>
        </nav>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Profile Builder
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Build Your Profile
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
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
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.9rem'
            }}>
              ✓ Profile saved successfully!
            </div>
          )}

          {/* Display existing profile with social links */}
          {profile && (
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              marginBottom: '48px'
            }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', color: '#F5F0E8', marginBottom: '16px' }}>
                Your Profile
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                {profile.photo_url && (
                  <img 
                    src={profile.photo_url} 
                    alt={profile.name}
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      marginRight: '16px',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', color: '#F5F0E8', marginBottom: '4px' }}>
                    {profile.name}
                  </h4>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C7B6B', fontSize: '0.9rem' }}>
                    {profile.user_type === 'musician' ? 'Musician 🎸' : 'Host 🏠'}
                  </p>
                </div>
              </div>
              
              {profile.bio && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#F5F0E8', fontSize: '0.95rem', marginBottom: '16px' }}>
                  {profile.bio}
                </p>
              )}
              
              {/* Social Links Display */}
              {profile.user_type === 'musician' && getSocialLinks().length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h5 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#F5F0E8', marginBottom: '12px' }}>
                    Connect
                  </h5>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {getSocialLinks().map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          background: 'rgba(240,165,0,0.1)',
                          border: '1px solid rgba(240,165,0,0.2)',
                          borderRadius: '6px',
                          color: '#F0A500',
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          fontFamily: 'DM Sans, sans-serif',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(240,165,0,0.2)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(240,165,0,0.1)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                        {link.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* User Type Selection */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
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
                fontFamily: 'Playfair Display, serif',
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
                  fontFamily: 'DM Sans, sans-serif'
                }}
              />
            </div>

            {/* Bio */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
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
                  fontFamily: 'DM Sans, sans-serif',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Profile Photo (Optional)
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* Photo Preview */}
                {(photoPreview || formData.photo_url) ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={photoPreview || formData.photo_url}
                      alt="Profile preview"
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #F0A500'
                      }}
                    />
                    {!uploadingPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null)
                          setFormData(prev => ({ ...prev, photo_url: '' }))
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#D4820A',
                          color: '#1A1410',
                          border: '2px solid #1A1410',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '2px dashed rgba(212,130,10,0.3)',
                    background: 'rgba(44,34,24,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8C7B6B',
                    fontSize: '2rem'
                  }}>
                    👤
                  </div>
                )}

                {/* Upload Button */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: uploadingPhoto ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    style={{
                      padding: '12px 24px',
                      background: uploadingPhoto 
                        ? 'rgba(212,130,10,0.3)' 
                        : 'rgba(240,165,0,0.1)',
                      border: '1px solid rgba(240,165,0,0.3)',
                      borderRadius: '6px',
                      color: uploadingPhoto ? '#8C7B6B' : '#F0A500',
                      fontSize: '0.9rem',
                      fontFamily: 'DM Sans, sans-serif',
                      cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Choose Photo'}
                  </button>
                </div>

                <p style={{
                  color: '#8C7B6B',
                  fontSize: '0.8rem',
                  fontFamily: 'DM Sans, sans-serif',
                  textAlign: 'center',
                  margin: 0
                }}>
                  JPG, PNG, or GIF • Max 5MB
                </p>
              </div>
            </div>

            {/* Social Links - Only for Musicians */}
            {formData.user_type === 'musician' && (
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Social Links (Optional)
                </label>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.9rem',
                      color: '#8C7B6B',
                      marginBottom: '8px'
                    }}>
                      🎵 Spotify
                    </label>
                    <input
                      type="url"
                      value={formData.spotify_url}
                      onChange={(e) => handleInputChange('spotify_url', e.target.value)}
                      placeholder="https://open.spotify.com/artist/..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '6px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '0.9rem',
                        fontFamily: 'DM Sans, sans-serif'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.9rem',
                      color: '#8C7B6B',
                      marginBottom: '8px'
                    }}>
                      🎧 SoundCloud
                    </label>
                    <input
                      type="url"
                      value={formData.soundcloud_url}
                      onChange={(e) => handleInputChange('soundcloud_url', e.target.value)}
                      placeholder="https://soundcloud.com/..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '6px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '0.9rem',
                        fontFamily: 'DM Sans, sans-serif'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.9rem',
                      color: '#8C7B6B',
                      marginBottom: '8px'
                    }}>
                      📷 Instagram
                    </label>
                    <input
                      type="url"
                      value={formData.instagram_url}
                      onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                      placeholder="https://instagram.com/..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '6px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '0.9rem',
                        fontFamily: 'DM Sans, sans-serif'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.9rem',
                      color: '#8C7B6B',
                      marginBottom: '8px'
                    }}>
                      📘 Facebook
                    </label>
                    <input
                      type="url"
                      value={formData.facebook_url}
                      onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                      placeholder="https://facebook.com/..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '6px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '0.9rem',
                        fontFamily: 'DM Sans, sans-serif'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.9rem',
                      color: '#8C7B6B',
                      marginBottom: '8px'
                    }}>
                      🎬 YouTube
                    </label>
                    <input
                      type="url"
                      value={formData.youtube_url}
                      onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                      placeholder="https://youtube.com/..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '6px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '0.9rem',
                        fontFamily: 'DM Sans, sans-serif'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.9rem',
                      color: '#8C7B6B',
                      marginBottom: '8px'
                    }}>
                      🌐 Website
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      placeholder="https://yourwebsite.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '6px',
                        background: 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        fontSize: '0.9rem',
                        fontFamily: 'DM Sans, sans-serif'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

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
                fontFamily: 'DM Sans, sans-serif',
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
