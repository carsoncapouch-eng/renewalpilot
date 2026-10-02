import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getOrgFromRequest } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const DAY = 86400000

type Auth = { user: { id: string; email?: string }; organizationId: string }

async function getAuth(req: NextRequest): Promise<Auth | null> {
  try {
    const result = (await getOrgFromRequest(req)) as unknown as Auth | null
    if (!result || !result.organizationId || !result.user) return null
    return result
  } catch {
    return null
  }
}

function toDay(s: string) {
  return Date.parse(s.slice(0, 10) + 'T00:00:00Z')
}

function cell(v: unknown) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(v)
  let s = String(v)
  // Stop spreadsheet formulas from running
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

function toCsv(rows: unknown[][]) {
  return '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

type Emp = { name: string | null; email: string | null; active: boolean | null }
type ReqRow = {
  id: string
  name: string | null
  expiration_date: string | null
  responsible_name: string | null
  responsible_email: string | null
  employee_id: string | null
  employees: Emp | Emp[] | null
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const type = String(body.type || '')
  const orgId = auth.organizationId
  const todayStr = new Date().toISOString().slice(0, 10)
  const today = toDay(todayStr)

  // ---------- REQUIREMENTS ----------
  if (type === 'requirements') {
    const { data, error } = await supabaseAdmin
      .from('requirements')
      .select('*, employees(name, email, active)')
      .eq('organization_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: docs } = await supabaseAdmin
      .from('documents')
      .select('requirement_id, status')
      .eq('organization_id', orgId)

    const approved = new Set<string>()
    const pending = new Set<string>()
    for (const d of (docs || []) as { requirement_id: string; status: string | null }[]) {
      if (d.status === 'pending_review') pending.add(d.requirement_id)
      else if (d.status !== 'archived') approved.add(d.requirement_id)
    }

    const reqs = ((data || []) as unknown as ReqRow[]).sort((a, b) => {
      if (!a.expiration_date) return 1
      if (!b.expiration_date) return -1
      return a.expiration_date.localeCompare(b.expiration_date)
    })

    const rows: unknown[][] = [
      [
        'Requirement',
        'Belongs to',
        'Employee email',
        'Responsible person',
        'Responsible email',
        'Expiration date',
        'Days left',
        'Status',
        'Document on file',
      ],
    ]

    for (const r of reqs) {
      const emp = Array.isArray(r.employees) ? r.employees[0] : r.employees
      const exp = r.expiration_date ? r.expiration_date.slice(0, 10) : ''
      const daysLeft = exp ? Math.round((toDay(exp) - today) / DAY) : null

      let status = 'On track'
      if (emp && emp.active === false) status = 'Paused'
      else if (pending.has(r.id)) status = 'Awaiting review'
      else if (!exp) status = 'No date'
      else if (daysLeft !== null && daysLeft < 0) status = 'Overdue'
      else if (daysLeft !== null && daysLeft <= 30) status = 'Expiring soon'

      rows.push([
        r.name || '',
        emp?.name || 'Company-wide',
        emp?.email || '',
        r.responsible_name || '',
        r.responsible_email || '',
        exp,
        daysLeft,
        status,
        approved.has(r.id) ? 'Yes' : 'No',
      ])
    }

    return csvResponse(toCsv(rows), `renewalpilot-requirements-${todayStr}.csv`)
  }

  // ---------- EMPLOYEES ----------
  if (type === 'employees') {
    const { data: emps, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('organization_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: reqs } = await supabaseAdmin
      .from('requirements')
      .select('employee_id, expiration_date')
      .eq('organization_id', orgId)

    const stats = new Map<string, { total: number; overdue: number; soon: number }>()
    for (const r of (reqs || []) as { employee_id: string | null; expiration_date: string | null }[]) {
      if (!r.employee_id) continue
      const s = stats.get(r.employee_id) || { total: 0, overdue: 0, soon: 0 }
      s.total++
      if (r.expiration_date) {
        const d = Math.round((toDay(r.expiration_date) - today) / DAY)
        if (d < 0) s.overdue++
        else if (d <= 30) s.soon++
      }
      stats.set(r.employee_id, s)
    }

    const list = ((emps || []) as { id: string; name: string | null; email: string | null; active: boolean | null }[])
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    const rows: unknown[][] = [
      ['Name', 'Email', 'Status', 'Requirements', 'Overdue', 'Expiring in 30 days'],
    ]
    for (const e of list) {
      const s = stats.get(e.id) || { total: 0, overdue: 0, soon: 0 }
      rows.push([
        e.name || '',
        e.email || '',
        e.active === false ? 'Inactive' : 'Active',
        s.total,
        s.overdue,
        s.soon,
      ])
    }

    return csvResponse(toCsv(rows), `renewalpilot-employees-${todayStr}.csv`)
  }

  return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })
}