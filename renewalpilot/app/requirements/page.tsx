'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

type Employee = { id: string; name: string }
type Requirement = {
  id: string
  name: string
  type: string
  expiration_date: string | null
  reminder_schedule: string
  employee_id: string | null
  responsible_name: string | null
  responsible_email: string | null
  status: string | null
}

const COMPANY = 'company'

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:        { label: 'Active',        color: 'var(--signal-green)', bg: 'var(--signal-green-bg)' },
  expiring_soon: { label: 'Expiring soon', color: 'var(--signal-amber)', bg: 'var(--signal-amber-bg)' },
  expired:       { label: 'Expired',       color: 'var(--signal-red)',   bg: 'var(--signal-red-bg)' },
  overdue:       { label: 'Overdue',       color: 'var(--signal-red)',   bg: 'var(--signal-red-bg)' },
}

const primaryButton: React.CSSProperties = {
  padding: '0.6rem 1rem', background: 'var(--accent)', color: '#fff',
  border: '1px solid var(--accent)', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem',
}
const fieldStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.92rem', marginTop: 4 }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)' }
const th: React.CSSProperties = {
  padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-soft)',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
}
const td: React.CSSProperties = { padding: '0.8rem 1rem', fontSize: '0.92rem' }

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

export default function RequirementsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [responsibleEmail, setResponsibleEmail] = useState('')
  const [name, setName] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [reminderSchedule, setReminderSchedule] = useState('30 days before')
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isCompany = employeeId === COMPANY

  async function loadData() {
    const organizationId = await getCurrentOrganizationId()
    setOrgId(organizationId)
    if (!organizationId) {
      setLoading(false)
      return
    }
    const { data: emps } = await supabase.from('employees').select('id, name').eq('organization_id', organizationId).order('name')
    const { data: reqs } = await supabase.from('requirements').select('*').eq('organization_id', organizationId).order('expiration_date')
    setEmployees(emps || [])
    setRequirements(reqs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    const { error } = await supabase.from('requirements').insert({
      employee_id: isCompany ? null : employeeId,
      responsible_name: isCompany ? responsibleName.trim() || null : null,
      responsible_email: isCompany ? responsibleEmail.trim() || null : null,
      name,
      type: name,
      expiration_date: expirationDate,
      reminder_schedule: reminderSchedule,
      status: 'active',
      organization_id: orgId,
    })
    if (error) { alert(`Couldn't add requirement: ${error.message}`); return }
    setEmployeeId('')
    setResponsibleName('')
    setResponsibleEmail('')
    setName('')
    setExpirationDate('')
    setReminderSchedule('30 days before')
    setShowForm(false)
    loadData()
  }

  function assignedTo(req: Requirement) {
    if (req.employee_id) return employees.find(e => e.id === req.employee_id)?.name || 'Unknown'
    return req.responsible_name || req.responsible_email || 'Company'
  }

  async function handleDelete(req: Requirement) {
    const { count } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('requirement_id', req.id)

    const who = assignedTo(req)
    const message = count
      ? `Delete "${req.name}" for ${who}?\n\nThis will also permanently remove ${count} document${count === 1 ? '' : 's'}. This can't be undone.`
      : `Delete "${req.name}" for ${who}? This can't be undone.`
    if (!window.confirm(message)) return

    setDeletingId(req.id)
    const { error: docError } = await supabase.from('documents').delete().eq('requirement_id', req.id)
    if (docError) { alert(`Couldn't delete documents: ${docError.message}`); setDeletingId(null); return }
    const { error } = await supabase.from('requirements').delete().eq('id', req.id)
    if (error) { alert(`Couldn't delete requirement: ${error.message}`); setDeletingId(null); return }

    setRequirements(list => list.filter(r => r.id !== req.id))
    setDeletingId(null)
  }

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Requirements</h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
            Licenses, certifications, insurance and permits to keep current.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryButton}>
          {showForm ? 'Cancel' : '+ Add Requirement'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, alignItems: 'end',
            marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--surface)',
            border: '1px solid var(--line)', borderRadius: 12,
          }}
        >
          <label style={labelStyle}>
            Belongs to
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required style={fieldStyle}>
              <option value="">Select…</option>
              <option value={COMPANY}>Company-wide (not tied to an employee)</option>
              <optgroup label="Employees">
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </optgroup>
            </select>
          </label>

          {isCompany && (
            <>
              <label style={labelStyle}>
                Responsible person
                <input placeholder="e.g. Office manager’s name" value={responsibleName} onChange={e => setResponsibleName(e.target.value)} style={fieldStyle} />
              </label>
              <label style={labelStyle}>
                Their email (gets reminders)
                <input type="email" placeholder="name@company.com" value={responsibleEmail} onChange={e => setResponsibleEmail(e.target.value)} required style={fieldStyle} />
              </label>
            </>
          )}

          <label style={labelStyle}>
            Requirement
            <input
              placeholder={isCompany ? 'e.g. General Liability Insurance' : 'e.g. CPR Certification'}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Expiration date
            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} required style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            First reminder
            <select value={reminderSchedule} onChange={e => setReminderSchedule(e.target.value)} style={fieldStyle}>
              <option>7 days before</option>
              <option>30 days before</option>
              <option>60 days before</option>
              <option>90 days before</option>
            </select>
          </label>
          <button type="submit" style={primaryButton}>Save requirement</button>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : requirements.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
          No requirements yet. Click <strong>+ Add Requirement</strong> to get started.
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
                <th style={th}>Requirement</th>
                <th style={th}>Assigned to</th>
                <th style={th}>Expires</th>
                <th style={th}>Status</th>
                <th style={th}>First reminder</th>
                <th style={{ ...th, width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {requirements.map((req, i) => {
                const s = STATUS[req.status ?? 'active'] ?? STATUS.active
                return (
                  <tr
                    key={req.id}
                    style={{
                      borderBottom: i === requirements.length - 1 ? 'none' : '1px solid var(--line)',
                      opacity: deletingId === req.id ? 0.4 : 1,
                    }}
                  >
                    <td style={{ ...td, fontWeight: 500 }}>{req.name}</td>
                    <td style={{ ...td, color: 'var(--ink-soft)' }}>
                      {!req.employee_id && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--accent)', marginRight: 6 }}>
                          Company
                        </span>
                      )}
                      {assignedTo(req)}
                    </td>
                    <td style={td} className="mono">{formatDate(req.expiration_date)}</td>
                    <td style={td}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...td, color: 'var(--ink-soft)' }}>{req.reminder_schedule}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(req)}
                        disabled={deletingId === req.id}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--signal-red-bg)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        style={{
                          background: 'none', border: 'none', color: 'var(--signal-red)', cursor: 'pointer',
                          fontSize: '0.85rem', padding: '0.35rem 0.6rem', borderRadius: 6,
                        }}
                      >
                        {deletingId === req.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}