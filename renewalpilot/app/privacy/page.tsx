import type { Metadata } from 'next'
import { LegalPage, Section } from '@/app/LegalPage'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE.name}`,
}

const ul: React.CSSProperties = { paddingLeft: '1.25rem', margin: '0.5rem 0' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This Privacy Policy explains what information ${SITE.name} collects, how we use it, and the choices you have. ${SITE.name} is run by ${SITE.legalName}. We keep this simple: we only collect what we need to run the service, and we never sell your information.`}
    >
      <Section title="1. Information we collect">
        <ul style={ul}>
          <li><strong>Account information:</strong> your name, email address, company name, and login details (including Google sign-in if you use it).</li>
          <li><strong>Information you add:</strong> employees&apos; names and email addresses, requirements, expiration dates, responsible people, and notes.</li>
          <li><strong>Documents:</strong> files you or your employees upload, such as certificates, licenses and insurance documents. These may contain personal information.</li>
          <li><strong>Billing information:</strong> handled by Stripe. We see your plan and payment status, but we never see or store your full card number.</li>
          <li><strong>Technical information:</strong> basic logs such as IP address, browser type and error messages, used to keep the service secure and working.</li>
        </ul>
      </Section>

      <Section title="2. How we use it">
        <ul style={ul}>
          <li>To run {SITE.name}: store your data, track expiration dates, and show your dashboard.</li>
          <li>To send emails you asked for: reminders, overdue alerts, team invites, and account emails.</li>
          <li>To read expiration dates from uploaded documents using AI.</li>
          <li>To process payments, provide support, prevent abuse, and fix problems.</li>
        </ul>
      </Section>

      <Section title="3. AI document reading">
        <p>
          When you ask {SITE.name} to read a document, the file is sent to OpenAI to find details
          like the expiration date. Under OpenAI&apos;s API terms, data sent this way is not used to
          train their models by default. A person on your team always reviews the result before
          it is saved.
        </p>
      </Section>

      <Section title="4. Who we share information with">
        <p>We share information only with providers that help us run the service:</p>
        <ul style={ul}>
          <li><strong>Supabase:</strong> database, file storage and login</li>
          <li><strong>Vercel:</strong> website hosting</li>
          <li><strong>OpenAI:</strong> AI document reading</li>
          <li><strong>Resend:</strong> sending emails</li>
          <li><strong>Stripe:</strong> payments</li>
          <li><strong>Google:</strong> sign-in, if you choose &quot;Continue with Google&quot;</li>
        </ul>
        <p>
          We may also share information if the law requires it, or to protect the rights and safety
          of our users. <strong>We do not sell personal information</strong> and we do not use it for
          advertising.
        </p>
      </Section>

      <Section title="5. Employees and other people in an account">
        <p>
          Businesses that use {SITE.name} decide which employees and documents to add. If you are an
          employee and have questions about your information, please contact your employer first. We
          will help them respond to your request.
        </p>
      </Section>

      <Section title="6. Cookies and local storage">
        <p>
          We use your browser&apos;s storage only to keep you logged in. We do not use advertising or
          tracking cookies.
        </p>
      </Section>

      <Section title="7. How long we keep information">
        <p>
          We keep your information while your account is open. When an owner deletes a company from
          the Export &amp; delete page, we permanently delete its employees, requirements, documents,
          uploaded files and team logins. Copies in our providers&apos; backups are removed on their
          normal schedule. Stripe keeps billing records as required by law.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We protect your data with encrypted connections, private file storage, and access rules
          that keep each company&apos;s data separate. No system is perfectly secure, so please use a
          strong password and keep it private.
        </p>
      </Section>

      <Section title="9. Your choices">
        <ul style={ul}>
          <li>You can view and update your information in the app at any time.</li>
          <li>You can download your data from the Export &amp; delete page.</li>
          <li>The account owner can permanently delete the company and its data.</li>
          <li>You can ask us to access, correct or delete your personal information by emailing us.</li>
        </ul>
      </Section>

      <Section title="10. Children">
        <p>
          {SITE.name} is a tool for businesses and is not directed to children under 13. We do not
          knowingly collect information from children under 13.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          If we make important changes, we will email account owners or show a notice in the app.
          The effective date at the top always shows the latest version.
        </p>
      </Section>
    </LegalPage>
  )
}