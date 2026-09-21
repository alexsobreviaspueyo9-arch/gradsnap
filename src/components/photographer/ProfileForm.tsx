'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/posthog'
import { WeeklyAvailabilityPicker } from '@/components/photographer/WeeklyAvailabilityPicker'
import {
  PHOTOGRAPHER_SPECIALTIES,
  DEPOSIT_POLICIES,
  DEPOSIT_POLICY_LABELS,
  type PhotographerProfile,
  type SocialLink,
  type WeeklyAvailability,
  type DepositPolicy,
} from '@/types/database'

const SPECIALTY_OPTIONS = [...PHOTOGRAPHER_SPECIALTIES, 'Other'] as const

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-6 rounded-3xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export function ProfileForm({ profile }: { profile: PhotographerProfile }) {
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [basePriceInput, setBasePriceInput] = useState(
    profile.base_price?.toString() ?? ''
  )
  const [priceMaxInput, setPriceMaxInput] = useState(
    profile.price_max?.toString() ?? ''
  )
  const [sessionDurationInput, setSessionDurationInput] = useState(
    profile.session_duration_minutes?.toString() ?? ''
  )
  const [specialty, setSpecialty] = useState<string>(
    profile.specialty && !PHOTOGRAPHER_SPECIALTIES.includes(
      profile.specialty as (typeof PHOTOGRAPHER_SPECIALTIES)[number]
    )
      ? 'Other'
      : (profile.specialty ?? '')
  )
  const [specialtyOther, setSpecialtyOther] = useState(
    profile.specialty_other ?? ''
  )
  const [instagramUrl, setInstagramUrl] = useState(
    profile.instagram_url ?? ''
  )
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    profile.social_links ?? []
  )
  const [weeklyAvailability, setWeeklyAvailability] =
    useState<WeeklyAvailability>(profile.weekly_availability ?? {})
  const [paymentLink, setPaymentLink] = useState(profile.payment_link ?? '')
  const [paymentTerms, setPaymentTerms] = useState(
    profile.payment_terms ?? ''
  )
  const [depositPolicy, setDepositPolicy] = useState<DepositPolicy | null>(
    profile.deposit_policy ?? null
  )

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, { label: '', url: '' }])
  }

  function updateSocialLink(index: number, field: keyof SocialLink, value: string) {
    setSocialLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    )
  }

  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    let basePrice: number | null = null
    if (basePriceInput.trim() !== '') {
      basePrice = Number.parseFloat(basePriceInput)
      if (Number.isNaN(basePrice) || basePrice < 0) {
        setError('Price must be a positive number.')
        return
      }
    }

    let priceMax: number | null = null
    if (priceMaxInput.trim() !== '') {
      priceMax = Number.parseFloat(priceMaxInput)
      if (Number.isNaN(priceMax) || priceMax < 0) {
        setError('Maximum price must be a positive number.')
        return
      }
      if (basePrice != null && priceMax < basePrice) {
        setError('Maximum price cannot be lower than the starting price.')
        return
      }
    }

    let sessionDurationMinutes: number | null = null
    if (sessionDurationInput.trim() !== '') {
      sessionDurationMinutes = Number.parseInt(sessionDurationInput, 10)
      if (Number.isNaN(sessionDurationMinutes) || sessionDurationMinutes <= 0) {
        setError('Session duration must be a positive number of minutes.')
        return
      }
    }

    if (specialty === 'Other' && specialtyOther.trim() === '') {
      setError('Describe your specialty, or pick one of the presets.')
      return
    }

    const cleanedSocialLinks = socialLinks
      .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.label !== '' && link.url !== '')

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
        price_max: priceMax,
        session_duration_minutes: sessionDurationMinutes,
        specialty: specialty === '' ? null : specialty,
        specialty_other: specialty === 'Other' ? specialtyOther.trim() : null,
        instagram_url: instagramUrl.trim() === '' ? null : instagramUrl.trim(),
        social_links: cleanedSocialLinks,
        weekly_availability: weeklyAvailability,
        payment_link: paymentLink.trim() === '' ? null : paymentLink.trim(),
        payment_terms: paymentTerms.trim() === '' ? null : paymentTerms.trim(),
        deposit_policy: depositPolicy,
      })
      .eq('user_id', user.id)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    trackEvent('photographer_profile_completed')
    setSaved(true)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Section
        title="About you"
        description="The first thing clients see on your listing."
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
            <Label htmlFor="city">City / coverage area</Label>
            <Input
              id="city"
              type="text"
              placeholder="Barcelona"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Specialty / style</Label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={specialty === option}
                onClick={() => setSpecialty(option)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  specialty === option
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground'
                )}
              >
                {specialty === option && <Check className="size-3.5" />}
                {option}
              </button>
            ))}
          </div>
          {specialty === 'Other' && (
            <Input
              type="text"
              placeholder="Describe your style"
              value={specialtyOther}
              onChange={(e) => setSpecialtyOther(e.target.value)}
              maxLength={80}
              className="mt-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell clients about your style and experience"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={5}
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {bio.length}/500
          </p>
        </div>
      </Section>

      <Section
        title="Pricing and payment"
        description="Clients pay you directly. GradSnap never handles the money."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Price per session (€)</Label>
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
            <Label htmlFor="priceMax">Up to (€, optional)</Label>
            <Input
              id="priceMax"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="300"
              value={priceMaxInput}
              onChange={(e) => setPriceMaxInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionDuration">Session length (min)</Label>
            <Input
              id="sessionDuration"
              type="number"
              step="5"
              min="0"
              inputMode="numeric"
              placeholder="60"
              value={sessionDurationInput}
              onChange={(e) => setSessionDurationInput(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label id="deposit-policy-label">How do you want to get paid?</Label>
          <div
            role="radiogroup"
            aria-labelledby="deposit-policy-label"
            className="grid gap-3 sm:grid-cols-2"
          >
            {DEPOSIT_POLICIES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={depositPolicy === option}
                onClick={() => setDepositPolicy(option)}
                className={cn(
                  'rounded-2xl border-2 p-4 text-left text-sm font-medium transition-colors',
                  depositPolicy === option
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                {DEPOSIT_POLICY_LABELS[option]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Shown on your public profile so clients know what to expect before
            booking.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment terms</Label>
            <Input
              id="paymentTerms"
              type="text"
              placeholder="e.g. 50% deposit to confirm, rest on session day"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              maxLength={140}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentLink">Payment link</Label>
            <Input
              id="paymentLink"
              type="url"
              placeholder="https://buy.stripe.com/… or https://paypal.me/…"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Use a Stripe Payment Link, PayPal.me, or anything similar. Clients
          are sent there after they book.
        </p>
      </Section>

      <Section
        title="Links"
        description="Where clients can see more of your work."
      >
        <div className="space-y-2">
          <Label htmlFor="instagramUrl">Instagram</Label>
          <Input
            id="instagramUrl"
            type="url"
            placeholder="https://instagram.com/yourhandle"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Other links</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 px-4"
              onClick={addSocialLink}
            >
              <Plus className="size-4" />
              Add link
            </Button>
          </div>
          {socialLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a portfolio site, TikTok, or anything else worth linking.
            </p>
          ) : (
            <div className="space-y-2">
              {socialLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Label (e.g. Website)"
                    aria-label="Link label"
                    value={link.label}
                    onChange={(e) => updateSocialLink(i, 'label', e.target.value)}
                    className="w-36 shrink-0 sm:w-44"
                    maxLength={40}
                  />
                  <Input
                    type="url"
                    placeholder="https://…"
                    aria-label="Link URL"
                    value={link.url}
                    onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove link"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeSocialLink(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Weekly availability"
        description="A general sense of when you are usually free. This does not book anything by itself."
      >
        <WeeklyAvailabilityPicker
          value={weeklyAvailability}
          onChange={setWeeklyAvailability}
        />
        <p className="text-xs text-muted-foreground">
          Bookable slots are managed from your{' '}
          <Link
            href="/dashboard/photographer/availability"
            className="font-medium text-primary underline underline-offset-4"
          >
            availability calendar
          </Link>
          .
        </p>
      </Section>

      <div className="sticky bottom-4 z-20 space-y-2">
        {error && (
          <Alert variant="destructive" className="bg-background shadow-lg">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-between gap-4 rounded-full bg-background/85 py-2 pr-2 pl-6 shadow-[0_12px_40px_-8px_var(--shadow-tint)] ring-1 ring-foreground/10 backdrop-blur-xl">
          <p
            aria-live="polite"
            className={cn(
              'text-sm',
              saved
                ? 'inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            )}
          >
            {saved ? (
              <>
                <Check className="size-4" /> Profile updated
              </>
            ) : (
              'Changes are saved when you press the button.'
            )}
          </p>
          <Button type="submit" className="h-11 px-7 text-base" disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
