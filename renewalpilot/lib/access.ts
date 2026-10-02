// Plan & trial rules, shared by the website and the email jobs.
// (The database enforces the same rules in Supabase.)

export const PLAN_EMPLOYEE_LIMITS: Record<string, number | null> = {
  starter: 10,
  business: 50,
  pro: null, // unlimited
}

export type AccessInfo = {
  plan?: string | null
  subscription_status?: string | null
  trial_ends_at?: string | null
}

export type AccessState = 'paid' | 'trial' | 'expired'

const PAID_STATUSES = ['active', 'trialing', 'past_due']

export function accessState(o: AccessInfo | null | undefined): AccessState {
  if (!o) return 'expired'
  if (o.subscription_status && PAID_STATUSES.includes(o.subscription_status)) return 'paid'
  if (o.trial_ends_at && Date.parse(o.trial_ends_at) > Date.now()) return 'trial'
  return 'expired'
}

export function hasAccess(o: AccessInfo | null | undefined) {
  return accessState(o) !== 'expired'
}

export function trialDaysLeft(o: AccessInfo | null | undefined) {
  if (!o?.trial_ends_at) return 0
  return Math.max(0, Math.ceil((Date.parse(o.trial_ends_at) - Date.now()) / 86_400_000))
}

// null = unlimited, 0 = can't add any
export function employeeLimit(o: AccessInfo | null | undefined): number | null {
  const state = accessState(o)
  if (state === 'trial') return null
  if (state === 'expired') return 0
  return PLAN_EMPLOYEE_LIMITS[o?.plan || ''] ?? null
}