import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-4xl">
          ✉️
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to your inbox. Click it to activate your
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
        <p>Didn&apos;t receive it? Check your spam folder.</p>
        <Link href="/login" className="text-primary underline underline-offset-4">
          Back to login
        </Link>
      </CardContent>
    </Card>
  )
}
