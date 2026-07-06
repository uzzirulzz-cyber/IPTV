'use client'

/**
 * Playbeat logo — matches the reference design.
 *
 * "PLAY" in white, "BEAT" in blue gradient.
 * Play button triangle in blue, integrated into the "P".
 * Pure black background aesthetic.
 */

interface PlaybeatLogoProps {
  className?: string
  showTagline?: boolean
}

export function PlaybeatLogo({ className = '', showTagline = false }: PlaybeatLogoProps) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <LogoLetters size="sm" />
      {showTagline && (
        <span className="text-[9px] uppercase tracking-[0.25em] text-blue-400/70 mt-0.5">
          Digital
        </span>
      )}
    </div>
  )
}

export function PlaybeatLogoLarge({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <LogoLetters size="lg" />
      <span className="text-xs uppercase tracking-[0.3em] text-blue-400/60 mt-2">
        Digital Broadcasting
      </span>
    </div>
  )
}

function LogoLetters({ size }: { size: 'sm' | 'lg' }) {
  const fontSize = size === 'sm' ? 'text-2xl md:text-3xl' : 'text-5xl md:text-7xl'
  const gap = size === 'sm' ? 'gap-0' : 'gap-0'

  return (
    <div className={`flex items-end ${gap} leading-none`}>
      {/* P — white with blue play button */}
      <span className="relative inline-block">
        <span className={`font-black ${fontSize} tracking-tight text-white`}>
          P
        </span>
        {/* Play button triangle inside the P — blue */}
        <span
          className={`absolute ${size === 'sm' ? 'left-[38%] top-[30%]' : 'left-[40%] top-[32%]'} w-0 h-0`}
          style={{
            borderTop: size === 'sm' ? '5px solid transparent' : '10px solid transparent',
            borderBottom: size === 'sm' ? '5px solid transparent' : '10px solid transparent',
            borderLeft: size === 'sm' ? '7px solid #0099FF' : '14px solid #0099FF',
          }}
          aria-hidden="true"
        />
      </span>

      {/* L — white */}
      <span className={`font-black ${fontSize} tracking-tight text-white`}>L</span>

      {/* A — white */}
      <span className={`font-black ${fontSize} tracking-tight text-white`}>A</span>

      {/* Y — white */}
      <span className={`font-black ${fontSize} tracking-tight text-white`}>Y</span>

      {/* B — blue gradient */}
      <span
        className={`font-black ${fontSize} tracking-tight`}
        style={{
          background: 'linear-gradient(90deg, #0099FF 0%, #0066FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        B
      </span>

      {/* E — blue gradient */}
      <span
        className={`font-black ${fontSize} tracking-tight`}
        style={{
          background: 'linear-gradient(90deg, #0099FF 0%, #0066FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        E
      </span>

      {/* A — blue gradient */}
      <span
        className={`font-black ${fontSize} tracking-tight`}
        style={{
          background: 'linear-gradient(90deg, #0099FF 0%, #0066FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        A
      </span>

      {/* T — blue gradient */}
      <span
        className={`font-black ${fontSize} tracking-tight`}
        style={{
          background: 'linear-gradient(90deg, #0099FF 0%, #0066FF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        T
      </span>
    </div>
  )
}
