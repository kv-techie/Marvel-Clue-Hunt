import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/client'
import { getDeviceInfo } from '../utils/deviceInfo'
import '../styles/Login.css'

const Login = () => {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [teamName, setTeamName] = useState('')
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let payload

      if (isAdminLogin) {
        // Admin/Volunteer login with PIN
        payload = { 
          name: name.trim(), 
          pin: pin.trim(), 
          is_admin: true 
        }
      } else {
        // Attendee login: use team name and device info
        const deviceInfo = getDeviceInfo()
        
        payload = { 
          team_name: teamName.trim(), 
          device_id: deviceInfo.device_id,
          device_name: deviceInfo.device_name,
          device_info: deviceInfo
        }
      }

      const response = await login(payload)
      const data = response.data

      if (data.success) {
        // Ensure `user` is non-empty so ProtectedRoute allows attendee access
        const userForContext = data.name || data.team || teamName
        loginUser(userForContext, data.is_admin, data.team, data.is_volunteer)

        // Navigate based on role
        if (data.is_admin) {
          navigate('/admin')
        } else if (data.is_volunteer) {
          navigate('/volunteer')
        } else {
          navigate('/attendee')
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please try again.'
      setError(errorMessage)
      
      // Special handling for device limit error
      if (errorMessage.includes('Maximum devices')) {
        setError('⚠️ Device limit reached for this team. Maximum 3 devices allowed. Contact admin to remove a device.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">🦸 Marvel Clue Hunt</h1>
        <p className="login-subtitle">Assemble your team and solve the mystery!</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isAdminLogin}
                onChange={(e) => setIsAdminLogin(e.target.checked)}
              />
              <span>Admin/Volunteer Login (Authorized Users Only)</span>
            </label>
          </div>

          {!isAdminLogin && (
            <div className="form-group">
              <label htmlFor="team">Enter Your Team Name</label>
              <input
                id="team"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team Avengers"
                required
              />
              <small className="form-hint">
                💡 Your device will be registered automatically (max 3 devices per team)
              </small>
            </div>
          )}

          {isAdminLogin && (
            <>
              <div className="form-group">
                <label htmlFor="name">Enter Your Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kedhar Vinod"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="pin">Enter PIN</label>
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  required
                />
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Enter'}
          </button>
        </form>

        {!isAdminLogin && (
          <div className="device-info-note">
            <p><strong>Device Registration:</strong></p>
            <ul>
              <li>Your device is automatically registered on first login</li>
              <li>Each team can use up to 3 different devices</li>
              <li>You can login from the same device multiple times</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
