import { createClient } from '@supabase/supabase-js'

// SERVER-ONLY Supabase client. Uses the service role key, which bypasses
// row-level security. Only import this in API routes, never in "use client" files.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Given the login token the browser sends, returns the verified user
// and their organization id (or null if the token is missing/invalid).
export async function getOrgFromRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    console.log('[billing] No token sent from browser')
    return null
  }

  console.log('[billing] Service key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    '| starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8))

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    console.log('[billing] getUser failed:', error?.message)
    return null
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.organization_id) {
    console.log('[billing] Profile lookup failed:', profileError?.message)
    return null
  }
  
  return { user, organizationId: profile.organization_id as string }
}