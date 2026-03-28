import React, { useState, useEffect } from 'react'
import { 
  setPin,
  getPins,
  deletePin,
  getDevices,
  removeDevice,
  generateGuestPassword
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import '../styles/AdminComponents.css'

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

  // PIN visibility state - tracks which user PINs are visible
  const [visiblePins, setVisiblePins] = useState({})

  // Guest state
  const { user, isGuest } = useAuth()
  const [guestPIN, setGuestPIN] = useState('')
  const [guestMessage, setGuestMessage] = useState('')

  // Toggle PIN visibility
  const togglePinVisibility = (username) => {
    setVisiblePins(prev => ({
      ...prev,
      [username]: !prev[username]
    }))
  }

  // Helper function to display PIN (masked or visible)
  const getMaskedPin = (pin, username) => {
    return visiblePins[username] ? pin : '•'.repeat(pin.length)
  }

  const fetchUsersWithPins = async () => {
    try {
      const pinsResponse = await getPins()
      setAdminUsers(pinsResponse.admin_users || [])
      setVolunteerUsers(pinsResponse.volunteer_users || [])
    } catch (err) {
      console.error('Failed to fetch users with PINs:', err)
    }
  }

  useEffect(() => {
    fetchUsersWithPins()
  }, [])

  // Guest PIN Generation
  const handleGenerateGuestPIN = async () => {
    try {
      const response = await generateGuestPassword(user)
      setGuestPIN(response.pin)
      setGuestMessage(`✅ Temporary PIN generated for ${user}`)
    } catch (err) {
      setGuestMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to generate guest PIN'}`)
    }
  }

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
      await setPin('admin', newAdminName.trim(), newAdminPin.trim(), user)
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
      await deletePin('admin', username, user)
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
      await setPin(role, username, newPinValue.trim(), user)
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
      await setPin('volunteer', newVolunteerName.trim(), newVolunteerPin.trim(), user)
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
      await deletePin('volunteer', username, user)
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
      setDevices(response.devices || [])
      setDeviceMessage(
        response.devices.length === 0
          ? 'No devices registered for this team'
          : `✅ Found ${response.devices.length} device(s)`
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
      await removeDevice(teamName.trim(), deviceId, user)
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
    <div>
      {/* ==================== GUEST ACCESS ==================== */}
      {!isGuest && (
        <div style={{ marginBottom: '40px' }}>
          <h2 className="admin-section-title">
            🔑 Guest Access
          </h2>
          <div className="admin-form-panel">
            <h3>Generate Temporary Access</h3>
            <p className="admin-text-muted" style={{ marginBottom: '15px' }}>
              Create a one-time-use PIN for guests to view the progress. They will have strictly view-only access.
            </p>
            <div className="admin-input-group">
              <button 
                className="admin-btn primary" 
                onClick={handleGenerateGuestPIN}
                style={{ minWidth: '200px' }}
              >
                Generate Guest PIN
              </button>
            </div>
            {guestMessage && (
              <div className={`admin-message ${guestMessage.includes('✅') ? 'success' : 'error'}`}>
                {guestMessage}
              </div>
            )}
            {guestPIN && (
              <div style={{ 
                marginTop: '15px', 
                padding: '20px', 
                background: 'rgba(0, 255, 0, 0.05)', 
                border: '1px solid var(--success)', 
                borderRadius: '12px', 
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Share this Temporary PIN
                </div>
                <div style={{ fontSize: '42px', fontWeight: 'bold', letterSpacing: '8px', color: 'var(--success)', textShadow: '0 0 10px rgba(0,255,0,0.3)' }}>
                  {guestPIN}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
                  This PIN is valid for one-time use only. It will deactivate once used for login.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ADMIN MANAGEMENT ==================== */}
      <div style={{ marginBottom: '40px', opacity: isGuest ? 0.7 : 1 }}>
        <h2 className="admin-section-title">
          👤 Admin Management
          {isGuest && <span className="admin-badge warning" style={{ marginLeft: '10px' }}>VIEW ONLY</span>}
        </h2>
        
        {/* Add New Admin */}
        {!isGuest && (
          <div className="admin-form-panel">
            <h3>Add New Admin</h3>
          <div className="admin-input-group">
            <input
              type="text"
              placeholder="Enter name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAdmin()}
            />
            <input
              type="text"
              placeholder="Enter PIN"
              value={newAdminPin}
              onChange={(e) => setNewAdminPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAdmin()}
            />
            <button className="admin-btn primary" onClick={handleAddAdmin}>
              Add Admin
            </button>
          </div>
          {adminMessage && (
            <div className={`admin-message ${adminMessage.includes('✅') ? 'success' : 'error'}`}>
              {adminMessage}
            </div>
          )}
        </div>
      )}

        {/* Current Admins List */}
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Current Admins ({adminUsers.length})</h3>
          {adminUsers.length === 0 ? (
            <p className="admin-text-muted">No admins registered yet</p>
          ) : (
            <div className="admin-list">
              {adminUsers.map((admin) => (
                <div key={admin.username} className="admin-list-item">
                  {editingUser?.username === admin.username && editingUser?.role === 'admin' ? (
                    // Edit PIN Mode
                    <div style={{ width: '100%' }}>
                      <div className="admin-list-title" style={{ marginBottom: '10px' }}>
                        🔐 Change PIN for {admin.username}
                      </div>
                      <div className="admin-input-group">
                        <input
                          type="text"
                          placeholder="Enter new PIN"
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleChangePin(admin.username, 'admin')}
                          autoFocus
                        />
                        <button className="admin-btn success" onClick={() => handleChangePin(admin.username, 'admin')}>
                          Save
                        </button>
                        <button className="admin-btn outline-muted" onClick={cancelEditingPin}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <div className="admin-list-title">
                          👤 {admin.username}
                        </div>
                        <div className="admin-list-subtitle">
                          <span>PIN: {getMaskedPin(admin.pin, admin.username)}</span>
                          <button
                            onClick={() => togglePinVisibility(admin.username)}
                            title={visiblePins[admin.username] ? 'Hide PIN' : 'Show PIN'}
                            className={`admin-badge ${visiblePins[admin.username] ? 'success' : 'warning'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {visiblePins[admin.username] ? '👁️ Hide' : '👁️ Show'}
                          </button>
                          <span style={{ marginLeft: '10px' }}>Created: {new Date(admin.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="admin-list-actions">
                        {!isGuest && (
                          <>
                            <button className="admin-btn outline-warning" onClick={() => startEditingPin(admin.username, 'admin')}>
                              Change PIN
                            </button>
                            <button className="admin-btn outline-info" onClick={() => handleRemoveAdmin(admin.username)}>
                              Remove
                            </button>
                          </>
                        )}
                        {isGuest && <span className="admin-text-muted">No Actions</span>}
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
      <div style={{ marginBottom: '40px', opacity: isGuest ? 0.7 : 1 }}>
        <h2 className="admin-section-title">
          👥 Volunteer Management
          {isGuest && <span className="admin-badge warning" style={{ marginLeft: '10px' }}>VIEW ONLY</span>}
        </h2>
        
        {/* Add New Volunteer */}
        {!isGuest && (
          <div className="admin-form-panel">
            <h3>Add New Volunteer</h3>
          <div className="admin-input-group">
            <input
              type="text"
              placeholder="Enter name"
              value={newVolunteerName}
              onChange={(e) => setNewVolunteerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddVolunteer()}
            />
            <input
              type="text"
              placeholder="Enter PIN"
              value={newVolunteerPin}
              onChange={(e) => setNewVolunteerPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddVolunteer()}
            />
            <button className="admin-btn primary" onClick={handleAddVolunteer}>
              Add Volunteer
            </button>
          </div>
          {volunteerMessage && (
            <div className={`admin-message ${volunteerMessage.includes('✅') ? 'success' : 'error'}`}>
              {volunteerMessage}
            </div>
          )}
        </div>
      )}

        {/* Current Volunteers List */}
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Current Volunteers ({volunteerUsers.length})</h3>
          {volunteerUsers.length === 0 ? (
            <p className="admin-text-muted">No volunteers registered yet</p>
          ) : (
            <div className="admin-list">
              {volunteerUsers.map((volunteer) => (
                <div key={volunteer.username} className="admin-list-item">
                  {editingUser?.username === volunteer.username && editingUser?.role === 'volunteer' ? (
                    // Edit PIN Mode
                    <div style={{ width: '100%' }}>
                      <div className="admin-list-title" style={{ marginBottom: '10px' }}>
                        🔐 Change PIN for {volunteer.username}
                      </div>
                      <div className="admin-input-group">
                        <input
                          type="text"
                          placeholder="Enter new PIN"
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleChangePin(volunteer.username, 'volunteer')}
                          autoFocus
                        />
                        <button className="admin-btn success" onClick={() => handleChangePin(volunteer.username, 'volunteer')}>
                          Save
                        </button>
                        <button className="admin-btn outline-muted" onClick={cancelEditingPin}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <div className="admin-list-title">
                          👥 {volunteer.username}
                        </div>
                        <div className="admin-list-subtitle">
                          <span>PIN: {getMaskedPin(volunteer.pin, volunteer.username)}</span>
                          <button
                            onClick={() => togglePinVisibility(volunteer.username)}
                            title={visiblePins[volunteer.username] ? 'Hide PIN' : 'Show PIN'}
                            className={`admin-badge ${visiblePins[volunteer.username] ? 'success' : 'warning'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {visiblePins[volunteer.username] ? '👁️ Hide' : '👁️ Show'}
                          </button>
                          <span style={{ marginLeft: '10px' }}>Created: {new Date(volunteer.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="admin-list-actions">
                        {!isGuest ? (
                          <>
                            <button className="admin-btn outline-warning" onClick={() => startEditingPin(volunteer.username, 'volunteer')}>
                              Change PIN
                            </button>
                            <button className="admin-btn outline-info" onClick={() => handleRemoveVolunteer(volunteer.username)}>
                              Remove
                            </button>
                          </>
                        ) : (
                          <span className="admin-locked-indicator">View Only</span>
                        )}
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
        <h2 className="admin-section-title">
          📱 Device Management
        </h2>
        
        <div className="admin-form-panel">
          <div className="admin-input-group">
            <input
              type="text"
              placeholder="Team name (e.g., Team Avengers)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFetchDevices()}
            />
            <button className="admin-btn primary" onClick={handleFetchDevices}>
              Fetch Devices
            </button>
          </div>
          
          {deviceMessage && (
            <div className={`admin-message ${deviceMessage.includes('❌') ? 'error' : 'info'}`}>
              {deviceMessage}
            </div>
          )}

          {devices.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>Registered Devices:</h4>
              <div className="admin-list">
                {devices.map((device, index) => (
                  <div
                    key={index}
                    className={`admin-list-item ${typeof device === 'object' && device.is_active ? 'active' : ''}`}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="admin-list-title">
                        {getDeviceDisplayName(device)}
                        {typeof device === 'object' && device.is_active && (
                          <span className="admin-badge success" style={{ marginLeft: '10px' }}>
                            🟢 ACTIVE
                          </span>
                        )}
                      </div>
                      {typeof device === 'object' && (
                        <div className="admin-list-subtitle">
                          {device.browser} • {device.os} • {device.screen_resolution}
                          {device.last_login && ` • Last: ${new Date(device.last_login).toLocaleString()}`}
                        </div>
                      )}
                      <div className="admin-list-text admin-text-muted" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        ID: {getDeviceId(device)}
                      </div>
                    </div>
                    {!isGuest && (
                      <button className="admin-btn outline-danger" onClick={() => handleRemoveDevice(getDeviceId(device))}>
                        Remove
                      </button>
                    )}
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
