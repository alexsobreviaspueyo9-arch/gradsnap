'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import type { UserRole } from '@/types/database'

export default function SelectRolePage() {
  const router = useRouter()
  const supabase = createClient()

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
    })

    if (profileError && profileError.code !== '23505') {
      // 23505 = unique violation (profile already exists)
      setError(profileError.message)
      setLoading(false)
      return
    }

    // If photographer, also create photographer_profiles record
    if (role === 'photographer') {
      await supabase.from('photographer_profiles').insert({ user_id: user.id })
      router.push('/onboarding/photographer/contract')
    } else {
      router.push('/dashboard/client')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">How will you use GradSnap?</CardTitle>
            <CardDescription>
              Choose your role — you can&apos;t change this later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 gap-4">
              {(
                [
                  {
                    value: 'client' as const,
                    title: '📸 I want to book a photographer',
                    description:
                      'Browse photographer profiles, check availability and book sessions.',
                  },
                  {
                    value: 'photographer' as const,
                    title: '🎓 I am a photographer',
                    description:
                      'Create your profile, upload your portfolio and manage bookings.',
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`rounded-xl border-2 p-5 text-left transition-colors ${
                    role === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/40'
                  }`}
                >
                  <p className="font-semibold">{option.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
