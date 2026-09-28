import { supabase } from './supabaseClient'

// Returns the logged-in user's organization id, creating one on first login.
// The database function handles this safely, even if called several times at once.
export async function getCurrentOrganizationId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('ensure_organization')
  if (error) {
    console.error('getCurrentOrganizationId:', error.message)
    return null
  }
  return data as string
}