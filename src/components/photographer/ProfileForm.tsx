'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { PhotographerProfile } from '@/types/database'

export function ProfileForm({ profile }: { profile: PhotographerProfile }) {
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [basePriceInput, setBasePriceInput] = useState(
    profile.base_price?.toString() ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    let basePrice: number | null = null
    if (basePriceInput.trim() !== '') {
      basePrice = Number.parseFloat(basePriceInput)
      if (Number.isNaN(basePrice) || basePrice < 0) {
        setError('Base price must be a positive number.')
        return
      }
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Your session expired. Please sign in again.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('photographer_profiles')
      .update({
        display_name: displayName.trim() === '' ? null : displayName.trim(),
        bio: bio.trim() === '' ? null : bio.trim(),
        city: city.trim() === '' ? null : city.trim(),
        base_price: basePrice,
      })
      .eq('user_id', user.id)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSaved(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile details</CardTitle>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>Profile updated.</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Alex Smith Photography"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              type="text"
              placeholder="Barcelona"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base price (€)</Label>
            <Input
              id="basePrice"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="150"
              value={basePriceInput}
              onChange={(e) => setBasePriceInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell clients about your style and experience…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={5}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/500
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Link
            href="/dashboard/photographer"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Back to dashboard
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
