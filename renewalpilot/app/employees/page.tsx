'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/lib/getOrganization'

type Employee = {
  id: string
  name: string
  email: string
  department: string
}

const primaryButton: React.CSSProperties = {
  padding: '0.6rem 1rem', background: 'var(--accent)', color: '#fff',
  border: '1px solid var(--accent)', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem',
}
const inputStyle: React.CSSProperties = { padding: '0.6rem 0.75rem', fontSize: '0.92rem' }
const th: React.CSSProperties = {
  padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-soft)',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
}
const td: React.CSSProperties = { padding: '0.8rem 1rem', fontSize: '0.92rem' }

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    setEmployees(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    const { error } = await supabase.from('employees').insert({ name, email, department, organization_id: orgId })
    if (error) { alert(`Couldn't add employee: ${error.message}`); return }
    setName('')
    setEmail('')
    setDepartment('')
    setShowForm(false)
    loadEmployees()
  }

  async function handleDelete(emp: Employee) {
    // Find everything that belongs to this employee
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
      ? `Delete ${emp.name}?\n\nThis will also permanently remove ${extras.join(' and ')}. This can't be undone.`
      : `Delete ${emp.name}? This can't be undone.`
    if (!window.confirm(message)) return

    setDeletingId(emp.id)
    // Delete in order: documents → requirements → employee
    const steps = [
      supabase.from('documents').delete().eq('employee_id', emp.id),
      ...(reqIds.length ? [supabase.from('documents').delete().in('requirement_id', reqIds)] : []),
    ]
    for (const step of steps) {
      const { error } = await step
      if (error) { alert(`Couldn't delete documents: ${error.message}`); setDeletingId(null); return }
    }
    const { error: reqError } = await supabase.from('requirements').delete().eq('employee_id', emp.id)
    if (reqError) { alert(`Couldn't delete requirements: ${reqError.message}`); setDeletingId(null); return }
    const { error: empError } = await supabase.from('employees').delete().eq('id', emp.id)
    if (empError) { alert(`Couldn't delete employee: ${empError.message}`); setDeletingId(null); return }

    setEmployees(list => list.filter(x => x.id !== emp.id))
    setDeletingId(null)
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.75rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem' }}>Employees</h1>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
            The people whose licenses and certifications you track.
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
                <th style={{ ...th, width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: i === employees.length - 1 ? 'none' : '1px solid var(--line)',
                    opacity: deletingId === emp.id ? 0.4 : 1,
                  }}
                >
                  <td style={{ ...td, fontWeight: 500 }}>{emp.name}</td>
                  <td style={{ ...td, color: 'var(--ink-soft)' }}>{emp.email}</td>
                  <td style={{ ...td, color: 'var(--ink-soft)' }}>{emp.department || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(emp)}
                      disabled={deletingId === emp.id}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--signal-red-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--signal-red)', cursor: 'pointer',
                        fontSize: '0.85rem', padding: '0.35rem 0.6rem', borderRadius: 6,
                      }}
                    >
                      {deletingId === emp.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}