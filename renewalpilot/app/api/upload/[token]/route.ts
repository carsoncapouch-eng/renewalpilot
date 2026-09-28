import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { extractFromStorage } from '@/lib/extractDocument'

export const maxDuration = 60 // AI reading can take a few seconds

const resend = new Resend(process.env.RESEND_API_KEY)
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

type Ctx = { params: Promise<{ token: string }> }

// Looks up the requirement that this secret link belongs to
async function findRequirement(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null
  const { data } = await supabaseAdmin
    .from('requirements')
    .select('id, name, expiration_date, organization_id, employee_id, employees(name), organizations(name)')
    .eq('upload_token', token)
    .single()
  return data
}

function one<T>(x: T | T[] | null | undefined): T | null {
  return Array.isArray(x) ? x[0] ?? null : x ?? null
}

// GET: show the employee what they're uploading for
export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params
  const r = await findRequirement(token)
  if (!r) return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 404 })

  return NextResponse.json({
    requirement: r.name,
    employee: one(r.employees as { name: string } | { name: string }[] | null)?.name ?? null,
    organization: one(r.organizations as { name: string } | { name: string }[] | null)?.name ?? null,
    expiration_date: r.expiration_date,
  })
}

// POST: "start" gives the browser a one-time upload slot; "complete" saves + reads the document
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params
  const r = await findRequirement(token)
  if (!r) return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 404 })

  const body = await req.json()

  if (body.action === 'start') {
    const { fileName, contentType, size } = body as { fileName: string; contentType: string; size: number }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Please upload a PDF or a photo (JPG or PNG).' }, { status: 400 })
    }
    if (size > MAX_BYTES) {
      return NextResponse.json({ error: 'That file is too large (max 10 MB).' }, { status: 400 })
    }
    const safeName = String(fileName || 'document').replace(/[^\w.\- ]+/g, '_').slice(-100)
    const path = `${r.organization_id}/${Date.now()}-${safeName}`
    const { data, error } = await supabaseAdmin.storage.from('documents').createSignedUploadUrl(path)
    if (error || !data) return NextResponse.json({ error: 'Could not prepare the upload.' }, { status: 500 })
    return NextResponse.json({ path, uploadToken: data.token })
  }

  if (body.action === 'complete') {
    const { path, contentType } = body as { path: string; contentType: string }
    if (!path || !path.startsWith(`${r.organization_id}/`)) {
      return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 })
    }

    // 1. Save the document as "waiting for review"
    const { data: doc, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        organization_id: r.organization_id,
        requirement_id: r.id,
        employee_id: r.employee_id,
        file_url: path,
        document_type: contentType,
        status: 'pending_review',
        submitted_by: 'upload_link',
      })
      .select('id')
      .single()
    if (insertError || !doc) return NextResponse.json({ error: 'Could not save your document.' }, { status: 500 })

    // 2. Let AI read it (if this fails, the manager can still enter the date by hand)
    const { data: extracted } = await extractFromStorage(path, contentType)
    if (extracted) await supabaseAdmin.from('documents').update({ extracted }).eq('id', doc.id)

    // 3. Tell the organization's admins it's ready for review
    const employeeName = one(r.employees as { name: string } | { name: string }[] | null)?.name ?? 'An employee'
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('organization_id', r.organization_id)
      .eq('role', 'admin')
    const adminEmails = (admins ?? []).map(a => a.email).filter(Boolean) as string[]
    const to = process.env.REMINDER_TEST_EMAIL ? [process.env.REMINDER_TEST_EMAIL] : adminEmails
    const appUrl = process.env.APP_URL ?? new URL(req.url).origin

    if (to.length) {
      await resend.emails.send({
        from: process.env.REMINDER_FROM_EMAIL ?? 'RenewalPilot <onboarding@resend.dev>',
        to,
        subject: `${employeeName} uploaded a new ${r.name}. Ready for review`,
        html: `
        <div style="background:#f6f5f2;padding:32px 16px;font-family:'IBM Plex Sans',Arial,sans-serif;color:#1c2530">
          <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e1db;border-radius:12px;overflow:hidden">
            <div style="padding:18px 28px;border-bottom:1px solid #e3e1db;font-weight:700;font-size:16px">RenewalPilot</div>
            <div style="padding:28px">
              <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;color:#3f7d58;background:#eef5f0">Ready for review</span>
              <h1 style="font-size:22px;margin:16px 0 6px;font-weight:600">${r.name}</h1>
              <p style="margin:0 0 22px;color:#5b6774;font-size:14px">${employeeName} uploaded a renewal.${
                extracted?.expiration_date ? ` AI found a new expiration date of <strong style="color:#1c2530">${extracted.expiration_date}</strong>.` : ''
              }</p>
              <a href="${appUrl}/attention" style="display:inline-block;background:#3b5b6b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px">Review &amp; approve</a>
            </div>
          </div>
        </div>`,
      })
    }

    return NextResponse.json({ ok: true, expiration_date: extracted?.expiration_date ?? null })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}