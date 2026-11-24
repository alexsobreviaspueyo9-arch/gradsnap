'use client'

import { useEffect, useRef, useState, type ElementType } from 'react'
import { cn } from '@/lib/utils'

// Scroll-reveal that degrades safely: the server render and the no-JS state are
// fully visible. On the client it only hides elements that start below the fold,
// then fades them up once as they scroll in. Under prefers-reduced-motion nothing
// hides and nothing animates (Web Interface Guidelines: honour reduced motion,
// animate transform/opacity only, never hide content behind JS).
type RevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: ElementType
}

export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [armed, setArmed] = useState(false) // hide only after we confirm it is off-screen
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const rect = el.getBoundingClientRect()
    const belowFold = rect.top > window.innerHeight * 0.85
    if (!belowFold) {
      setShown(true)
      return
    }
    setArmed(true)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hidden = armed && !shown

  return (
    <Tag
      ref={ref}
      style={hidden ? undefined : { transitionDelay: `${delay}s` }}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        hidden ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100',
        className
      )}
    >
      {children}
    </Tag>
  )
}
