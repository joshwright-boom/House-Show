'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  name: string
  bio: string
  photo_url: string
  user_type: 'musician' | 'host'
  zip_code?: string
  availability_status?: 'based_here' | 'on_tour' | 'open_to_travel'
  tour_dates?: string
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
    zip_code: '',
    availability_status: 'based_here' as 'based_here' | 'on_tour' | 'open_to_travel',
    tour_dates: '',
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
      // First check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        // No session, redirect to login
        window.location.href = '/auth/login'
        return
      }
      
      setUser({ id: session.user.id, email: session.user.email })
      
      // Load existing profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError)
      }
      
      if (profileData) {
        setProfile(profileData)
        setFormData({
          name: profileData.name || '',
          bio: profileData.bio || '',
          photo_url: profileData.photo_url || '',
          user_type: profileData.user_type || 'musician',
          zip_code: profileData.zip_code || '',
          availability_status: profileData.availability_status || 'based_here',
          tour_dates: profileData.tour_dates || '',
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
    
    // Set up auth state listener for session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = '/auth/login'
      } else {
        setUser({ id: session.user.id, email: session.user.email })
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      console.log('Saving profile data:', {
        id: user.id,
        name: formData.name,
        bio: formData.bio,
        zip_code: formData.zip_code,
        user_type: formData.user_type,
        availability_status: formData.availability_status,
        tour_dates: formData.tour_dates,
        photo_url: formData.photo_url,
        spotify_url: formData.spotify_url || null,
        soundcloud_url: formData.soundcloud_url || null,
        instagram_url: formData.instagram_url || null,
        facebook_url: formData.facebook_url || null,
        youtube_url: formData.youtube_url || null,
        website_url: formData.website_url || null,
        updated_at: new Date().toISOString()
      })
      
      const profileData = {
        id: user.id,
        name: formData.name,
        bio: formData.bio,
        zip_code: formData.zip_code,
        user_type: formData.user_type,
        availability_status: formData.availability_status,
        tour_dates: formData.tour_dates,
        photo_url: formData.photo_url,
        spotify_url: formData.spotify_url || null,
        soundcloud_url: formData.soundcloud_url || null,
        instagram_url: formData.instagram_url || null,
        facebook_url: formData.facebook_url || null,
        youtube_url: formData.youtube_url || null,
        website_url: formData.website_url || null,
        updated_at: new Date().toISOString()
      }
      
      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        })
      
      if (error) {
        console.error('Error saving profile:', error)
        alert('Failed to save profile. Please try again.')
        return
      }
      
      // Update local profile state
      setProfile({
        ...profileData,
        created_at: profile?.created_at || new Date().toISOString()
      } as Profile)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
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
      const filePath = `${user.id}/${fileName}`

      // First, check if the avatars bucket exists, create it if it doesn't
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        const avatarsBucket = buckets?.find(b => b.name === 'avatars')
        
        if (!avatarsBucket) {
          // Create the avatars bucket
          const { error: createBucketError } = await supabase.storage.createBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/*'],
            fileSizeLimit: 5242880 // 5MB
          })
          
          if (createBucketError) {
            console.error('Error creating bucket:', createBucketError)
            throw new Error('Failed to create storage bucket for avatars')
          }
          
          // Set up RLS policies for the bucket
          const { error: policyError } = await supabase.rpc('create_avatars_policies')
          if (policyError) {
            console.warn('Could not set up bucket policies:', policyError)
            // Continue anyway as the bucket might still work
          }
        }
      } catch (bucketError) {
        console.error('Error checking/creating bucket:', bucketError)
        // Continue with upload attempt
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        
        // Provide more specific error messages
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Storage bucket not found. Please contact support.')
        } else if (uploadError.message.includes('permission')) {
          throw new Error('Permission denied. Please check your account settings.')
        } else if (uploadError.message.includes('file size')) {
          throw new Error('File too large. Please choose a smaller image.')
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update form data and preview
      setFormData(prev => ({ ...prev, photo_url: publicUrl }))
      setPhotoPreview(publicUrl)

      // Also update the profile immediately if it exists
      if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', user.id)
          
        if (updateError) {
          console.error('Error updating profile photo:', updateError)
          // Don't throw error here, the photo was uploaded successfully
        } else {
          // Update local profile state
          setProfile(prev => prev ? { ...prev, photo_url: publicUrl } : null)
        }
      }

    } catch (error) {
      console.error('Error uploading photo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo. Please try again.'
      alert(errorMessage)
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

            {/* Zip Code/Location - For both Musicians and Hosts */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Zip Code
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => handleInputChange('zip_code', e.target.value)}
                placeholder="e.g., 74103"
                maxLength={5}
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
              <p style={{
                color: '#8C7B6B',
                fontSize: '0.8rem',
                fontFamily: 'DM Sans, sans-serif',
                marginTop: '8px',
                margin: 0
              }}>
                {formData.user_type === 'musician' 
                  ? 'Your zip code - helps hosts find local musicians'
                  : 'Your zip code - helps musicians find nearby shows'
                }
              </p>
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

            {/* Location and Availability - Only for Musicians */}
            {formData.user_type === 'musician' && (
              <>
                {/* Availability Status */}
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: 'Playfair Display, serif',
                    fontSize: '1.1rem',
                    color: '#F5F0E8',
                    marginBottom: '12px'
                  }}>
                    Availability Status
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { value: 'based_here', label: '🏠 Based here', desc: 'Home and available locally' },
                      { value: 'on_tour', label: '🚌 On tour', desc: 'Currently touring' },
                      { value: 'open_to_travel', label: '✈️ Open to travel', desc: 'Willing to go anywhere' }
                    ].map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => handleInputChange('availability_status', status.value)}
                        style={{
                          padding: '16px',
                          border: formData.availability_status === status.value 
                            ? '2px solid #F0A500' 
                            : '1px solid rgba(212,130,10,0.2)',
                          borderRadius: '8px',
                          background: formData.availability_status === status.value
                            ? 'rgba(240,165,0,0.1)'
                            : 'rgba(44,34,24,0.3)',
                          color: '#F5F0E8',
                          fontSize: '1rem',
                          fontFamily: 'DM Sans, sans-serif',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{status.label}</div>
                        <div style={{ fontSize: '0.85rem', color: '#8C7B6B' }}>{status.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tour Dates - Only show when "On tour" is selected */}
                {formData.availability_status === 'on_tour' && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '1.1rem',
                      color: '#F5F0E8',
                      marginBottom: '12px'
                    }}>
                      Tour Dates & Cities
                    </label>
                    <textarea
                      value={formData.tour_dates}
                      onChange={(e) => handleInputChange('tour_dates', e.target.value)}
                      placeholder="Enter your tour dates and cities, one per line:&#10;Austin, TX - Apr 3-5&#10;Dallas, TX - Apr 7-8&#10;Houston, TX - Apr 10-12"
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
                    <p style={{
                      color: '#8C7B6B',
                      fontSize: '0.8rem',
                      fontFamily: 'DM Sans, sans-serif',
                      marginTop: '8px',
                      margin: 0
                    }}>
                      Format: City, State - Date Range (one per line)
                    </p>
                  </div>
                )}
              </>
            )}

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
