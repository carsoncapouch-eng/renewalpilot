import type { Metadata } from 'next'
import { LegalPage, Section } from '@/app/LegalPage'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: `Terms of Service | ${SITE.name}`,
}

const ul: React.CSSProperties = { paddingLeft: '1.25rem', margin: '0.5rem 0' }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These Terms of Service ("Terms") are an agreement between you and ${SITE.legalName} ("${SITE.name}", "we", "us") about your use of ${SITE.name}. By creating an account or using the service, you agree to these Terms. If you are using ${SITE.name} for a business, you agree on behalf of that business.`}
    >
      <Section title="1. What RenewalPilot does">
        <p>
          {SITE.name} helps businesses keep track of licenses, certifications, insurance policies,
          permits and other items that expire. You can store documents, use AI to read expiration
          dates, assign items to employees, and send automatic reminder emails.
        </p>
      </Section>

      <Section title="2. Your account and team">
        <ul style={ul}>
          <li>You must give accurate information when you sign up and keep your login secure.</li>
          <li>You must be at least 18 years old, or have permission from a parent or guardian, to create an account for a business.</li>
          <li>
            The person who creates a company account is its owner. The owner can invite teammates,
            who can see and change the company&apos;s data. You are responsible for everything done
            under your company&apos;s account.
          </li>
        </ul>
      </Section>

      <Section title="3. Free trial, plans and billing">
        <ul style={ul}>
          <li>New companies get a 14-day free trial. No payment card is needed for the trial.</li>
          <li>
            When the trial ends without a paid plan, your account becomes read-only: you can view
            your data, but you can&apos;t add new items and reminder emails stop.
          </li>
          <li>
            Paid plans are billed monthly in advance through our payment processor, Stripe, and
            renew automatically until canceled. Each plan has a limit on active employees, shown on
            the Billing page.
          </li>
          <li>
            You can cancel anytime from the Billing page. Your plan stays active until the end of the
            period you already paid for. We do not give refunds for partial months, unless the law
            requires it.
          </li>
          <li>We may change prices with at least 30 days&apos; notice by email. New prices apply to your next billing period.</li>
        </ul>
      </Section>

      <Section title="4. Your responsibilities (important)">
        <p>
          {SITE.name} is a tracking and reminder tool. <strong>It does not guarantee that you will
          stay compliant, licensed or insured.</strong> You are responsible for:
        </p>
        <ul style={ul}>
          <li>Entering correct information and checking every expiration date.</li>
          <li>
            Reviewing dates that our AI reads from documents. AI can make mistakes, so always confirm
            the date before approving it.
          </li>
          <li>Actually renewing your licenses, certifications, insurance and permits on time.</li>
          <li>
            Making sure emails can reach the people they are sent to. Emails can be delayed, filtered
            as spam, or not delivered.
          </li>
        </ul>
      </Section>

      <Section title="5. Employee information and emails">
        <p>
          When you add employees or other people to {SITE.name}, you confirm that you have the right
          to share their information with us and to have us email them reminders on your behalf. You
          are responsible for following the laws that apply to your employees&apos; information.
        </p>
      </Section>

      <Section title="6. Your data">
        <ul style={ul}>
          <li>
            You own the data and documents you put into {SITE.name}. You give us permission to store
            and process them only to run and improve the service for you.
          </li>
          <li>You can download your data as a spreadsheet at any time from the Export &amp; delete page.</li>
          <li>The owner can permanently delete the company account and its data at any time.</li>
          <li>How we handle personal information is explained in our <a href="/privacy">Privacy Policy</a>.</li>
        </ul>
      </Section>

      <Section title="7. Acceptable use">
        <p>You agree not to:</p>
        <ul style={ul}>
          <li>Use {SITE.name} for anything illegal, or to send spam.</li>
          <li>Upload files that contain viruses or that you don&apos;t have the right to share.</li>
          <li>Try to access other companies&apos; data, break our security, or overload the service.</li>
          <li>Copy, resell or reverse-engineer the service.</li>
        </ul>
      </Section>

      <Section title="8. Other services we use">
        <p>
          {SITE.name} relies on trusted providers for hosting, storage, email, payments, sign-in and
          AI (listed in our Privacy Policy). Their services may have their own terms, and we are not
          responsible for outages on their side.
        </p>
      </Section>

      <Section title="9. Suspension and termination">
        <p>
          We may suspend or close accounts that break these Terms or don&apos;t pay. If we ever
          shut down {SITE.name}, we will give at least 30 days&apos; notice so you can export your data.
        </p>
      </Section>

      <Section title="10. Disclaimer">
        <p>
          {SITE.name} is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent
          the law allows, we make no warranties of any kind, including that the service will be
          error-free, always available, or that AI-read dates will be correct.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          To the fullest extent the law allows, {SITE.name} is not liable for indirect or
          consequential losses, including fines, penalties, lost business, or lapsed licenses,
          certifications, insurance or permits. Our total liability for any claim is limited to the
          amount you paid us in the 12 months before the claim.
        </p>
      </Section>

      <Section title="12. Changes to these Terms">
        <p>
          We may update these Terms. If the changes are important, we will email account owners or
          show a notice in the app. Continuing to use {SITE.name} after changes means you accept them.
        </p>
      </Section>

      <Section title="13. Governing law">
        <p>These Terms are governed by the laws of the State of {SITE.governingState}, United States.</p>
      </Section>
    </LegalPage>
  )
}