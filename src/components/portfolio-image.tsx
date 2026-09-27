'use client'

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

// next/image with a pulsing placeholder until the photo arrives. Meant for
// `fill` images: the parent must be `relative` and set the aspect ratio.
export function PortfolioImage({ className, alt, ...props }: ImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <>
      {!isLoaded && (
        <div aria-hidden className="absolute inset-0 bg-muted motion-safe:animate-pulse" />
      )}
      <Image
        {...props}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)}
        className={cn(
          'transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    </>
  )
}
