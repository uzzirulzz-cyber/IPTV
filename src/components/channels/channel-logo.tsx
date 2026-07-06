'use client'

import { useState } from 'react'
import { Tv } from 'lucide-react'

interface ChannelLogoProps {
  src?: string | null
  name: string
  className?: string
  iconClassName?: string
}

/**
 * Channel logo with graceful fallback.
 *
 * If the logo URL is missing or fails to load, shows a colored circle
 * with the channel's first letter (or a TV icon for empty names).
 *
 * The color is deterministically chosen from the channel name so the
 * same channel always gets the same color.
 */
const COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-blue-600/20 text-blue-400',
  'bg-amber-500/20 text-amber-400',
  'bg-blue-500/20 text-blue-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-violet-500/20 text-violet-400',
  'bg-pink-500/20 text-pink-400',
  'bg-blue-500/20 text-blue-400',
]

function getColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitial(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '')
  return cleaned.charAt(0).toUpperCase() || '?'
}

export function ChannelLogo({ src, name, className = '', iconClassName = '' }: ChannelLogoProps) {
  // Use a key-based reset: when src changes, the component remounts via the key prop
  // from the parent, so we don't need useEffect to reset failed state.
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    const color = getColor(name)
    return (
      <div
        className={`flex items-center justify-center rounded-xl ${color} ${className}`}
      >
        {name ? (
          <span className={`text-2xl font-bold ${iconClassName}`}>
            {getInitial(name)}
          </span>
        ) : (
          <Tv className={`h-8 w-8 ${iconClassName}`} />
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
