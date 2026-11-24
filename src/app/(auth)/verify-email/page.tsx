import Link from 'next/link'
import { Mail } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function VerifyEmailPage() {
  return (
    <Card className="gs-elev-2">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Mail className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-medium">
          <h1>Check your email</h1>
        </CardTitle>
        <CardDescription>
          We sent a verification link to your inbox. Click it to activate your
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
        <p>Didn&apos;t receive it? Check your spam folder.</p>
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4">
          Back to login
        </Link>
      </CardContent>
    </Card>
  )
}
