'use client'

/**
 * Playbeat logo — stylized brand name matching the storefront reference.
 *
 * Letters are colored: P/L/A/Y silver, B/E red, A silver, T blue.
 * The "P" integrates a red play button triangle. A subtle 3D metallic
 * gradient is applied via CSS text gradients.
 *
 * Two sizes: small (header) and large (home hero).
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
        <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
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
      <span className="text-xs uppercase tracking-[0.3em] text-white/50 mt-2">
        Digital Broadcasting
      </span>
    </div>
  )
}

function LogoLetters({ size }: { size: 'sm' | 'lg' }) {
  const fontSize = size === 'sm' ? 'text-2xl md:text-3xl' : 'text-5xl md:text-7xl'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'

  return (
    <div className={`flex items-end ${gap} leading-none`}>
      {/* P — silver with play button */}
      <span className="relative inline-block">
        <span
          className={`font-black ${fontSize} tracking-tight`}
          style={{
            background: 'linear-gradient(180deg, #f5f5f5 0%, #c0c0c0 40%, #8a8a8a 70%, #d4d4d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
          }}
        >
          P
        </span>
        {/* Play button triangle inside the P */}
        <span
          className={`absolute ${size === 'sm' ? 'left-[40%] top-[35%]' : 'left-[42%] top-[38%]'} w-0 h-0`}
          style={{
            borderTop: size === 'sm' ? '5px solid transparent' : '10px solid transparent',
            borderBottom: size === 'sm' ? '5px solid transparent' : '10px solid transparent',
            borderLeft: size === 'sm' ? '7px solid #ef4444' : '14px solid #ef4444',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}
          aria-hidden="true"
        />
      </span>

      {/* L — silver */}
      <LetterGradient color="silver" size={fontSize}>L</LetterGradient>

      {/* A — silver */}
      <LetterGradient color="silver" size={fontSize}>A</LetterGradient>

      {/* Y — silver */}
      <LetterGradient color="silver" size={fontSize}>Y</LetterGradient>

      {/* B — red */}
      <LetterGradient color="red" size={fontSize}>B</LetterGradient>

      {/* E — red, styled as three horizontal bars */}
      <span className={`inline-flex flex-col justify-center ${size === 'sm' ? 'gap-[3px] mb-1' : 'gap-[5px] mb-2'} mx-1`}>
        <span
          className="block rounded-full"
          style={{
            height: size === 'sm' ? '4px' : '8px',
            width: size === 'sm' ? '20px' : '40px',
            background: 'linear-gradient(180deg, #ff6b6b, #dc2626)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        />
        <span
          className="block rounded-full"
          style={{
            height: size === 'sm' ? '4px' : '8px',
            width: size === 'sm' ? '12px' : '26px',
            background: 'linear-gradient(180deg, #ff6b6b, #dc2626)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        />
        <span
          className="block rounded-full"
          style={{
            height: size === 'sm' ? '4px' : '8px',
            width: size === 'sm' ? '20px' : '40px',
            background: 'linear-gradient(180deg, #ff6b6b, #dc2626)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        />
      </span>

      {/* A — silver */}
      <LetterGradient color="silver" size={fontSize}>A</LetterGradient>

      {/* T — blue */}
      <LetterGradient color="blue" size={fontSize}>T</LetterGradient>
    </div>
  )
}

function LetterGradient({
  children,
  color,
  size,
}: {
  children: string
  color: 'silver' | 'red' | 'blue'
  size: string
}) {
  const gradients = {
    silver: 'linear-gradient(180deg, #f5f5f5 0%, #c0c0c0 40%, #8a8a8a 70%, #d4d4d4 100%)',
    red: 'linear-gradient(180deg, #ff6b6b 0%, #ef4444 40%, #b91c1c 80%, #dc2626 100%)',
    blue: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #1d4ed8 80%, #2563eb 100%)',
  }

  return (
    <span
      className={`font-black ${size} tracking-tight mx-0.5`}
      style={{
        background: gradients[color],
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
      }}
    >
      {children}
    </span>
  )
}
