export default function FanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1A1410', color: '#F5F0E8' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          borderBottom: '1px solid rgba(212,130,10,0.2)',
          background: 'rgba(26,20,16,0.92)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <a
            href="/fan"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: '#D4820A',
              textDecoration: 'none',
              fontSize: '1.55rem',
              fontWeight: 700
            }}
          >
            HouseShow
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/fan" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: '0.94rem' }}>Home</a>
            <a href="/shows" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: '0.94rem' }}>Discover</a>
            <a href="/fan#following" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: '0.94rem' }}>Following</a>
            <a href="/fan#saved" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: '0.94rem' }}>Saved</a>
            <a
              href="/profile"
              style={{
                color: '#F5F0E8',
                textDecoration: 'none',
                border: '1px solid rgba(212,130,10,0.25)',
                borderRadius: '999px',
                width: '34px',
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Profile"
            >
              👤
            </a>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
