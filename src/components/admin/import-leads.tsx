'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { importLeads, type ImportResult } from '@/app/admin/leads/actions'
import { DEFAULT_IMPORT_MAX } from '@/lib/leads/parse'

function summary(result: ImportResult): string {
  const parts = [`${result.added.length} añadidos`]
  if (result.duplicates.length) parts.push(`${result.duplicates.length} ya existían (${result.duplicates.join(', ')})`)
  if (result.invalid.length) parts.push(`${result.invalid.length} no válidos (${result.invalid.join(', ')})`)
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
        Importar
      </Label>
      <p className="text-sm text-muted-foreground">
        Pega handles o enlaces de Instagram, uno por línea (máx. {DEFAULT_IMPORT_MAX}). Se añaden como
        &ldquo;Encontrado&rdquo;, sin prioridad, y se ignoran los que ya existen.
      </p>
      <Textarea
        id="import-handles"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'@fotografo_vt\nhttps://instagram.com/otro.fotografo/'}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-10 px-5" disabled={isPending || text.trim() === ''}>
          {isPending ? 'Importando…' : 'Importar'}
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
