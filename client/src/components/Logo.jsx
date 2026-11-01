import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Reusable Official GroupBuy Logo Component
 * - Preserves aspect ratio and crisp fidelity.
 * - Uses official brand asset from /public.
 * - Supports full brand logo and icon-only emblem variants.
 */
export default function Logo({
  variant = 'full', // 'full' | 'icon'
  size = 'md',      // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  to,
  className = '',
  alt = 'GroupBuy — Buy Together. Own Together.'
}) {
  const sizeClasses = {
    full: {
      xs: 'h-6 w-auto',
      sm: 'h-8 w-auto',
      md: 'h-9 w-auto',
      lg: 'h-12 w-auto',
      xl: 'h-16 w-auto',
    },
    icon: {
      xs: 'h-6 w-6',
      sm: 'h-8 w-8',
      md: 'h-9 w-9',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    }
  }

  const selectedSize = sizeClasses[variant]?.[size] || sizeClasses.full.md
  const src = variant === 'icon' ? '/groupbuy-icon.png' : '/groupbuy-logo-transparent.png'

  const imgElement = (
    <img
      src={src}
      alt={alt}
      className={`object-contain transition-transform duration-200 ${selectedSize} ${className}`}
      loading="eager"
    />
  )

  if (to) {
    return (
      <Link
        to={to}
        className="inline-flex items-center gap-2 select-none hover:opacity-95 transition-opacity focus:outline-none"
        aria-label="GroupBuy Home"
      >
        {imgElement}
      </Link>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 select-none">
      {imgElement}
    </div>
  )
}
