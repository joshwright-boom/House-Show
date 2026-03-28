'use client'

import { useEffect, useRef, useState } from 'react'

export default function TestMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [mapStatus, setMapStatus] = useState('Loading...')
  const [pinStatus, setPinStatus] = useState('Waiting for map...')

  useEffect(() => {
    // Check if we have a Mapbox token
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!MAPBOX_TOKEN) {
      setMapStatus('❌ ERROR: No Mapbox token found')
      console.error('Mapbox token not found')
      return
    }

    // Don't create multiple maps
    if (mapRef.current) {
      setMapStatus('✅ Map already created')
      return
    }

    setMapStatus('🔄 Creating map...')

    // Load Mapbox GL JS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'
    script.onload = () => {
      try {
        const mapboxgl = (window as any).mapboxgl
        mapboxgl.accessToken = MAPBOX_TOKEN

        if (!mapContainer.current) {
          setMapStatus('❌ ERROR: Map container not found')
          return
        }

        // Create map with Tulsa coordinates
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-95.9928, 36.1539], // Tulsa, OK
          zoom: 12
        })

        mapRef.current = map
        setMapStatus('✅ Map created successfully')

        map.on('load', () => {
          setMapStatus('✅ Map loaded successfully')
          
          // Add a simple pin for testing
          try {
            const pinEl = document.createElement('div')
            pinEl.style.cssText = `
              width: 20px; height: 20px; border-radius: 50%;
              background: #ff0000;
              border: 3px solid #ffffff;
              cursor: pointer;
              box-shadow: 0 0 10px rgba(255,0,0,0.5);
            `
            pinEl.title = 'Test Pin - Tulsa, OK'
            
            new mapboxgl.Marker({ element: pinEl, anchor: 'bottom' })
              .setLngLat([-95.9928, 36.1539])
              .addTo(map)
            
            setPinStatus('✅ Test pin added successfully')
            console.log('Test pin added to map')
          } catch (pinError) {
            setPinStatus('❌ ERROR: Failed to add pin')
            console.error('Pin error:', pinError)
          }
        })

        map.on('error', (e: any) => {
          setMapStatus(`❌ ERROR: Map error - ${e.error?.message || 'Unknown error'}`)
          console.error('Map error:', e)
        })

      } catch (error) {
        setMapStatus(`❌ ERROR: Failed to create map - ${error}`)
        console.error('Map creation error:', error)
      }
    }

    script.onerror = () => {
      setMapStatus('❌ ERROR: Failed to load Mapbox script')
      console.error('Failed to load Mapbox script')
    }

    document.body.appendChild(script)

  }, [])

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: '#1a1a1a', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          color: '#ffffff', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          🗺️ Map Test Page
        </h1>
        
        <div style={{
          background: '#2a2a2a',
          border: '2px solid #444',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#ffffff', marginBottom: '15px' }}>Status</h2>
          
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#ffff00' }}>Map Status:</strong> 
            <span style={{ color: '#00ff00', marginLeft: '10px' }}>{mapStatus}</span>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#ffff00' }}>Pin Status:</strong> 
            <span style={{ color: '#00ff00', marginLeft: '10px' }}>{pinStatus}</span>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#ffff00' }}>Location:</strong> 
            <span style={{ color: '#ffffff', marginLeft: '10px' }}>Tulsa, OK (36.1539, -95.9928)</span>
          </div>
        </div>
        
        <div style={{
          background: '#2a2a2a',
          border: '2px solid #444',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#ffffff', marginBottom: '15px' }}>Map Container</h2>
          
          <div
            ref={mapContainer}
            style={{
              height: '400px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid #666'
            }}
          />
        </div>

        <div style={{
          background: '#2a2a2a',
          border: '2px solid #444',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h2 style={{ color: '#ffffff', marginBottom: '15px' }}>Instructions</h2>
          <ul style={{ color: '#cccccc', lineHeight: '1.6' }}>
            <li>You should see a dark map of Tulsa, OK</li>
            <li>There should be a red pin in the center</li>
            <li>Check the status messages above</li>
            <li>Open browser console (F12) for more details</li>
            <li>If this works, we know the map system is functional</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
