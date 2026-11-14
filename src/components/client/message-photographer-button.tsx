'use client'

import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { MessageCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { startConversation } from '@/lib/actions/chat'
import { useDashboardBase, usePreviewMode } from '@/components/preview/preview-mode'

const CLASS = 'h-9 shrink-0 gap-1.5 px-4'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" size="sm" className={CLASS} disabled={pending}>
      <MessageCircle className="size-4" />
      {pending ? 'Opening…' : 'Message'}
    </Button>
  )
}

// Only clients see this: opens the existing chat with the photographer or
// starts one (photographers can only reply).
export function MessagePhotographerButton({ photographerId }: { photographerId: string }) {
  const isPreview = usePreviewMode()
  const clientBase = useDashboardBase('client')

  if (isPreview) {
    return (
      <Link
        href={`${clientBase}/messages`}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), CLASS)}
      >
        <MessageCircle className="size-4" />
        Message
      </Link>
    )
  }

  return (
    <form action={startConversation}>
      <input type="hidden" name="photographerId" value={photographerId} />
      <SubmitButton />
    </form>
  )
}
