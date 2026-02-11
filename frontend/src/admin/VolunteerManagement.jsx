import React, { useState, useEffect } from 'react'
import { getVolunteerList, addVolunteer, removeVolunteer } from '../api/client'

const VolunteerManagement = () => {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newVolunteerName, setNewVolunteerName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchVolunteers = async () => {
    try {
      const response = await getVolunteerList()
      setVolunteers(response.data.volunteers)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch volunteer list:', err)
      setError('Failed to load volunteer list')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVolunteers()
  }, [])

  const handleAddVolunteer = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newVolunteerName.trim()) {
      setError('Please enter a name')
      return
    }

    try {
      await addVolunteer(newVolunteerName)
      setSuccess(`${newVolunteerName} has been added as volunteer`)
      setNewVolunteerName('')
      await fetchVolunteers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add volunteer')
    }
  }

  const handleRemoveVolunteer = async (name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} as volunteer?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await removeVolunteer(name)
      setSuccess(`${name} has been removed from volunteers`)
      await fetchVolunteers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove volunteer')
    }
  }

  if (loading) {
    return <div>Loading volunteer list...</div>
  }

  return (
    <div>
      <h2>👥 Volunteer Management</h2>

      {error && (
        <div
          style={{
            color: '#e74c3c',
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            borderRadius: '4px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            color: '#2ecc71',
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: 'rgba(46, 204, 113, 0.2)',
            borderRadius: '4px',
          }}
        >
          ✅ {success}
        </div>
      )}

      <div
        style={{
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
        }}
      >
        <h3>Add New Volunteer</h3>
        <form onSubmit={handleAddVolunteer} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newVolunteerName}
            onChange={(e) => setNewVolunteerName(e.target.value)}
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
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
            Add Volunteer
          </button>
        </form>
      </div>

      <div>
        <h3>Current Volunteers ({volunteers.length})</h3>
        {volunteers.length === 0 ? (
          <p style={{ color: '#bbb' }}>No volunteers assigned yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {volunteers.map((volunteer) => (
              <div
                key={volunteer}
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
                <span style={{ fontSize: '16px', fontWeight: '500' }}>📋 {volunteer}</span>
                <button
                  onClick={() => handleRemoveVolunteer(volunteer)}
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

export default VolunteerManagement
