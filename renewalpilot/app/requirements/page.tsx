'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Employee = { id: string; name: string }
type Requirement = {
  id: string
  name: string
  type: string
  expiration_date: string | null
  reminder_schedule: string
  employee_id: string
}

export default function RequirementsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [reminderSchedule, setReminderSchedule] = useState('30 days before')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const { data: emps } = await supabase.from('employees').select('id, name').order('name')
    const { data: reqs } = await supabase.from('requirements').select('*').order('expiration_date')
    setEmployees(emps || [])
    setRequirements(reqs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('requirements').insert({
      employee_id: employeeId,
      name,
      type: name,
      expiration_date: expirationDate,
      reminder_schedule: reminderSchedule,
      status: 'active',
    })
    setEmployeeId('')
    setName('')
    setExpirationDate('')
    setReminderSchedule('30 days before')
    setShowForm(false)
    loadData()
  }

  function employeeName(id: string) {
    return employees.find((e) => e.id === id)?.name || 'Unknown'
  }

  return (
    <div style={{ maxWidth: 700, margin: '3rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Requirements</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.6rem 1rem', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          + Add Requirement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: 8 }}>
          <label>
            Employee
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}>
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </label>
          <input placeholder="Requirement name (e.g. CPR Certification)" value={name} onChange={(e) => setName(e.target.value)} required />
          <label>
            Expiration Date
            <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} required style={{ width: '100%', padding: '0.5rem', marginTop: 4 }} />
          </label>
          <label>
            Reminder Schedule
            <select value={reminderSchedule} onChange={(e) => setReminderSchedule(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}>
              <option>7 days before</option>
              <option>30 days before</option>
              <option>60 days before</option>
              <option>90 days before</option>
            </select>
          </label>
          <button type="submit" style={{ padding: '0.6rem', background: '#000', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Save Requirement
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : requirements.length === 0 ? (
        <p>No requirements yet. Click "+ Add Requirement" to get started.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}>Employee</th>
              <th style={{ padding: '0.5rem' }}>Requirement</th>
              <th style={{ padding: '0.5rem' }}>Expires</th>
              <th style={{ padding: '0.5rem' }}>Reminder</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) => (
              <tr key={req.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '0.5rem' }}>{employeeName(req.employee_id)}</td>
                <td style={{ padding: '0.5rem' }}>{req.name}</td>
                <td style={{ padding: '0.5rem' }}>{req.expiration_date}</td>
                <td style={{ padding: '0.5rem' }}>{req.reminder_schedule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}