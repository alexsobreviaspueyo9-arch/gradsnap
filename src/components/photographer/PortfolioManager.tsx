'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { PortfolioPhoto } from '@/types/database'

const BUCKET = 'portfolio-photos'
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export function PortfolioManager({
  photographerId,
  initialPhotos,
}: {
  photographerId: string
  initialPhotos: PortfolioPhoto[]
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setError(null)
    setUploading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Your session expired. Please sign in again.')
      setUploading(false)
      return
    }

    let nextSortOrder = photos.at(-1)?.sort_order ?? -1

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} isn't an image and was skipped.`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`${file.name} is larger than 5 MB and was skipped.`)
        continue
      }

      const ext = file.name.includes('.')
        ? file.name.split('.').pop()
        : file.type.split('/').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setError(uploadError.message)
        continue
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      nextSortOrder += 1

      const { data: inserted, error: insertError } = await supabase
        .from('portfolio_photos')
        .insert({
          photographer_id: photographerId,
          image_url: publicUrl,
          sort_order: nextSortOrder,
        })
        .select()
        .single()

      if (insertError || !inserted) {
        await supabase.storage.from(BUCKET).remove([path])
        setError(insertError?.message ?? 'Could not save the photo.')
        continue
      }

      setPhotos((prev) => [...prev, inserted])
    }

    setUploading(false)
  }

  async function handleDelete(photo: PortfolioPhoto) {
    if (!window.confirm('Delete this photo?')) return

    const { error: deleteError } = await supabase
      .from('portfolio_photos')
      .delete()
      .eq('id', photo.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))

    const marker = `/object/public/${BUCKET}/`
    const markerIndex = photo.image_url.indexOf(marker)
    if (markerIndex !== -1) {
      const path = photo.image_url.slice(markerIndex + marker.length)
      await supabase.storage.from(BUCKET).remove([path])
    }
  }

  async function handleCaptionBlur(photo: PortfolioPhoto, caption: string) {
    const trimmed = caption.trim() === '' ? null : caption.trim()
    if (trimmed === photo.caption) return

    const { error: updateError } = await supabase
      .from('portfolio_photos')
      .update({ caption: trimmed })
      .eq('id', photo.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, caption: trimmed } : p))
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        <Button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload photos'}
        </Button>
        <Link
          href="/dashboard/photographer"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Back to dashboard
        </Link>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos yet — upload your first one above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image_url}
                alt={photo.caption ?? 'Portfolio photo'}
                className="aspect-square w-full object-cover"
              />
              <CardContent className="space-y-2 pt-3">
                <Input
                  defaultValue={photo.caption ?? ''}
                  placeholder="Add a caption…"
                  maxLength={120}
                  onBlur={(e) => handleCaptionBlur(photo, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDelete(photo)}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
