import Image from 'next/image'
import { Wordmark } from '@/components/brand/wordmark'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1fr_1.05fr]">
      <div className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="relative">
          <Wordmark />
        </div>
        <div className="relative flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1570897234456-a6d0a709574f?q=80&w=1600&auto=format&fit=crop"
          alt="Graduates celebrating together outdoors"
          fill
          sizes="50vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"
        />
        <p className="absolute right-12 bottom-12 left-12 max-w-md text-4xl leading-[1.05] font-semibold tracking-tight text-white">
          Four years, one day. Make it unforgettable.
        </p>
      </aside>
    </div>
  )
}
