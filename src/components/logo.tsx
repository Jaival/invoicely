import type { SVGProps } from 'react'

// The Invoicely mark. Keep in sync with src/app/icon.svg.
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden {...props}>
      <rect width="64" height="64" rx="14" fill="#0b1220" />
      <path
        fill="#ffffff"
        d="M16 13a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v39l-5.33-3-5.33 3-5.33-3-5.33 3-5.33-3-5.35 3z"
      />
      <rect x="23" y="18" width="18" height="3.5" rx="1.75" fill="#0b1220" />
      <rect x="23" y="25" width="11" height="3.5" rx="1.75" fill="#0b1220" />
      <path
        d="M24 37.5l5 4.5 10-10"
        fill="none"
        stroke="#00bc7d"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
