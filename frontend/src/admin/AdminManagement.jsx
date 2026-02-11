import React, { useState, useEffect } from 'react'
import { getAdminList, addAdmin, removeAdmin } from '../api/client'

const AdminManagement = () => {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAdminName, setNewAdminName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchAdmins = async () => {
    try {
      const response = await getAdminList()
      setAdmins(response.data.admins)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch admin list:', err)
      setError('Failed to load admin list')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newAdminName.trim()) {
      setError('Please enter a name')
      return
    }

    try {
      await addAdmin(newAdminName)
      setSuccess(`${newAdminName} has been added as admin`)
      setNewAdminName('')
      await fetchAdmins()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add admin')
    }
  }

  const handleRemoveAdmin = async (name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} as admin?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await removeAdmin(name)
      setSuccess(`${name} has been removed from admins`)
      await fetchAdmins()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove admin')
    }
  }

  if (loading) {
    return <div>Loading admin list...</div>
  }

  return (
    <div>
      <h2>👥 Admin Management</h2>

      {error && (
        <div style={{ color: '#e74c3c', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(231, 76, 60, 0.2)', borderRadius: '4px' }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{ color: '#2ecc71', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(46, 204, 113, 0.2)', borderRadius: '4px' }}>
          ✅ {success}
        </div>
      )}

      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
        <h3>Add New Admin</h3>
        <form onSubmit={handleAddAdmin} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newAdminName}
            onChange={(e) => setNewAdminName(e.target.value)}
            placeholder="Enter name"
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #444',
              backgroundColor: '#222',
              color: '#fff',
              flex: 1,
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '8px 20px' }}
          >
            Add Admin
          </button>
        </form>
      </div>

      <div>
        <h3>Current Admins ({admins.length})</h3>
        {admins.length === 0 ? (
          <p style={{ color: '#bbb' }}>No admins configured yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {admins.map((admin) => (
              <div
                key={admin}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: '500' }}>👤 {admin}</span>
                <button
                  onClick={() => handleRemoveAdmin(admin)}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: '#e74c3c',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminManagement
