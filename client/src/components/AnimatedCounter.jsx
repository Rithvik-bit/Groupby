import { useEffect, useState, useRef } from 'react'

export default function AnimatedCounter({ value, duration = 1200, prefix = '', suffix = '', formatter }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
        }
      },
      { threshold: 0.2 }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [hasAnimated])

  useEffect(() => {
    if (!hasAnimated) return

    let startTime = null
    const target = typeof value === 'number' ? value : parseFloat(value) || 0
    let animationFrameId

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(easeProgress * target)
      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setDisplayValue(target)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [hasAnimated, value, duration])

  const formatted = formatter
    ? formatter(displayValue)
    : displayValue.toLocaleString('en-IN')

  return (
    <span ref={elementRef} className="tabular-nums font-mono">
      {prefix}{formatted}{suffix}
    </span>
  )
}
