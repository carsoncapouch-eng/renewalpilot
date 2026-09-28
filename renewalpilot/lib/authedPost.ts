import { supabase } from './supabaseClient'

// POST to one of our own API routes, including the user's login token
// so the server can verify who they are.
export async function authedPost(url: string, body: object = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}