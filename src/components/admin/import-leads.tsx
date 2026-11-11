'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { importLeads, type ImportResult } from '@/app/admin/leads/actions'
import { DEFAULT_IMPORT_MAX } from '@/lib/leads/parse'

function summary(result: ImportResult): string {
  const parts = [`${result.added.length} added`]
  if (result.duplicates.length) parts.push(`${result.duplicates.length} already existed (${result.duplicates.join(', ')})`)
  if (result.invalid.length) parts.push(`${result.invalid.length} invalid (${result.invalid.join(', ')})`)
  return parts.join(' · ')
}

export function ImportLeads() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const next = await importLeads(text)
      setResult(next)
      if (!next.error) setText('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 space-y-3 rounded-3xl bg-card p-5 sm:p-6">
      <Label htmlFor="import-handles" className="text-base font-semibold">
        Import
      </Label>
      <p className="text-sm text-muted-foreground">
        Paste Instagram handles or links, one per line (max {DEFAULT_IMPORT_MAX}). They&apos;re added as
        &ldquo;Found&rdquo; with no priority; ones that already exist are skipped.
      </p>
      <Textarea
        id="import-handles"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'@photographer_va\nhttps://instagram.com/another.photographer/'}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-10 px-5" disabled={isPending || text.trim() === ''}>
          {isPending ? 'Importing…' : 'Import'}
        </Button>
        {result && (
          <p
            role="status"
            className={result.error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
          >
            {result.error ?? summary(result)}
          </p>
        )}
      </div>
    </form>
  )
}
