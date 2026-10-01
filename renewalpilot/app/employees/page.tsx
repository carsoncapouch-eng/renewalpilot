'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

type Employee = {
  id: string
  name: string
  email: string
  department: string
  active: boolean | null
}

const primaryButton: React.CSSProperties = {
  padding: '0.6rem 1rem', background: 'var(--accent)', color: '#fff',
  border: '1px solid var(--accent)', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem',
}
const smallButton: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '0.35rem 0.6rem', borderRadius: 6,
}
const inputStyle: React.CSSProperties = { padding: '0.6rem 0.75rem', fontSize: '0.92rem' }
const th: React.CSSProperties = {
  padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-soft)',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
}
const td: React.CSSProperties = { padding: '0.8rem 1rem', fontSize: '0.92rem' }

const isActive = (e: Employee) => e.active !== false

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function loadEmployees() {
    const organizationId = await getCurrentOrganizationId()
    setOrgId(organizationId)
    if (!organizationId) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name')
    // Active employees first, then inactive
    const list = (data || []) as Employee[]
    list.sort((a, b) => Number(isActive(b)) - Number(isActive(a)))
    setEmployees(list)
    setLoading(false)
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    const { error } = await supabase.from('employees').insert({ name, email, department, organization_id: orgId, active: true })
    if (error) { alert(`Couldn't add employee: ${error.message}`); return }
    setName('')
    setEmail('')
    setDepartment('')
    setShowForm(false)
    loadEmployees()
  }

  async function handleDeactivate(emp: Employee) {
    if (!window.confirm(`Deactivate ${emp.name}?\n\nTheir reminders will stop and their requirements will be paused. Nothing is deleted. You can reactivate them anytime.`)) return
    setBusyId(emp.id)
    const { error } = await supabase.from('employees').update({ active: false }).eq('id', emp.id)
    if (error) { alert(`Couldn't deactivate: ${error.message}`); setBusyId(null); return }
    await supabase.from('requirements').update({ status: 'paused' }).eq('employee_id', emp.id)
    setBusyId(null)
    loadEmployees()
  }

  async function handleReactivate(emp: Employee) {
    setBusyId(emp.id)
    const { error } = await supabase.from('employees').update({ active: true }).eq('id', emp.id)
    if (error) { alert(`Couldn't reactivate: ${error.message}`); setBusyId(null); return }
    // Statuses are recalculated by the daily job; mark them active for now
    await supabase.from('requirements').update({ status: 'active' }).eq('employee_id', emp.id).eq('status', 'paused')
    setBusyId(null)
    loadEmployees()
  }

  async function handleDelete(emp: Employee) {
    const { data: reqs } = await supabase.from('requirements').select('id').eq('employee_id', emp.id)
    const reqIds = (reqs ?? []).map(r => r.id)
    const { count: docCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', emp.id)

    const extras: string[] = []
    if (reqIds.length) extras.push(`${reqIds.length} requirement${reqIds.length === 1 ? '' : 's'}`)
    if (docCount) extras.push(`${docCount} document${docCount === 1 ? '' : 's'}`)
    const message = extras.length
      ? `Permanently delete ${emp.name}?\n\nThis will also remove ${extras.join(' and ')}. This can't be undone.\n\nTip: if they left the company, use Deactivate instead to keep their history.`
      : `Permanently delete ${emp.name}? This can't be undone.`
    if (!window.confirm(message)) return

    setBusyId(emp.id)
    const steps = [
      supabase.from('documents').delete().eq('employee_id', emp.id),
      ...(reqIds.length ? [supabase.from('documents').delete().in('requirement_id', reqIds)] : []),
    ]
    for (const step of steps) {
      const { error } = await step
      if (error) { alert(`Couldn't delete documents: ${error.message}`); setBusyId(null); return }
    }
    const { error: reqError } = await supabase.from('requirements').delete().eq('employee_id', emp.id)
    if (reqError) { alert(`Couldn't delete requirements: ${reqError.message}`); setBusyId(null); return }
    const { error: empError } = await supabase.from('employees').delete().eq('id', emp.id)
    if (empError) { alert(`Couldn't delete employee: ${empError.message}`); setBusyId(null); return }

    setEmployees(list => list.filter(x => x.id !== emp.id))
    setBusyId(null)
  }

  const activeCount = employees.filter(isActive).length
  const inactiveCount = employees.length - activeCount

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Employees</h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
            {loading ? 'The people whose licenses and certifications you track.'
              : `${activeCount} active${inactiveCount ? ` · ${inactiveCount} inactive` : ''}`}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryButton}>
          {showForm ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddEmployee}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10,
            marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--surface)',
            border: '1px solid var(--line)', borderRadius: 12,
          }}
        >
          <input style={inputStyle} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
          <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={inputStyle} placeholder="Department (optional)" value={department} onChange={e => setDepartment(e.target.value)} />
          <button type="submit" style={primaryButton}>Save employee</button>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : employees.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
          No employees yet. Click <strong>+ Add Employee</strong> to get started.
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Department</th>
                <th style={th}>Status</th>
                <th style={{ ...th, width: 190 }} />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const active = isActive(emp)
                const busy = busyId === emp.id
                return (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: i === employees.length - 1 ? 'none' : '1px solid var(--line)',
                      opacity: busy ? 0.4 : active ? 1 : 0.55,
                    }}
                  >
                    <td style={{ ...td, fontWeight: 500 }}>{emp.name}</td>
                    <td style={{ ...td, color: 'var(--ink-soft)' }}>{emp.email}</td>
                    <td style={{ ...td, color: 'var(--ink-soft)' }}>{emp.department || '—'}</td>
                    <td style={td}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                        color: active ? 'var(--signal-green)' : 'var(--ink-soft)',
                        background: active ? 'var(--signal-green-bg)' : 'var(--paper)',
                        border: active ? 'none' : '1px solid var(--line)',
                      }}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => (active ? handleDeactivate(emp) : handleReactivate(emp))}
                        disabled={busy}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        style={{ ...smallButton, color: 'var(--ink-soft)' }}
                      >
                        {active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => handleDelete(emp)}
                        disabled={busy}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--signal-red-bg)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        style={{ ...smallButton, color: 'var(--signal-red)' }}
                      >
                        Delete
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