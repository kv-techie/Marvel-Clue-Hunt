import React, { useState, useEffect } from 'react'
import { getAdminList, addAdmin, removeAdmin, setPin, getPins, deletePin, getDevices, removeDevice } from '../api/client'

const AdminManagement = () => {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAdminName, setNewAdminName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [roleForPin, setRoleForPin] = useState('admin')
  const [pinName, setPinName] = useState('')
  const [pinValue, setPinValue] = useState('')
  const [pinsList, setPinsList] = useState({ admin_users: [], volunteer_users: [] })
  const [deviceTeam, setDeviceTeam] = useState('')
  const [devices, setDevices] = useState([])

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

  const fetchPins = async () => {
    try {
      const resp = await getPins()
      setPinsList(resp.data || { admin_users: [], volunteer_users: [] })
    } catch (err) {
      console.error('Failed to fetch pins:', err)
    }
  }

  const fetchDevices = async () => {
    if (!deviceTeam.trim()) return
    try {
      const resp = await getDevices(deviceTeam.trim())
      setDevices(resp.data.devices || [])
    } catch (err) {
      console.error('Failed to fetch devices:', err)
    }
  }

  useEffect(() => {
    fetchAdmins()
    fetchPins()
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

  const handleSetPin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!pinName.trim() || !pinValue.trim()) {
      setError('Provide name and pin')
      return
    }

    try {
      await setPin(roleForPin, pinName.trim(), pinValue.trim())
      setSuccess(`PIN set for ${pinName} (${roleForPin})`)
      setPinName('')
      setPinValue('')
      await fetchPins()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set PIN')
    }
  }

  const handleDeletePin = async (role, name) => {
    if (!window.confirm(`Remove PIN for ${name} (${role})?`)) return
    try {
      await deletePin(role, name)
      await fetchPins()
      setSuccess(`Removed PIN for ${name}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove PIN')
    }
  }

  const handleFetchDevices = async (e) => {
    e.preventDefault()
    await fetchDevices()
  }

  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm(`Remove device ${deviceId} from ${deviceTeam}?`)) return
    try {
      await removeDevice(deviceTeam.trim(), deviceId)
      await fetchDevices()
      setSuccess('Device removed')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove device')
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

      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
        <h3>Set PIN for Admin / Volunteer</h3>
        <form onSubmit={handleSetPin} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={roleForPin} onChange={(e) => setRoleForPin(e.target.value)} style={{ padding: '8px', borderRadius: '4px' }}>
            <option value="admin">Admin</option>
            <option value="volunteer">Volunteer</option>
          </select>
          <input value={pinName} onChange={(e) => setPinName(e.target.value)} placeholder="Name" style={{ padding: '8px', borderRadius: '4px' }} />
          <input value={pinValue} onChange={(e) => setPinValue(e.target.value)} placeholder="PIN" type="password" style={{ padding: '8px', borderRadius: '4px' }} />
          <button type="submit" className="btn btn-primary">Set PIN</button>
        </form>

        <div style={{ marginTop: '12px' }}>
          <strong>Users with PINs</strong>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
            <div>
              <h4>Admins</h4>
              {(pinsList.admin_users || []).map((u) => (
                <div key={u.username} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <span>{u.username}</span>
                  <button className="btn btn-secondary" onClick={() => handleDeletePin('admin', u.username)}>Remove</button>
                </div>
              ))}
            </div>
            <div>
              <h4>Volunteers</h4>
              {(pinsList.volunteer_users || []).map((u) => (
                <div key={u.username} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <span>{u.username}</span>
                  <button className="btn btn-secondary" onClick={() => handleDeletePin('volunteer', u.username)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
        <h3>Device Management</h3>
        <form onSubmit={handleFetchDevices} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input value={deviceTeam} onChange={(e) => setDeviceTeam(e.target.value)} placeholder="Team name (e.g., Team A)" style={{ padding: '8px', borderRadius: '4px', flex: 1 }} />
          <button type="submit" className="btn btn-primary">Fetch Devices</button>
        </form>

        <div style={{ marginTop: '12px' }}>
          {devices.length === 0 ? (
            <p style={{ color: '#bbb' }}>No devices registered for this team</p>
          ) : (
            devices.map((d) => (
              <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.02)', marginTop: '6px' }}>
                <span style={{ fontFamily: 'monospace' }}>{d}</span>
                <button className="btn btn-secondary" onClick={() => handleRemoveDevice(d)}>Remove</button>
              </div>
            ))
          )}
        </div>
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
