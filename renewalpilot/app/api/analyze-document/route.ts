import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'
import { extractFromStorage } from '@/lib/extractDocument'

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

  // 3. Read it with AI (shared code: daily limit, size check, HEIC check)
  const { data, error } = await extractFromStorage(
    storagePath(doc.file_url),
    doc.document_type,
    auth.organizationId
  )

  if (error || !data) {
    return NextResponse.json({ error: error || 'AI request failed' }, { status: 400 })
  }

  return NextResponse.json(data)
}