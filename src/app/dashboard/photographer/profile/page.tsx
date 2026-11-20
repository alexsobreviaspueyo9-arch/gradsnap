import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { PHOTOGRAPHER_TERMS_PATH, needsTermsAcceptance } from '@/lib/photographer-terms'
import { PageHeader } from '@/components/dashboard/page-header'
import { ProfileForm } from '@/components/photographer/ProfileForm'
import { PackagesEditor } from '@/components/photographer/packages-editor'

export default async function PhotographerProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!photographerProfile) redirect('/dashboard/photographer')

  if (needsTermsAcceptance(photographerProfile)) {
    redirect(PHOTOGRAPHER_TERMS_PATH)
  }

  const { data: packages } = await supabase
    .from('photographer_packages')
    .select('*')
    .eq('photographer_id', photographerProfile.id)
    .order('sort_order')

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Your profile"
        description="This is what clients will see when they view your listing."
        action={
          <Link
            href={`/photographers/${photographerProfile.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5')}
          >
            Preview as client
          </Link>
        }
      />
      <ProfileForm profile={photographerProfile} />
      <div className="mt-6">
        <PackagesEditor photographerId={photographerProfile.id} initialPackages={packages ?? []} />
      </div>
    </div>
  )
}
