import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'

const PROMPT =
  'Look at this document and extract the following fields as JSON: document_type, employee (name if visible), ' +
  'expiration_date (YYYY-MM-DD format if possible), issuing_authority, document_number (if relevant), ' +
  'and confidence (a number 0 to 1 for how sure you are). If a field is not visible, use null.'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// Older rows stored a full public URL; newer rows store just the storage path.
function storagePath(fileUrl: string) {
  const marker = '/object/public/documents/'
  const i = fileUrl.indexOf(marker)
  return i === -1 ? fileUrl : decodeURIComponent(fileUrl.slice(i + marker.length))
}

export async function POST(req: Request) {
  // 1. Must be logged in
  const auth = await getOrgFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  // 2. Document must belong to the user's organization
  const { documentId } = await req.json()
  if (!documentId) return NextResponse.json({ error: 'No document provided' }, { status: 400 })

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('file_url, document_type')
    .eq('id', documentId)
    .eq('organization_id', auth.organizationId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  // 3. Read the file privately from storage
  const path = storagePath(doc.file_url)
  const { data: blob, error: downloadError } = await supabaseAdmin.storage.from('documents').download(path)
  if (downloadError || !blob) {
    return NextResponse.json({ error: 'Could not read the file. Try re-uploading it.' }, { status: 500 })
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large to analyze (max 10 MB).' }, { status: 400 })
  }

  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
  const mime = blob.type || doc.document_type || 'application/octet-stream'
  const isPdf = mime === 'application/pdf' || path.toLowerCase().endsWith('.pdf')

  // PDFs and images are sent to OpenAI differently
  const filePart = isPdf
    ? { type: 'file', file: { filename: path.split('/').pop(), file_data: `data:application/pdf;base64,${base64}` } }
    : { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }

  // 4. Ask OpenAI to extract the details
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, filePart] }],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message || 'AI request failed' }, { status: 500 })
  }

  try {
    return NextResponse.json(JSON.parse(data.choices[0].message.content))
  } catch {
    return NextResponse.json({ error: 'AI returned an unreadable answer. Please try again.' }, { status: 500 })
  }
}