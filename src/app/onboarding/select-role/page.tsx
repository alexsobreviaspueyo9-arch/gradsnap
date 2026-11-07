'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, GraduationCap } from 'lucide-react'
import { IconChip } from '@/components/icon-chip'
import { CenteredShell } from '@/components/brand/centered-shell'
import { trackEvent } from '@/lib/posthog'
import { takeStoredSignupSrc } from '@/lib/signup-src'
import { safeNextPath } from '@/lib/url'
import type { UserRole } from '@/types/database'

// useSearchParams (for ?next=) needs a Suspense boundary.
export default function SelectRolePage() {
  return (
    <Suspense>
      <SelectRole />
    </Suspense>
  )
}

function SelectRole() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const next = safeNextPath(searchParams.get('next'))

  const [role, setRole] = useState<UserRole>('client')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.push('/login')
      return
    }

    // Update user metadata with chosen role
    const { error: metaError } = await supabase.auth.updateUser({
      data: { role },
    })

    if (metaError) {
      setError(metaError.message)
      setLoading(false)
      return
    }

    // Create the profiles record
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      role,
      full_name: user.user_metadata?.full_name ?? user.email ?? null,
      email: user.email ?? null,
      signup_src: takeStoredSignupSrc(),
    })

    if (profileError && profileError.code !== '23505') {
      // 23505 = unique violation (profile already exists)
      setError(profileError.message)
      setLoading(false)
      return
    }

    trackEvent('signup_completed', { role })

    // If photographer, also create photographer_profiles record
    if (role === 'photographer') {
      const { error: photographerError } = await supabase
        .from('photographer_profiles')
        .insert({ user_id: user.id })

      if (photographerError && photographerError.code !== '23505') {
        setError(photographerError.message)
        setLoading(false)
        return
      }
      router.push(next ?? '/onboarding/photographer/contract')
    } else {
      router.push('/dashboard/client')
    }
  }

  return (
    <CenteredShell>
      <div>
        <Card className="rounded-3xl py-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              How will you use GradSnap?
            </CardTitle>
            <CardDescription>
              Choose your role. You can&apos;t change this later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div
              role="radiogroup"
              aria-label="Choose your role"
              className="grid grid-cols-1 gap-4"
            >
              {(
                [
                  {
                    value: 'client' as const,
                    icon: GraduationCap,
                    title: 'I want to book a photographer',
                    description:
                      'Browse photographer profiles, check availability and book sessions.',
                  },
                  {
                    value: 'photographer' as const,
                    icon: Camera,
                    title: 'I am a photographer',
                    description:
                      'Create your profile, upload your portfolio and manage bookings.',
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={role === option.value}
                  onClick={() => setRole(option.value)}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-5 text-left transition-colors ${
                    role === option.value
                      ? 'border-primary bg-accent'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <IconChip icon={option.icon} />
                  <div>
                    <p className="font-semibold">{option.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <Button
              className="h-12 w-full text-base"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </CenteredShell>
  )
}
