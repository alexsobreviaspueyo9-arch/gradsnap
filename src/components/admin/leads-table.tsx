'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { normalizeHttpUrl } from '@/lib/url'
import { createDraftProfile, setLeadEstado } from '@/app/admin/leads/actions'
import { LEAD_ESTADOS, type Lead, type LeadEstado } from '@/types/database'

type Props = {
  leads: Lead[]
  estadoLabels: Record<LeadEstado, string>
}

const SELECT =
  'h-9 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function LeadRow({ lead, estadoLabels }: { lead: Lead; estadoLabels: Props['estadoLabels'] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const website = normalizeHttpUrl(lead.website)

  function changeEstado(estado: LeadEstado) {
    setError(null)
    startTransition(async () => {
      const result = await setLeadEstado(lead.id, estado)
      if (result.error) setError(result.error)
    })
  }

  function createDraft() {
    setError(null)
    startTransition(async () => {
      const result = await createDraftProfile(lead.id)
      if (result.error) setError(result.error)
      else setInviteLink(result.link)
    })
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setIsLinkCopied(true)
      setTimeout(() => setIsLinkCopied(false), 2000)
    } catch {
      setError("Couldn't copy. Select the link by hand.")
    }
  }

  async function copyDraft() {
    if (!lead.borrador_mensaje) return
    try {
      await navigator.clipboard.writeText(lead.borrador_mensaje)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      setError("Couldn't copy. Select the text by hand.")
    }
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <Badge variant="secondary">{lead.prioridad ?? '—'}</Badge>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium">{lead.nombre}</p>
        <p className="text-xs text-muted-foreground">
          {[lead.zona, lead.fuente].filter(Boolean).join(' · ')}
        </p>
        {lead.motivo_encaje && <p className="mt-1 text-xs text-muted-foreground">{lead.motivo_encaje}</p>}
      </td>
      <td className="px-4 py-3 text-sm">
        {lead.instagram_handle && <p>@{lead.instagram_handle.replace(/^@/, '')}</p>}
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
            {lead.website}
          </a>
        )}
        {lead.contact_email && <p className="break-all">{lead.contact_email}</p>}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3"
            disabled={!lead.borrador_mensaje}
            onClick={copyDraft}
          >
            {isCopied ? 'Copied' : 'Copy draft'}
          </Button>
          <label className="sr-only" htmlFor={`estado-${lead.id}`}>
            Status of {lead.nombre}
          </label>
          <select
            id={`estado-${lead.id}`}
            className={SELECT}
            value={lead.estado}
            disabled={isPending}
            onChange={(e) => changeEstado(e.target.value as LeadEstado)}
          >
            {LEAD_ESTADOS.map((e) => (
              <option key={e} value={e}>
                {estadoLabels[e]}
              </option>
            ))}
          </select>
          {lead.estado !== 'no_contactar' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-destructive hover:bg-destructive/10"
              disabled={isPending}
              onClick={() => changeEstado('no_contactar')}
            >
              Do not contact
            </Button>
          )}
          {lead.estado === 'respondio' && (
            <Button
              type="button"
              size="sm"
              className="h-9 px-3"
              disabled={isPending}
              onClick={createDraft}
            >
              Create draft profile
            </Button>
          )}
        </div>
        {inviteLink && (
          <div className="mt-3 rounded-2xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              Claim link for this profile (single use, expires in 14 days). Send it yourself:
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 text-xs break-all">{inviteLink}</code>
              <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={copyInviteLink}>
                {isLinkCopied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </td>
    </tr>
  )
}

export function LeadsTable({ leads, estadoLabels }: Props) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-card">
      <table className="w-full min-w-[720px] text-left">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Priority</th>
            <th scope="col" className="px-4 py-3 font-medium">Photographer</th>
            <th scope="col" className="px-4 py-3 font-medium">Contact</th>
            <th scope="col" className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} estadoLabels={estadoLabels} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
