import { ImageResponse } from 'next/og'

export const alt = 'Simzzy – Instant eSIM for 150+ Countries'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a0040 0%, #330066 45%, #1a0040 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -4,
            background: 'linear-gradient(135deg, #ff2d78 0%, #9333ea 60%, #7c3aed 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
          }}
        >
          Simzzy
        </div>
        <div style={{ fontSize: 40, fontWeight: 600, marginTop: 16, display: 'flex' }}>
          Instant eSIM for 150+ Countries
        </div>
        <div style={{ fontSize: 26, color: '#b8a0d8', marginTop: 12, display: 'flex' }}>
          No physical SIM · No roaming fees · 4G / 5G
        </div>
      </div>
    ),
    { ...size },
  )
}
