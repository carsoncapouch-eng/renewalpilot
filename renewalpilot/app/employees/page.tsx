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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)

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
    await supabase.from('employees').insert({ name, email, department, organization_id: orgId })
    setName('')
    setEmail('')
    setDepartment('')
    setShowForm(false)
    loadEmployees()
  }

  return (
    <div style={{ maxWidth: 700, margin: '3rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Employees</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.6rem 1rem', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          + Add Employee
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: 8 }}>
          <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <button type="submit" style={{ padding: '0.6rem', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Save Employee
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : employees.length === 0 ? (
        <p>No employees yet. Click "+ Add Employee" to get started.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>Email</th>
              <th style={{ padding: '0.5rem' }}>Department</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '0.5rem' }}>{emp.name}</td>
                <td style={{ padding: '0.5rem' }}>{emp.email}</td>
                <td style={{ padding: '0.5rem' }}>{emp.department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}