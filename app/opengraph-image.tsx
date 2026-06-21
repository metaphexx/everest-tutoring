import { ImageResponse } from 'next/og'

export const alt = 'Everest Tutoring × Harrisdale SHS - after-school tutoring'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Branded social-share card (used for OG + Twitter previews and ad shares).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: 'linear-gradient(135deg, #00203F 0%, #0A4D8C 55%, #009DFF 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 600, color: '#9FE0FF', letterSpacing: 2, textTransform: 'uppercase' }}>
          Everest Tutoring × Harrisdale SHS
        </div>
        <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, marginTop: 28, maxWidth: 980 }}>
          After-school tutoring built for Harrisdale students.
        </div>
        <div style={{ fontSize: 34, marginTop: 34, color: 'rgba(255,255,255,0.92)' }}>
          Years 8–10 · Maths, English &amp; Science · On campus at HSHS
        </div>
      </div>
    ),
    { ...size },
  )
}
