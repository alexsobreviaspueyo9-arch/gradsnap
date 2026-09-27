'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const FADE_DURATION_S = 0.3

// The first page load is server-rendered and must be visible before JS runs,
// so only client-side navigations (after this flag flips) fade in.
let hasHydrated = false

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const shouldAnimate = hasHydrated && !reduceMotion

  useEffect(() => {
    hasHydrated = true
  }, [])

  return (
    <motion.div
      className={className}
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: FADE_DURATION_S, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
