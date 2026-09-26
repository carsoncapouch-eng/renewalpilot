import { supabase } from './supabaseClient'

// Finds the logged-in user's organization. If they don't have one yet
// (e.g. they signed up before this system existed), creates one automatically.
export async function getCurrentOrganizationId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (profile?.organization_id) return profile.organization_id

  const { data: newOrg } = await supabase
    .from('organizations')
    .insert({ name: user.email || 'My Organization' })
    .select('id')
    .single()

  if (!newOrg) return null

  await supabase.from('profiles').insert({
    user_id: user.id,
    organization_id: newOrg.id,
    name: user.email,
    email: user.email,
    role: 'admin',
  })

  return newOrg.id
}