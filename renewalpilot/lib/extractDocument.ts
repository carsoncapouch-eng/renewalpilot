import { supabaseAdmin } from './supabaseAdmin'

export type Extracted = {
  document_type: string | null
  employee: string | null
  expiration_date: string | null
  issuing_authority: string | null
  document_number: string | null
  confidence: number
}

const PROMPT =
  'Look at this document and extract the following fields as JSON: document_type, employee (name if visible), ' +
  'expiration_date (YYYY-MM-DD format if possible), issuing_authority, document_number (if relevant), ' +
  'and confidence (a number 0 to 1 for how sure you are). If a field is not visible, use null.'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Files are stored as "{organizationId}/{timestamp}-{name}", so the company is the first folder
function orgIdFromPath(path: string) {
  const first = path.split('/')[0]
  return UUID_RE.test(first) ? first : null
}

// Reads a file from private storage and asks OpenAI to pull out the key details.
export async function extractFromStorage(
  path: string,
  mimeHint?: string | null
): Promise<{ data: Extracted | null; error: string | null }> {
  const { data: blob, error: downloadError } = await supabaseAdmin.storage.from('documents').download(path)
  if (downloadError || !blob) return { data: null, error: 'Could not read the file.' }
  if (blob.size > MAX_BYTES) return { data: null, error: 'File is too large to analyze (max 10 MB).' }

  const mime = blob.type || mimeHint || 'application/octet-stream'
  const lower = path.toLowerCase()
  const isPdf = mime === 'application/pdf' || lower.endsWith('.pdf')
  const isHeic = mime === 'image/heic' || mime === 'image/heif' || lower.endsWith('.heic') || lower.endsWith('.heif')

  if (isHeic) {
    return {
      data: null,
      error: "The AI can't read iPhone HEIC photos. Please type the expiration date, or upload a JPG or PDF instead.",
    }
  }

  // Daily AI limit per company (trial 25/day, paid 200/day)
  const orgId = orgIdFromPath(path)
  if (orgId) {
    const { data: allowed, error: creditError } = await supabaseAdmin.rpc('use_ai_credit', { p_org: orgId })
    if (creditError) {
      console.error('[extract] credit check failed', creditError)
      return { data: null, error: 'AI reading is unavailable right now. Please type the expiration date.' }
    }
    if (!allowed) {
      return {
        data: null,
        error: "You've reached today's limit for AI document reading. Please type the expiration date, or try again tomorrow.",
      }
    }
  }

  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')

  const filePart = isPdf
    ? { type: 'file', file: { filename: path.split('/').pop(), file_data: `data:application/pdf;base64,${base64}` } }
    : { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, filePart] }],
    }),
  })

  const json = await response.json()
  if (!response.ok) {
    console.error('[extract] OpenAI error', json.error?.message)
    return { data: null, error: 'AI reading is unavailable right now. Please type the expiration date.' }
  }

  try {
    return { data: JSON.parse(json.choices[0].message.content) as Extracted, error: null }
  } catch {
    return { data: null, error: 'AI returned an unreadable answer.' }
  }
}