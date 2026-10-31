import { useRef, useState } from 'react'

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(99, 102, 241, 0.12)',
  borderColor = 'rgba(99, 102, 241, 0.3)',
  ...props
}) {
  const divRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleFocus = () => setOpacity(1)
  const handleBlur = () => setOpacity(0)
  const handleMouseEnter = () => setOpacity(1)
  const handleMouseLeave = () => setOpacity(0)

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 transition-all duration-300 hover:border-zinc-700/80 ${className}`}
      style={{
        boxShadow: opacity > 0 ? '0 12px 30px -10px rgba(0,0,0,0.5)' : 'none',
      }}
      {...props}
    >
      {/* Spotlight glow layer */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
        aria-hidden="true"
      />
      {/* Subtle border highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300"
        style={{
          opacity,
          boxShadow: `inset 0 0 0 1px ${borderColor}`,
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
