'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { usePreviewMode } from '@/components/preview/preview-mode'
import { cn } from '@/lib/utils'

// Save a photographer for later (signed-in clients; RLS keeps rows private).
export function FavoriteButton({
  photographerId,
  initialSaved,
}: {
  photographerId: string
  initialSaved: boolean
}) {
  const isPreview = usePreviewMode()
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const next = !isSaved
    setIsSaved(next)
    setError(null)
    if (isPreview) return
    setIsBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsSaved(!next)
      setError('Sign in to save photographers.')
      setIsBusy(false)
      return
    }
    const { error: saveError } = next
      ? await supabase.from('favorites').insert({ user_id: user.id, photographer_id: photographerId })
      : await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('photographer_id', photographerId)
    setIsBusy(false)
    if (saveError) {
      setIsSaved(!next)
      setError("Couldn't update your saved list. Try again.")
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 px-4"
        aria-pressed={isSaved}
        disabled={isBusy}
        onClick={toggle}
      >
        <Heart className={cn('size-4', isSaved && 'fill-current')} aria-hidden />
        {isSaved ? 'Saved' : 'Save'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
