import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'

export const alt = 'GradSnap — Book your graduation photographer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Hex approximations of the globals.css oklch tokens (satori has no oklch).
const BACKGROUND = '#f8f8fb'
const FOREGROUND = '#1a1730'
const PRIMARY = '#4c34d6'

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: `radial-gradient(60% 80% at 85% 0%, rgba(124, 92, 255, 0.35), ${BACKGROUND} 75%)`,
          color: FOREGROUND,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: PRIMARY }}>
          {SITE_NAME}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Book your graduation photographer
          </div>
          <div style={{ fontSize: 34, opacity: 0.7 }}>{SITE_DESCRIPTION}</div>
        </div>
      </div>
    ),
    size
  )
}
