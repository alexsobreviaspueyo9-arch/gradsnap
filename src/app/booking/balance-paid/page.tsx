import { CheckCircle2 } from 'lucide-react'
import { CenteredShell } from '@/components/brand/centered-shell'

export default function BalancePaidPage() {
  return (
    <CenteredShell>
      <div className="rounded-3xl bg-card p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success-fill text-success">
          <CheckCircle2 className="size-7" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Payment received
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks, your balance payment was received. The photographer has been
          notified.
        </p>
      </div>
    </CenteredShell>
  )
}
