import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/client'
import { getDeviceInfo } from '../utils/deviceInfo'
import Tilt from 'react-parallax-tilt'
import '../styles/Login.css'

const Login = () => {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [teamName, setTeamName] = useState('')
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [disqualificationReason, setDisqualificationReason] = useState('')
  
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsDisqualified(false)
    setDisqualificationReason('')
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
      const data = response

      if (data.success) {
        // Ensure `user` is non-empty so ProtectedRoute allows attendee access
        const userForContext = data.name || data.team || teamName
        
        // For attendees, also store device_id
        const deviceInfo = isAdminLogin ? null : getDeviceInfo()
        loginUser(userForContext, data.is_admin, data.team, data.is_volunteer, deviceInfo?.device_id)

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
      
      // Check if team is disqualified
      if (errorMessage.includes('disqualified from the game')) {
        setIsDisqualified(true)
        const reasonMatch = errorMessage.match(/Reason: (.+)$/)
        if (reasonMatch) {
          setDisqualificationReason(reasonMatch[1])
        }
        setError(errorMessage)
      }
      // Special handling for device limit error
      else if (errorMessage.includes('Maximum devices')) {
        setError('⚠️ Device limit reached for this team. Maximum 3 devices allowed. Contact admin to remove a device.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <Tilt 
        tiltMaxAngleX={5} 
        tiltMaxAngleY={5} 
        perspective={1000} 
        transitionSpeed={2500} 
        scale={1.02} 
        glareEnable={true} 
        glareMaxOpacity={0.15} 
        glareColor="#e74c3c" 
        glarePosition="all"
        style={{ width: '100%', maxWidth: '450px' }}
      >
        <div className="login-card">
          <h1 className="login-title">🦸 Marvel Clue Hunt</h1>
          <p className="login-subtitle">Assemble your team and solve the mystery!</p>
          
          {isDisqualified ? (
            // Disqualification message
            <div className="disqualification-panel">
              <div className="disqualification-icon">⛔</div>
              <h2 className="disqualification-heading">Team Disqualified</h2>
              <p className="disqualification-text">
                Your team has been removed from the game.
              </p>
              <p className="disqualification-reason-box">
                <strong>Reason:</strong> {disqualificationReason}
              </p>
              <p className="disqualification-contact">
                Please contact the game administrators for more information.
              </p>
              <button
                onClick={() => {
                  setIsDisqualified(false)
                  setError('')
                  setTeamName('')
                }}
                className="btn btn-primary"
              >
                Try Another Team
              </button>
            </div>
          ) : (
            // Login form
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
          )}

          {!isAdminLogin && (
            <div className="device-info-note">
              <p><strong>Device Registration & Activation:</strong></p>
              <ul>
                <li>Your device is automatically registered on first login</li>
                <li>Each team can register up to 3 different devices</li>
                <li>⚡ <strong>Only 1 device can be active at a time</strong> - prevents simultaneous access</li>
                <li>If one device has issues, switch to a fallback device immediately</li>
                <li>Logging in from another device will automatically deactivate the previous one</li>
              </ul>
            </div>
          )}
        </div>
      </Tilt>
    </div>
  )
}

export default Login
