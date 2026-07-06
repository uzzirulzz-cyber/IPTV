'use client'

import { useState } from 'react'
import { PlaybeatLogo } from './playbeat-logo'

const BG_IMAGES = [
  '/bg/bg1.jpg',
  '/bg/bg2.jpg',
  '/bg/bg3.jpg',
  '/bg/bg4.jpg',
  '/bg/bg5.jpg',
  '/bg/bg6.jpg',
]

interface AppFooterProps {
  label?: string
}

/**
 * App footer with a random background image.
 * The image is picked once on mount and stays stable for the session.
 * A dark overlay ensures the footer text is always readable.
 */
export function AppFooter({ label = 'Live IPTV streaming' }: AppFooterProps) {
  const [bgIndex] = useState(() => Math.floor(Math.random() * BG_IMAGES.length))

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border/40">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_IMAGES[bgIndex]})` }}
        aria-hidden="true"
      />
      {/* Dark gradient overlay for readability */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/50"
        aria-hidden="true"
      />

      {/* Footer content */}
      <div className="relative z-10 py-8 px-4 md:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlaybeatLogo showTagline />
            <span className="text-white/40 text-xs">·</span>
            <span className="text-xs text-white/80">{label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-xs">Powered by MongoDB · HLS.js · Next.js</span>
          </div>
        </div>
        <div className="relative z-10 mt-4 text-center text-[10px] text-white/40">
          © {new Date().getFullYear()} Playbeat Digital. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
