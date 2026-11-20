'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePreviewMode } from '@/components/preview/preview-mode'
import { MESSAGE_MAX_LENGTH } from '@/lib/chat'
import type { MessageTemplate } from '@/types/database'

const TITLE_MAX = 60

// Saved replies the photographer inserts into a chat and edits before sending.
export function MessageTemplatesManager({
  userId,
  initialTemplates,
}: {
  userId: string
  initialTemplates: MessageTemplate[]
}) {
  const router = useRouter()
  const isPreview = usePreviewMode()
  const [templates, setTemplates] = useState(initialTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function startEdit(template: MessageTemplate | null) {
    setEditingId(template?.id ?? null)
    setTitle(template?.title ?? '')
    setBody(template?.body ?? '')
    setError(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setError('Give the template a title and a message.')
      return
    }
    setError(null)
    if (isPreview) return
    setIsSaving(true)
    const supabase = createClient()
    const row = { title: title.trim(), body: body.trim() }
    const { data, error: saveError } = editingId
      ? await supabase.from('message_templates').update(row).eq('id', editingId).select().single()
      : await supabase
          .from('message_templates')
          .insert({ ...row, user_id: userId })
          .select()
          .single()
    setIsSaving(false)
    if (saveError || !data) {
      setError("Couldn't save the template. Try again.")
      return
    }
    setTemplates((prev) => (editingId ? prev.map((t) => (t.id === data.id ? data : t)) : [...prev, data]))
    startEdit(null)
    router.refresh()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this template?')) return
    if (!isPreview) {
      const { error: deleteError } = await createClient().from('message_templates').delete().eq('id', id)
      if (deleteError) {
        setError("Couldn't delete the template.")
        return
      }
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    if (editingId === id) startEdit(null)
    router.refresh()
  }

  return (
    <details className="rounded-3xl bg-card p-5 sm:p-6">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
        Message templates ({templates.length})
      </summary>
      <div className="mt-4 space-y-4">
        {templates.length > 0 && (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted p-3">
                <span className="min-w-0 truncate text-sm font-medium">{t.title}</span>
                <span className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={() => startEdit(t)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-9 px-3" onClick={() => remove(t.id)}>
                    Delete
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="template-title">{editingId ? 'Edit template title' : 'New template title'}</Label>
            <Input
              id="template-title"
              maxLength={TITLE_MAX}
              placeholder="e.g. Thanks for booking"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-body">Message</Label>
            <Textarea
              id="template-body"
              rows={4}
              maxLength={MESSAGE_MAX_LENGTH}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" className="h-11 px-5" disabled={isSaving}>
              {isSaving ? 'Saving…' : editingId ? 'Save template' : 'Add template'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" className="h-11 px-4" onClick={() => startEdit(null)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </details>
  )
}
