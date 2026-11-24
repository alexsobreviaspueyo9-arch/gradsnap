import type { Metadata } from 'next'
import { ACCESSIBILITY_PATH } from '@/lib/site'
import { PublicShell } from '@/components/brand/public-shell'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata: Metadata = {
  title: 'Accessibility | GradSnap',
  description: 'How GradSnap works to be usable by everyone, and how to report a barrier.',
  alternates: { canonical: ACCESSIBILITY_PATH },
}

const SECTION = 'space-y-3 rounded-2xl border border-border bg-card p-6 sm:p-8 gs-elev-1'
const H2 = 'text-xl font-medium'

export default function AccessibilityPage() {
  return (
    <PublicShell>
      <PageHeader
        title="Accessibility"
        description="We want everyone to be able to find and book a graduation photographer."
      />
      <div className="max-w-3xl space-y-4 text-sm leading-relaxed">
        <section className={SECTION}>
          <h2 className={H2}>Our goal</h2>
          <p>
            We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. We test
            pages with automated tools (axe, Lighthouse) and by hand with a keyboard, and we fix what
            we find.
          </p>
        </section>
        <section className={SECTION}>
          <h2 className={H2}>What we do</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Every page can be used with a keyboard, starting with a &ldquo;Skip to content&rdquo; link.</li>
            <li>Text and controls meet at least 4.5:1 contrast, in light and dark mode.</li>
            <li>Buttons and links have touch targets of at least 44 pixels.</li>
            <li>Animations stop when your device asks for reduced motion.</li>
            <li>Form fields have labels, and errors are announced in words, not only colour.</li>
            <li>The campus map has a list alternative (&ldquo;Pick a spot&rdquo;).</li>
          </ul>
        </section>
        <section className={SECTION}>
          <h2 className={H2}>Known limitations</h2>
          <p>
            Photos uploaded by photographers may have short descriptions. The calendar is best used
            together with the date field next to it, which works with any assistive technology.
          </p>
        </section>
        <section className={SECTION}>
          <h2 className={H2}>Report a barrier</h2>
          {/* TODO(owner): replace with the real accessibility contact email. */}
          <p className="rounded-xl border border-border bg-muted p-4">
            <strong>TODO:</strong> accessibility contact email. Until it is set, write to us from the
            Contact page and mention &ldquo;accessibility&rdquo;.
          </p>
          <p>Tell us the page, what you were trying to do and the device or assistive technology you use.</p>
        </section>
      </div>
    </PublicShell>
  )
}
