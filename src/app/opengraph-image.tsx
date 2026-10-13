import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'

export const alt = 'GradSnap — Book your graduation photographer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Same values as the light tokens in globals.css.
const BACKGROUND = '#f5f5f7'
const FOREGROUND = '#1d1d1f'
const SECONDARY = '#636366'
const PRIMARY = '#4d34d5'

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
          background: BACKGROUND,
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
          <div style={{ fontSize: 34, color: SECONDARY }}>{SITE_DESCRIPTION}</div>
        </div>
      </div>
    ),
    size
  )
}
