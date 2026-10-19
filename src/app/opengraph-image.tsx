import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const alt = 'Invoicely: create, send, and get paid for invoices'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Hex equivalents of the dark theme tokens (Satori has no OKLCH support).
const colors = {
  background: '#020618', // slate-950
  foreground: '#f8fafc', // slate-50
  muted: '#90a1b9', // slate-400
  primary: '#00bc7d', // emerald-500
}

export default async function Image() {
  const icon = await readFile(join(process.cwd(), 'src/app/icon.svg'))
  const iconSrc = `data:image/svg+xml;base64,${icon.toString('base64')}`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 96px',
        background: colors.background,
        color: colors.foreground,
        borderLeft: `16px solid ${colors.primary}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} width={128} height={128} alt="" />
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
          Invoicely
        </div>
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 40,
          lineHeight: 1.3,
          color: colors.muted,
          maxWidth: 860,
        }}
      >
        Create professional invoices in minutes, send them instantly, and get
        paid faster.
      </div>
    </div>,
    size,
  )
}
