import React, { useState, useEffect } from 'react'
import { 
  setPin,
  getPins,
  deletePin,
  getDevices,
  removeDevice
} from '../api/client'

const AdminManagement = () => {
  // Admin state
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminPin, setNewAdminPin] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  
  // Volunteer state
  const [newVolunteerName, setNewVolunteerName] = useState('')
  const [newVolunteerPin, setNewVolunteerPin] = useState('')
  const [volunteerMessage, setVolunteerMessage] = useState('')
  
  // PIN users state
  const [adminUsers, setAdminUsers] = useState([])
  const [volunteerUsers, setVolunteerUsers] = useState([])
  
  // Change PIN state
  const [editingUser, setEditingUser] = useState(null) // { username, role }
  const [newPinValue, setNewPinValue] = useState('')
  
  // Device management state
  const [teamName, setTeamName] = useState('')
  const [devices, setDevices] = useState([])
  const [deviceMessage, setDeviceMessage] = useState('')

  // Fetch admins and volunteers with PINs
  const fetchUsersWithPins = async () => {
    try {
      const pinsResponse = await getPins()
      setAdminUsers(pinsResponse.data.admin_users || [])
      setVolunteerUsers(pinsResponse.data.volunteer_users || [])
    } catch (err) {
      console.error('Failed to fetch users with PINs:', err)
    }
  }

  useEffect(() => {
    fetchUsersWithPins()
  }, [])

  // Add Admin with PIN
  const handleAddAdmin = async () => {
    if (!newAdminName.trim()) {
      setAdminMessage('❌ Please enter admin name')
      return
    }
    if (!newAdminPin.trim()) {
      setAdminMessage('❌ Please enter a PIN for the admin')
      return
    }

    try {
      await setPin('admin', newAdminName.trim(), newAdminPin.trim())
      setAdminMessage(`✅ Admin "${newAdminName}" added with PIN successfully`)
      setNewAdminName('')
      setNewAdminPin('')
      fetchUsersWithPins()
    } catch (err) {
      setAdminMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to add admin'}`)
    }
  }

  // Remove Admin
  const handleRemoveAdmin = async (username) => {
    if (!window.confirm(`Remove admin "${username}"?`)) return

    try {
      await deletePin('admin', username)
      setAdminMessage(`✅ Admin "${username}" removed`)
      fetchUsersWithPins()
    } catch (err) {
      setAdminMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to remove admin'}`)
    }
  }

  // Change PIN for Admin or Volunteer
  const handleChangePin = async (username, role) => {
    if (!newPinValue.trim()) {
      const msg = `❌ Please enter a new PIN`
      if (role === 'admin') {
        setAdminMessage(msg)
      } else {
        setVolunteerMessage(msg)
      }
      return
    }

    try {
      await setPin(role, username, newPinValue.trim())
      const msg = `✅ PIN changed successfully for "${username}"`
      if (role === 'admin') {
        setAdminMessage(msg)
      } else {
        setVolunteerMessage(msg)
      }
      setEditingUser(null)
      setNewPinValue('')
      fetchUsersWithPins()
    } catch (err) {
      const msg = `❌ Error: ${err.response?.data?.detail || 'Failed to change PIN'}`
      if (role === 'admin') {
        setAdminMessage(msg)
      } else {
        setVolunteerMessage(msg)
      }
    }
  }

  // Start editing PIN
  const startEditingPin = (username, role) => {
    setEditingUser({ username, role })
    setNewPinValue('')
    setAdminMessage('')
    setVolunteerMessage('')
  }

  // Cancel editing PIN
  const cancelEditingPin = () => {
    setEditingUser(null)
    setNewPinValue('')
  }

  // Add Volunteer with PIN
  const handleAddVolunteer = async () => {
    if (!newVolunteerName.trim()) {
      setVolunteerMessage('❌ Please enter volunteer name')
      return
    }
    if (!newVolunteerPin.trim()) {
      setVolunteerMessage('❌ Please enter a PIN for the volunteer')
      return
    }

    try {
      await setPin('volunteer', newVolunteerName.trim(), newVolunteerPin.trim())
      setVolunteerMessage(`✅ Volunteer "${newVolunteerName}" added with PIN successfully`)
      setNewVolunteerName('')
      setNewVolunteerPin('')
      fetchUsersWithPins()
    } catch (err) {
      setVolunteerMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to add volunteer'}`)
    }
  }

  // Remove Volunteer
  const handleRemoveVolunteer = async (username) => {
    if (!window.confirm(`Remove volunteer "${username}"?`)) return

    try {
      await deletePin('volunteer', username)
      setVolunteerMessage(`✅ Volunteer "${username}" removed`)
      fetchUsersWithPins()
    } catch (err) {
      setVolunteerMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to remove volunteer'}`)
    }
  }

  // Fetch devices for a team
  const handleFetchDevices = async () => {
    if (!teamName.trim()) {
      setDeviceMessage('❌ Please enter a team name')
      return
    }

    try {
      const response = await getDevices(teamName.trim())
      setDevices(response.data.devices || [])
      setDeviceMessage(
        response.data.devices.length === 0
          ? 'No devices registered for this team'
          : `✅ Found ${response.data.devices.length} device(s)`
      )
    } catch (err) {
      setDeviceMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to fetch devices'}`)
      setDevices([])
    }
  }

  // Remove device
  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm(`Remove this device?`)) return

    try {
      await removeDevice(teamName.trim(), deviceId)
      setDeviceMessage(`✅ Device removed successfully`)
      handleFetchDevices()
    } catch (err) {
      setDeviceMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to remove device'}`)
    }
  }

  // Helper functions for device display
  const getDeviceDisplayName = (device) => {
    if (typeof device === 'string') {
      return device
    }
    return device.device_name || device.device_id || 'Unknown Device'
  }

  const getDeviceId = (device) => {
    if (typeof device === 'string') {
      return device
    }
    return device.device_id
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* ==================== ADMIN MANAGEMENT ==================== */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          color: '#e74c3c',
          marginBottom: '20px'
        }}>
          👤 Admin Management
        </h2>
        
        {/* Add New Admin */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#fff' }}>Add New Admin</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAdmin()}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff'
              }}
            />
            <input
              type="text"
              placeholder="Enter PIN"
              value={newAdminPin}
              onChange={(e) => setNewAdminPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAdmin()}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff'
              }}
            />
            <button 
              onClick={handleAddAdmin} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#e74c3c',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Add Admin
            </button>
          </div>
          {adminMessage && (
            <div style={{
              padding: '10px',
              borderRadius: '4px',
              backgroundColor: adminMessage.includes('✅') 
                ? 'rgba(46, 204, 113, 0.2)' 
                : 'rgba(231, 76, 60, 0.2)',
              color: adminMessage.includes('✅') ? '#2ecc71' : '#e74c3c',
              border: `1px solid ${adminMessage.includes('✅') ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`
            }}>
              {adminMessage}
            </div>
          )}
        </div>

        {/* Current Admins List */}
        <div>
          <h3 style={{ color: '#fff' }}>Current Admins ({adminUsers.length})</h3>
          {adminUsers.length === 0 ? (
            <p style={{ color: '#888' }}>No admins registered yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {adminUsers.map((admin) => (
                <div
                  key={admin.username}
                  style={{
                    padding: '15px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {editingUser?.username === admin.username && editingUser?.role === 'admin' ? (
                    // Edit PIN Mode
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff', marginBottom: '10px' }}>
                        🔐 Change PIN for {admin.username}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Enter new PIN"
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleChangePin(admin.username, 'admin')}
                          autoFocus
                          style={{
                            flex: 1,
                            minWidth: '150px',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #444',
                            backgroundColor: '#222',
                            color: '#fff'
                          }}
                        />
                        <button
                          onClick={() => handleChangePin(admin.username, 'admin')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#2ecc71',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingPin}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#888',
                            border: '1px solid #888',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff' }}>
                          👤 {admin.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                          PIN: {admin.pin} | Created: {new Date(admin.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => startEditingPin(admin.username, 'admin')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#f39c12',
                            border: '1px solid #f39c12',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Change PIN
                        </button>
                        <button
                          onClick={() => handleRemoveAdmin(admin.username)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#3498db',
                            border: '1px solid #3498db',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== VOLUNTEER MANAGEMENT ==================== */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          color: '#e74c3c',
          marginBottom: '20px'
        }}>
          👥 Volunteer Management
        </h2>
        
        {/* Add New Volunteer */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#fff' }}>Add New Volunteer</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter name"
              value={newVolunteerName}
              onChange={(e) => setNewVolunteerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddVolunteer()}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff'
              }}
            />
            <input
              type="text"
              placeholder="Enter PIN"
              value={newVolunteerPin}
              onChange={(e) => setNewVolunteerPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddVolunteer()}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff'
              }}
            />
            <button 
              onClick={handleAddVolunteer} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#e74c3c',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Add Volunteer
            </button>
          </div>
          {volunteerMessage && (
            <div style={{
              padding: '10px',
              borderRadius: '4px',
              backgroundColor: volunteerMessage.includes('✅') 
                ? 'rgba(46, 204, 113, 0.2)' 
                : 'rgba(231, 76, 60, 0.2)',
              color: volunteerMessage.includes('✅') ? '#2ecc71' : '#e74c3c',
              border: `1px solid ${volunteerMessage.includes('✅') ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`
            }}>
              {volunteerMessage}
            </div>
          )}
        </div>

        {/* Current Volunteers List */}
        <div>
          <h3 style={{ color: '#fff' }}>Current Volunteers ({volunteerUsers.length})</h3>
          {volunteerUsers.length === 0 ? (
            <p style={{ color: '#888' }}>No volunteers registered yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {volunteerUsers.map((volunteer) => (
                <div
                  key={volunteer.username}
                  style={{
                    padding: '15px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {editingUser?.username === volunteer.username && editingUser?.role === 'volunteer' ? (
                    // Edit PIN Mode
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff', marginBottom: '10px' }}>
                        🔐 Change PIN for {volunteer.username}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Enter new PIN"
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleChangePin(volunteer.username, 'volunteer')}
                          autoFocus
                          style={{
                            flex: 1,
                            minWidth: '150px',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #444',
                            backgroundColor: '#222',
                            color: '#fff'
                          }}
                        />
                        <button
                          onClick={() => handleChangePin(volunteer.username, 'volunteer')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#2ecc71',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingPin}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#888',
                            border: '1px solid #888',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff' }}>
                          👥 {volunteer.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                          PIN: {volunteer.pin} | Created: {new Date(volunteer.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => startEditingPin(volunteer.username, 'volunteer')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#f39c12',
                            border: '1px solid #f39c12',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Change PIN
                        </button>
                        <button
                          onClick={() => handleRemoveVolunteer(volunteer.username)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#3498db',
                            border: '1px solid #3498db',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== DEVICE MANAGEMENT ==================== */}
      <div>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          color: '#e74c3c',
          marginBottom: '20px'
        }}>
          📱 Device Management
        </h2>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Team name (e.g., Team Avengers)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFetchDevices()}
              style={{
                flex: 1,
                minWidth: '250px',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff'
              }}
            />
            <button 
              onClick={handleFetchDevices}
              style={{
                padding: '10px 20px',
                backgroundColor: '#e74c3c',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Fetch Devices
            </button>
          </div>
          
          {deviceMessage && (
            <div style={{
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '10px',
              backgroundColor: deviceMessage.includes('❌') 
                ? 'rgba(231, 76, 60, 0.2)' 
                : 'rgba(52, 152, 219, 0.2)',
              color: deviceMessage.includes('❌') ? '#e74c3c' : '#3498db',
              border: `1px solid ${deviceMessage.includes('❌') ? 'rgba(231, 76, 60, 0.3)' : 'rgba(52, 152, 219, 0.3)'}`
            }}>
              {deviceMessage}
            </div>
          )}

          {devices.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ marginBottom: '10px', color: '#fff' }}>Registered Devices:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {devices.map((device, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>
                        {getDeviceDisplayName(device)}
                      </div>
                      {typeof device === 'object' && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                          {device.browser} • {device.os} • {device.screen_resolution}
                          {device.last_login && ` • Last: ${new Date(device.last_login).toLocaleString()}`}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px', fontFamily: 'monospace' }}>
                        ID: {getDeviceId(device)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDevice(getDeviceId(device))}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: '#e74c3c',
                        border: '1px solid #e74c3c',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminManagement
