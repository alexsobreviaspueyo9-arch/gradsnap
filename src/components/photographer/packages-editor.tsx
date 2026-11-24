'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePreviewMode } from '@/components/preview/preview-mode'
import type { PhotographerPackage } from '@/types/database'

export const MAX_PACKAGES = 3

type Draft = {
  id: string | null
  name: string
  duration_minutes: string
  included_photos: string
  delivery_days: string
  price: string
}

const EMPTY_DRAFT: Draft = {
  id: null,
  name: '',
  duration_minutes: '60',
  included_photos: '30',
  delivery_days: '14',
  price: '',
}

function toDraft(pkg: PhotographerPackage): Draft {
  return {
    id: pkg.id,
    name: pkg.name,
    duration_minutes: String(pkg.duration_minutes),
    included_photos: String(pkg.included_photos),
    delivery_days: String(pkg.delivery_days),
    price: String(pkg.price),
  }
}

// Same limits as the table's check constraints.
function validate(d: Draft): string | null {
  const minutes = Number(d.duration_minutes)
  const photos = Number(d.included_photos)
  const days = Number(d.delivery_days)
  const price = Number(d.price)
  if (d.name.trim() === '' || d.name.trim().length > 60) return 'Give the package a name (up to 60 characters).'
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 600) return 'Length must be 15 to 600 minutes.'
  if (!Number.isInteger(photos) || photos < 1 || photos > 2000) return 'Included photos must be 1 to 2000.'
  if (!Number.isInteger(days) || days < 1 || days > 120) return 'Delivery must be 1 to 120 days.'
  if (d.price.trim() === '' || !Number.isFinite(price) || price < 0) return 'Enter a price in dollars.'
  return null
}

function PackageRow({
  index,
  draft,
  onChange,
  onSave,
  onRemove,
  busy,
  error,
}: {
  index: number
  draft: Draft
  onChange: (next: Draft) => void
  onSave: () => void
  onRemove: () => void
  busy: boolean
  error: string | null
}) {
  const id = (field: string) => `pkg-${index}-${field}`
  const field = (key: keyof Omit<Draft, 'id'>) => ({
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...draft, [key]: e.target.value }),
  })
  return (
    <fieldset className="space-y-3 rounded-2xl border border-input p-4">
      <legend className="px-1 text-sm font-semibold">Package {index + 1}</legend>
      <div className="space-y-2">
        <Label htmlFor={id('name')}>Name</Label>
        <Input id={id('name')} maxLength={60} placeholder="e.g. Classic campus session" {...field('name')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor={id('minutes')}>Minutes</Label>
          <Input id={id('minutes')} type="number" min={15} max={600} {...field('duration_minutes')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('photos')}>Edited photos</Label>
          <Input id={id('photos')} type="number" min={1} max={2000} {...field('included_photos')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('days')}>Delivery days</Label>
          <Input id={id('days')} type="number" min={1} max={120} {...field('delivery_days')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('price')}>Price ($)</Label>
          <Input id={id('price')} type="number" min={0} step="0.01" {...field('price')} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="h-11 px-5" disabled={busy} onClick={onSave}>
          {busy ? 'Saving…' : draft.id ? 'Save package' : 'Add package'}
        </Button>
        <Button type="button" variant="ghost" className="h-11 gap-1.5 px-4" disabled={busy} onClick={onRemove}>
          <Trash2 className="size-4" aria-hidden />
          Remove
        </Button>
      </div>
    </fieldset>
  )
}

// Up to 3 packages clients pick when booking. Optional: without packages the
// profile keeps showing the price range.
export function PackagesEditor({
  photographerId,
  initialPackages,
}: {
  photographerId: string
  initialPackages: PhotographerPackage[]
}) {
  const isPreview = usePreviewMode()
  const [drafts, setDrafts] = useState<Draft[]>(initialPackages.map(toDraft))
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string | null>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const setError = (i: number, message: string | null) => setErrors((prev) => ({ ...prev, [i]: message }))
  const update = (i: number, next: Draft) => setDrafts((prev) => prev.map((d, j) => (j === i ? next : d)))

  async function save(i: number) {
    const draft = drafts[i]
    const invalid = validate(draft)
    setError(i, invalid)
    setNotice(null)
    if (invalid) return
    const row = {
      name: draft.name.trim(),
      duration_minutes: Number(draft.duration_minutes),
      included_photos: Number(draft.included_photos),
      delivery_days: Number(draft.delivery_days),
      price: Number(draft.price),
      sort_order: i,
    }
    if (isPreview) {
      setNotice('Preview: packages are not saved.')
      return
    }
    setBusyIndex(i)
    const supabase = createClient()
    const { data, error } = draft.id
      ? await supabase.from('photographer_packages').update(row).eq('id', draft.id).select().single()
      : await supabase
          .from('photographer_packages')
          .insert({ ...row, photographer_id: photographerId })
          .select()
          .single()
    setBusyIndex(null)
    if (error || !data) {
      setError(i, "Couldn't save this package. Check the values and try again.")
      return
    }
    update(i, toDraft(data))
    setNotice('Package saved.')
  }

  async function remove(i: number) {
    const draft = drafts[i]
    if (draft.id && !window.confirm('Remove this package? Existing bookings keep their details.')) return
    if (draft.id && !isPreview) {
      setBusyIndex(i)
      const { error } = await createClient().from('photographer_packages').delete().eq('id', draft.id)
      setBusyIndex(null)
      if (error) {
        setError(i, "Couldn't remove this package.")
        return
      }
    }
    setDrafts((prev) => prev.filter((_, j) => j !== i))
    setErrors({})
  }

  return (
    <section aria-labelledby="packages-editor" className="space-y-4 rounded-2xl border border-border bg-card p-6 gs-elev-1">
      <div>
        <h2 id="packages-editor" className="text-xl font-medium">
          Packages
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Up to {MAX_PACKAGES}. Clients choose one when they book; your lowest package becomes your
          &ldquo;from&rdquo; price.
        </p>
      </div>
      {drafts.map((draft, i) => (
        <PackageRow
          key={draft.id ?? `new-${i}`}
          index={i}
          draft={draft}
          onChange={(next) => update(i, next)}
          onSave={() => save(i)}
          onRemove={() => remove(i)}
          busy={busyIndex === i}
          error={errors[i] ?? null}
        />
      ))}
      {notice && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {drafts.length < MAX_PACKAGES && (
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1.5 px-5"
          onClick={() => setDrafts((prev) => [...prev, EMPTY_DRAFT])}
        >
          <Plus className="size-4" aria-hidden />
          New package
        </Button>
      )}
    </section>
  )
}
