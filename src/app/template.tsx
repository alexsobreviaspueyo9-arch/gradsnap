import { PageTransition } from '@/components/motion/page-transition'

export default function Template({ children }: { children: React.ReactNode }) {
  // Keeps the body's flex column layout intact for the pages below.
  return <PageTransition className="flex flex-1 flex-col">{children}</PageTransition>
}
