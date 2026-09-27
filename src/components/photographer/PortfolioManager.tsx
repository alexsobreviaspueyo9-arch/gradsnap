'use client'

import { useRef, useState } from 'react'
import { PortfolioImage } from '@/components/portfolio-image'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PortfolioPhoto } from '@/types/database'

const BUCKET = 'portfolio-photos'
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const MIN_PHOTOS = 3
const MAX_PHOTOS = 20

type PendingFile = {
  file: File
  previewUrl: string
}

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
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remainingSlots = MAX_PHOTOS - photos.length - pending.length

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setError(null)

    const accepted: PendingFile[] = []
    let skippedForSpace = false

    for (const file of files) {
      if (photos.length + pending.length + accepted.length >= MAX_PHOTOS) {
        skippedForSpace = true
        break
      }
      if (!file.type.startsWith('image/')) {
        setError((prev) => prev ?? `${file.name} isn't an image and was skipped.`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError((prev) => prev ?? `${file.name} is larger than 5 MB and was skipped.`)
        continue
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) })
    }

    if (skippedForSpace) {
      setError(`You can have up to ${MAX_PHOTOS} photos, some files were skipped.`)
    }

    setPending((prev) => [...prev, ...accepted])
  }

  function removePending(index: number) {
    setPending((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function cancelPending() {
    pending.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPending([])
  }

  async function handleConfirmUpload() {
    if (pending.length === 0) return

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
    const uploaded: PortfolioPhoto[] = []

    for (const { file, previewUrl } of pending) {
      const ext = file.name.includes('.')
        ? file.name.split('.').pop()
        : file.type.split('/').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setError(uploadError.message)
        URL.revokeObjectURL(previewUrl)
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

      URL.revokeObjectURL(previewUrl)

      if (insertError || !inserted) {
        await supabase.storage.from(BUCKET).remove([path])
        setError(insertError?.message ?? 'Could not save the photo.')
        continue
      }

      uploaded.push(inserted)
    }

    setPhotos((prev) => [...prev, ...uploaded])
    setPending([])
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

  const total = photos.length + pending.length

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/50 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <ImagePlus className="size-7" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-heading text-xl font-semibold tracking-tight">
              {total} of {MAX_PHOTOS} photos
            </p>
            <p className="text-sm text-muted-foreground">
              {total < MIN_PHOTOS
                ? `Add at least ${MIN_PHOTOS} so clients can see your work. Up to 5 MB each.`
                : 'JPG, PNG or WebP, up to 5 MB each.'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={pending.length > 0 ? 'outline' : 'default'}
          className="h-11 px-6 text-base"
          disabled={uploading || remainingSlots <= 0}
          onClick={() => fileInputRef.current?.click()}
        >
          {remainingSlots <= 0
            ? `Limit reached (${MAX_PHOTOS})`
            : 'Choose photos'}
        </Button>
      </div>

      {pending.length > 0 && (
        <section className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-primary/40 sm:p-6">
          <p className="font-heading text-lg font-semibold tracking-tight">
            {pending.length} photo{pending.length === 1 ? '' : 's'} ready to
            upload
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pending.map((p, i) => (
              <div key={p.previewUrl} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt="Pending upload preview"
                  className="aspect-square w-full rounded-2xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  aria-label="Remove"
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-5"
              onClick={cancelPending}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 px-5"
              onClick={handleConfirmUpload}
              disabled={uploading}
            >
              {uploading
                ? 'Uploading…'
                : `Upload ${pending.length} photo${pending.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="group overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10"
            >
              <div className="relative aspect-square w-full">
                <PortfolioImage
                  src={photo.image_url}
                  alt={photo.caption ?? 'Portfolio photo'}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete photo"
                  onClick={() => handleDelete(photo)}
                  className="absolute top-3 right-3 bg-black/60 text-white opacity-100 backdrop-blur-sm hover:bg-destructive hover:text-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <figcaption className="p-3">
                <Input
                  defaultValue={photo.caption ?? ''}
                  placeholder="Add a caption"
                  aria-label="Photo caption"
                  maxLength={120}
                  onBlur={(e) => handleCaptionBlur(photo, e.target.value)}
                />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
