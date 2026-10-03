// The trial email sequence. Edit the wording here anytime.
// Each step is sent once, on its day (or up to 3 days late if the job missed a day).

export type TrialContext = {
  firstName: string
  orgName: string
  appUrl: string
  founderName: string
  docsCount: number
}

export type TrialStep = {
  key: string
  day: number
  // Optional: only send if this returns true (otherwise the step is skipped)
  shouldSend?: (c: TrialContext) => boolean
  build: (c: TrialContext) => { subject: string; text: string }
}

export const TRIAL_STEPS: TrialStep[] = [
  {
    key: 'welcome',
    day: 0,
    build: (c) => ({
      subject: 'Welcome to RenewalPilot — want me to set it up for you?',
      text: `Hi ${c.firstName},

I'm ${c.founderName}, the founder of RenewalPilot. Thanks for trying it!

The fastest way to see it work:
1. Add one employee
2. Add one requirement (a license, certification or insurance policy) with its expiration date
3. Upload the document — the AI reads the expiration date for you

Short on time? Just reply to this email with photos or PDFs of your team's licenses and certificates, and I'll set everything up for you. It's free.

Your dashboard: ${c.appUrl}/dashboard

${c.founderName}
Founder, RenewalPilot`,
    }),
  },
  {
    key: 'day1',
    day: 1,
    shouldSend: (c) => c.docsCount < 5,
    build: (c) => ({
      subject: 'Need a hand getting set up?',
      text: `Hi ${c.firstName},

Quick check-in. Getting your documents into RenewalPilot is the only real work, and I'm happy to do it for you.

Reply to this email with photos or PDFs of your team's licenses, certifications and insurance, and I'll add them, set the expiration dates and turn on the reminders. Usually same day.

Or keep going yourself here: ${c.appUrl}/requirements

${c.founderName}`,
    }),
  },
  {
    key: 'day3',
    day: 3,
    build: (c) => ({
      subject: "Here's what your employees will see",
      text: `Hi ${c.firstName},

The best part of RenewalPilot is that you don't have to chase anyone.

Before something expires, the employee gets a short email with a secure link. They tap it, take a photo of their new certificate (no account or password needed), and it shows up in your Attention page for you to approve. Once you approve it, the new expiration date is saved and the next reminders are scheduled automatically.

If something stays overdue, your whole team gets an alert so nothing slips.

Try it: open any requirement and click "Copy employee upload link" to see exactly what they'll see.
${c.appUrl}/requirements

${c.founderName}`,
    }),
  },
  {
    key: 'day7',
    day: 7,
    build: (c) => ({
      subject: `A founding-customer offer for ${c.orgName}`,
      text: `Hi ${c.firstName},

You're one week into your RenewalPilot trial. I'm looking for my first 10 founding customers, and I'd love for ${c.orgName} to be one of them.

Founding customer deal:
- Starter for $29/month for life (normally $49)
- I'll personally set up your whole team for free
- 30-day money-back guarantee, no questions asked

All I ask is honest feedback, and a review if you're happy.

Just reply "founding" to this email and I'll set it up.

${c.founderName}
Founder, RenewalPilot`,
    }),
  },
  {
    key: 'day11',
    day: 11,
    build: (c) => ({
      subject: 'Your RenewalPilot trial ends in 3 days',
      text: `Hi ${c.firstName},

Your free trial ends in 3 days. After that, your account becomes read-only: your data stays safe, but reminder emails to your team stop until you choose a plan.

Plans start at $49/month for up to 10 active employees:
${c.appUrl}/billing

Still deciding, or need more time to try it? Just reply and let me know.

${c.founderName}`,
    }),
  },
  {
    key: 'ended',
    day: 14,
    build: (c) => ({
      subject: 'Your trial has ended — your data is safe',
      text: `Hi ${c.firstName},

Your RenewalPilot trial has ended. Everything you added is still saved, but reminder emails are paused and you can't add new items until you choose a plan.

Pick up right where you left off:
${c.appUrl}/billing

If RenewalPilot wasn't the right fit, I'd really appreciate a one-line reply telling me why. It helps me make it better.

${c.founderName}`,
    }),
  },
  {
    key: 'day21',
    day: 21,
    build: (c) => ({
      subject: 'Want 14 more days?',
      text: `Hi ${c.firstName},

If you didn't get a real chance to try RenewalPilot, no problem. Reply "yes" and I'll give ${c.orgName} 14 more free days, and I can set everything up for you too.

${c.founderName}
Founder, RenewalPilot`,
    }),
  },
]

// Turns plain text into simple HTML (keeps line breaks, makes links clickable)
export function textToHtml(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const linked = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>')
  const paragraphs = linked
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:560px">${paragraphs}</div>`
}