'use client'

/**
 * Playbeat logo — stylized brand name matching the storefront reference.
 *
 * Letters are colored with solid colors for maximum browser compatibility:
 *   P/L/A/Y — silver/white (#e5e7eb)
 *   B — red (#ef4444)
 *   E — three red horizontal bars
 *   A — silver/white
 *   T — blue (#3b82f6)
 *
 * The "P" integrates a red play button triangle.
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
  const shadow = size === 'sm' ? '0 1px 1px' : '0 2px 3px'

  return (
    <div className={`flex items-end ${gap} leading-none`} style={{ textShadow: `${shadow} rgba(0,0,0,0.5)` }}>
      {/* P — silver with play button */}
      <span className="relative inline-block">
        <span className={`font-black ${fontSize} tracking-tight`} style={{ color: '#e5e7eb' }}>
          P
        </span>
        {/* Play button triangle inside the P */}
        <span
          className={`absolute ${size === 'sm' ? 'left-[40%] top-[35%]' : 'left-[42%] top-[38%]'} w-0 h-0`}
          style={{
            borderTop: size === 'sm' ? '5px solid transparent' : '10px solid transparent',
            borderBottom: size === 'sm' ? '5px solid transparent' : '10px solid transparent',
            borderLeft: size === 'sm' ? '7px solid #ef4444' : '14px solid #ef4444',
          }}
          aria-hidden="true"
        />
      </span>

      {/* L — silver */}
      <Letter color="#e5e7eb" size={fontSize}>L</Letter>

      {/* A — silver */}
      <Letter color="#e5e7eb" size={fontSize}>A</Letter>

      {/* Y — silver */}
      <Letter color="#e5e7eb" size={fontSize}>Y</Letter>

      {/* B — red */}
      <Letter color="#ef4444" size={fontSize}>B</Letter>

      {/* E — red, styled as three horizontal bars */}
      <span className={`inline-flex flex-col justify-center ${size === 'sm' ? 'gap-[3px] mb-1' : 'gap-[5px] mb-2'} mx-1`}>
        <span
          className="block rounded-full"
          style={{
            height: size === 'sm' ? '4px' : '8px',
            width: size === 'sm' ? '20px' : '40px',
            background: '#ef4444',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        />
        <span
          className="block rounded-full"
          style={{
            height: size === 'sm' ? '4px' : '8px',
            width: size === 'sm' ? '12px' : '26px',
            background: '#ef4444',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        />
        <span
          className="block rounded-full"
          style={{
            height: size === 'sm' ? '4px' : '8px',
            width: size === 'sm' ? '20px' : '40px',
            background: '#ef4444',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        />
      </span>

      {/* A — silver */}
      <Letter color="#e5e7eb" size={fontSize}>A</Letter>

      {/* T — blue */}
      <Letter color="#3b82f6" size={fontSize}>T</Letter>
    </div>
  )
}

function Letter({
  children,
  color,
  size,
}: {
  children: string
  color: string
  size: string
}) {
  return (
    <span className={`font-black ${size} tracking-tight mx-0.5`} style={{ color }}>
      {children}
    </span>
  )
}
