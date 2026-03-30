'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface HostProfile {
  id: string
  user_id?: string
  venue_name: string
  description?: string
  venue_description: string
  neighborhood?: string
  address: string
  available?: boolean
  has_sound_equipment?: boolean
  venue_capacity?: number
  capacity: number
  venue_photo_url?: string
  amenities: string[]
  contact_preference: 'email' | 'message'
}

export default function HostProfile() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<HostProfile | null>(null)
  const [formData, setFormData] = useState({
    venue_name: '',
    description: '',
    venue_description: '',
    neighborhood: '',
    full_address: '',
    address: '',
    available: true,
    has_sound_equipment: false,
    venue_capacity: '',
    venue_photo_url: '',
    amenities: [] as string[],
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
        .select('id, user_id, venue_name, description, venue_description, neighborhood, address, available, has_sound_equipment, venue_capacity, capacity, venue_photo_url, amenities, contact_preference')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (profileData) {
        setProfile(profileData)
        setFormData({
          venue_name: profileData.venue_name || '',
          description: profileData.description || '',
          venue_description: profileData.venue_description || '',
          neighborhood: profileData.neighborhood || '',
          full_address: profileData.address || '',
          address: profileData.address || '',
          available: profileData.available ?? true,
          has_sound_equipment: profileData.has_sound_equipment ?? false,
          venue_capacity: profileData.venue_capacity?.toString() || profileData.capacity?.toString() || '',
          venue_photo_url: profileData.venue_photo_url || '',
          amenities: profileData.amenities || [],
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
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser()

      if (!authUser) {
        console.error('Unable to save host profile: no authenticated user found')
        return
      }

      const profileData = {
        id: profile?.id || user.id,
        user_id: authUser.id,
        venue_name: formData.venue_name,
        description: formData.description || null,
        neighborhood: formData.neighborhood || null,
        venue_description: formData.venue_description,
        address: formData.full_address || formData.address,
        available: formData.available,
        has_sound_equipment: formData.has_sound_equipment,
        venue_capacity: parseInt(formData.venue_capacity) || 0,
        capacity: parseInt(formData.venue_capacity) || 0,
        venue_photo_url: formData.venue_photo_url || null,
        amenities: formData.amenities,
        contact_preference: formData.contact_preference
      }

      const { data: savedProfile, error: saveError } = await supabase
        .from('host_profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single()

      console.log('Host profile upsert response:', { data: savedProfile, error: saveError })

      if (saveError) {
        throw saveError
      }

      setProfile(savedProfile as HostProfile)
      
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

  const handleBooleanChange = (field: 'available' | 'has_sound_equipment', value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
                    Capacity: {profile.venue_capacity || profile.capacity} guests
                  </p>
                </div>
                
                <div>
                  {profile.description ? (
                    <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#D9C6A5', fontSize: '0.95rem', marginBottom: '8px' }}>
                      {profile.description}
                    </p>
                  ) : null}
                  <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#F5F0E8', fontSize: '0.95rem', marginBottom: '8px' }}>
                    {profile.venue_description}
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C7B6B', fontSize: '0.85rem' }}>
                    📍 {profile.neighborhood ? `${profile.neighborhood} • ` : ''}{profile.address}
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8C7B6B', fontSize: '0.85rem', marginTop: '6px' }}>
                    Sound Equipment: {profile.has_sound_equipment ? 'Yes' : 'No'} • Status: {profile.available ? 'Available' : 'Unavailable'}
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

            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Host Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Share a little about yourself as a host and the kind of shows you love to put on."
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

            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Neighborhood
              </label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                placeholder="Brooklyn Heights, East Nashville, South Congress..."
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
                value={formData.full_address}
                onChange={(e) => {
                  handleInputChange('full_address', e.target.value)
                  handleInputChange('address', e.target.value)
                }}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Venue Capacity
                </label>
                <input
                  type="number"
                  value={formData.venue_capacity}
                  onChange={(e) => handleInputChange('venue_capacity', e.target.value)}
                  placeholder="25, 40, 80..."
                  min="1"
                  max="500"
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

              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.1rem',
                  color: '#F5F0E8',
                  marginBottom: '12px'
                }}>
                  Sound Equipment
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { label: 'Yes', value: true },
                    { label: 'No', value: false }
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleBooleanChange('has_sound_equipment', option.value)}
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: formData.has_sound_equipment === option.value
                          ? '2px solid #F0A500'
                          : '1px solid rgba(212,130,10,0.2)',
                        borderRadius: '8px',
                        background: formData.has_sound_equipment === option.value
                          ? 'rgba(240,165,0,0.1)'
                          : 'rgba(44,34,24,0.3)',
                        color: '#F5F0E8',
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '0.95rem'
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
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

            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.1rem',
                color: '#F5F0E8',
                marginBottom: '12px'
              }}>
                Availability
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { label: 'Available', value: true, desc: 'Shown as open for new booking requests' },
                  { label: 'Unavailable', value: false, desc: 'Temporarily hide yourself from booking requests' }
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleBooleanChange('available', option.value)}
                    style={{
                      flex: 1,
                      padding: '16px',
                      border: formData.available === option.value
                        ? '2px solid #F0A500'
                        : '1px solid rgba(212,130,10,0.2)',
                      borderRadius: '8px',
                      background: formData.available === option.value
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
