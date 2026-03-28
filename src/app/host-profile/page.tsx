'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface HostProfile {
  id: string
  venue_name: string
  venue_description: string
  address: string
  capacity: number
  venue_photo_url?: string
  photo_urls: string[]
  amenities: string[]
  house_rules: string
  contact_preference: 'email' | 'message'
  created_at: string
  updated_at: string
}

export default function HostProfile() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<HostProfile | null>(null)
  const [formData, setFormData] = useState({
    venue_name: '',
    venue_description: '',
    address: '',
    capacity: '',
    venue_photo_url: '',
    photo_urls: ['', '', '', '', ''],
    amenities: [] as string[],
    house_rules: '',
    contact_preference: 'email' as 'email' | 'message'
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const amenityOptions = [
    { id: 'pa_system', label: 'PA System', icon: '🎤' },
    { id: 'parking', label: 'Parking', icon: '🚗' },
    { id: 'accessible', label: 'Accessible', icon: '♿' },
    { id: 'outdoor_space', label: 'Outdoor Space', icon: '🌳' },
    { id: 'piano', label: 'Piano', icon: '🎹' },
    { id: 'air_conditioning', label: 'Air Conditioning', icon: '❄️' }
  ]

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }
      
      setUser({ id: user.id, email: user.email })
      
      // Load existing host profile
      const { data: profileData } = await supabase
        .from('host_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        setFormData({
          venue_name: profileData.venue_name || '',
          venue_description: profileData.venue_description || '',
          address: profileData.address || '',
          capacity: profileData.capacity?.toString() || '',
          venue_photo_url: profileData.venue_photo_url || '',
          photo_urls: profileData.photo_urls || ['', '', '', '', ''],
          amenities: profileData.amenities || [],
          house_rules: profileData.house_rules || '',
          contact_preference: profileData.contact_preference || 'email'
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
        venue_name: formData.venue_name,
        venue_description: formData.venue_description,
        address: formData.address,
        capacity: parseInt(formData.capacity) || 0,
        venue_photo_url: formData.venue_photo_url || null,
        photo_urls: formData.photo_urls.filter(url => url.trim() !== ''),
        amenities: formData.amenities,
        house_rules: formData.house_rules,
        contact_preference: formData.contact_preference,
        updated_at: new Date().toISOString()
      }
      
      if (profile) {
        // Update existing profile
        await supabase
          .from('host_profiles')
          .update(profileData)
          .eq('id', user.id)
      } else {
        // Create new profile
        await supabase
          .from('host_profiles')
          .insert({ ...profileData, created_at: new Date().toISOString() })
      }
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving host profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUrlChange = (index: number, value: string) => {
    setFormData(prev => {
      const newPhotoUrls = [...prev.photo_urls]
      newPhotoUrls[index] = value
      return { ...prev, photo_urls: newPhotoUrls }
    })
  }

  const handleAmenityToggle = (amenityId: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }))
  }

  const handleVenuePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setUploadingPhoto(true)

    try {
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        const venuePhotosBucket = buckets?.find((bucket) => bucket.name === 'venue-photos')

        if (!venuePhotosBucket) {
          const { error: createBucketError } = await supabase.storage.createBucket('venue-photos', {
            public: true,
            allowedMimeTypes: ['image/*']
          })

          if (createBucketError) {
            console.error('Error creating venue-photos bucket:', createBucketError)
          }
        }
      } catch (bucketError) {
        console.error('Error checking venue-photos bucket:', bucketError)
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('venue-photos')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        console.error('Venue photo upload error:', uploadError)
        alert(`Upload failed: ${uploadError.message}`)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('venue-photos')
        .getPublicUrl(fileName)

      setFormData((prev) => ({ ...prev, venue_photo_url: publicUrl }))
    } catch (error) {
      console.error('Error uploading venue photo:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload venue photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (!user) {
    return <div style={{ minHeight: '100vh', background: '#1A1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8C7B6B' }}>Loading...</p>
    </div>
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;500&display=swap');
        
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

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', color: '#D4820A', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Venue Profile Builder
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '16px' }}>
            Build Your Venue Profile
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C7B6B', fontSize: '1rem', marginBottom: '48px' }}>
            Create a detailed profile for your venue to attract the perfect musicians for your space.
          </p>

          {saveSuccess && (
            <div style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              width: 'calc(100% - 32px)',
              maxWidth: '520px',
              color: '#22c55e',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.9rem'
            }}>
              ✓ Venue profile saved successfully!
            </div>
          )}

          {/* Display existing profile */}
          {profile && (
            <div style={{
              border: '1px solid rgba(212,130,10,0.2)',
              borderRadius: '12px',
              padding: '24px',
              background: 'rgba(44,34,24,0.3)',
              marginBottom: '48px'
            }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', color: '#F5F0E8', marginBottom: '16px' }}>
                Your Venue Profile
              </h3>
              
              <div style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', color: '#F5F0E8', marginBottom: '4px' }}>
                    {profile.venue_name}
                  </h4>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C7B6B', fontSize: '0.9rem' }}>
                    Capacity: {profile.capacity} guests
                  </p>
                </div>
                
                <div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#F5F0E8', fontSize: '0.95rem', marginBottom: '8px' }}>
                    {profile.venue_description}
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C7B6B', fontSize: '0.85rem' }}>
                    📍 {profile.address}
                  </p>
                </div>

                {profile.venue_photo_url && (
                  <div>
                    <h5 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#F5F0E8', marginBottom: '12px' }}>
                      Featured Venue Photo
                    </h5>
                    <img
                      src={profile.venue_photo_url}
                      alt={`${profile.venue_name} venue`}
                      style={{
                        width: '100%',
                        maxWidth: '360px',
                        height: '220px',
                        borderRadius: '12px',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}

                {profile.amenities.length > 0 && (
                  <div>
                    <h5 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#F5F0E8', marginBottom: '8px' }}>
                      Amenities
                    </h5>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {profile.amenities.map(amenityId => {
                        const amenity = amenityOptions.find(a => a.id === amenityId)
                        return amenity ? (
                          <span key={amenityId} style={{
                            padding: '4px 8px',
                            background: 'rgba(240,165,0,0.1)',
                            border: '1px solid rgba(240,165,0,0.2)',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: '#F0A500'
                          }}>
                            {amenity.icon} {amenity.label}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {profile.photo_urls.length > 0 && (
                  <div>
                    <h5 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#F5F0E8', marginBottom: '12px' }}>
                      Venue Photos
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      {profile.photo_urls.filter(url => url.trim() !== '').map((url, index) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`Venue photo ${index + 1}`}
                          style={{ 
                            width: '100%', 
                            height: '150px', 
                            borderRadius: '8px',
                            objectFit: 'cover'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Venue Name */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Name
              </label>
              <input
                type="text"
                value={formData.venue_name}
                onChange={(e) => handleInputChange('venue_name', e.target.value)}
                placeholder="The cozy living room, Backyard stage, etc."
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

            {/* Venue Description */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Description
              </label>
              <textarea
                value={formData.venue_description}
                onChange={(e) => handleInputChange('venue_description', e.target.value)}
                placeholder="Describe your space, atmosphere, acoustics, what makes it special for live music..."
                rows={4}
                required
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

            {/* Address */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Full Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main St, City, State, ZIP"
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

            {/* Capacity */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Max Capacity (Guests)
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value)}
                placeholder="10, 25, 50, etc."
                min="1"
                max="500"
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

            {/* Venue Photo Upload */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleVenuePhotoUpload}
                disabled={uploadingPhoto}
                style={{
                  display: 'block',
                  width: '100%',
                  color: '#8C7B6B',
                  fontFamily: 'DM Sans, sans-serif',
                  marginBottom: '12px'
                }}
              />
              {formData.venue_photo_url && (
                <img
                  src={formData.venue_photo_url}
                  alt="Venue preview"
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    height: '220px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '1px solid rgba(212,130,10,0.25)'
                  }}
                />
              )}
              <p style={{
                color: '#8C7B6B',
                fontSize: '0.82rem',
                fontFamily: 'DM Sans, sans-serif',
                marginTop: '10px'
              }}>
                {uploadingPhoto ? 'Uploading venue photo...' : 'Upload a primary photo for your venue.'}
              </p>
            </div>

            {/* Photo URLs */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Venue Photos (Up to 5)
              </label>
              <div style={{ display: 'grid', gap: '12px' }}>
                {formData.photo_urls.map((url, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ 
                      fontFamily: 'Space Mono, monospace', 
                      color: '#D4820A', 
                      fontSize: '0.85rem',
                      minWidth: '60px'
                    }}>
                      Photo {index + 1}
                    </span>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handlePhotoUrlChange(index, e.target.value)}
                      placeholder="https://example.com/venue-photo.jpg"
                      style={{
                        flex: 1,
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
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Amenities
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {amenityOptions.map((amenity) => (
                  <label
                    key={amenity.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      border: formData.amenities.includes(amenity.id)
                        ? '2px solid #F0A500'
                        : '1px solid rgba(212,130,10,0.2)',
                      borderRadius: '8px',
                      background: formData.amenities.includes(amenity.id)
                        ? 'rgba(240,165,0,0.1)'
                        : 'rgba(44,34,24,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity.id)}
                      onChange={() => handleAmenityToggle(amenity.id)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '1.2rem' }}>{amenity.icon}</span>
                    <span style={{ 
                      color: '#F5F0E8', 
                      fontSize: '0.9rem',
                      fontFamily: 'DM Sans, sans-serif'
                    }}>
                      {amenity.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* House Rules */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                House Rules
              </label>
              <textarea
                value={formData.house_rules}
                onChange={(e) => handleInputChange('house_rules', e.target.value)}
                placeholder="Any rules or guidelines for musicians (e.g., load-in times, noise restrictions, equipment policy, etc.)"
                rows={3}
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

            {/* Contact Preference */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Contact Preference
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { value: 'email', label: 'Email', desc: 'Contact me directly via email' },
                  { value: 'message', label: 'In-App Message', desc: 'Send messages through HouseShow' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('contact_preference', option.value)}
                    style={{
                      flex: 1,
                      padding: '16px',
                      border: formData.contact_preference === option.value
                        ? '2px solid #F0A500'
                        : '1px solid rgba(212,130,10,0.2)',
                      borderRadius: '8px',
                      background: formData.contact_preference === option.value
                        ? 'rgba(240,165,0,0.1)'
                        : 'rgba(44,34,24,0.3)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px', color: '#F5F0E8' }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#8C7B6B' }}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
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
                fontFamily: 'DM Sans, sans-serif',
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save Venue Profile'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
