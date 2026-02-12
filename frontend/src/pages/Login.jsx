import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/client'
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
        payload = { name: name.trim(), pin: pin.trim(), is_admin: true }
      } else {
        // attendee: use team name and device id
        const storedDevice = localStorage.getItem('device_id')
        const deviceId = storedDevice || `${Date.now()}-${Math.random().toString(36).slice(2,10)}`
        localStorage.setItem('device_id', deviceId)
        payload = { team_name: teamName.trim(), device_id: deviceId }
      }

      const response = await login(payload)
      const data = response.data

      if (data.success) {
        // Ensure `user` is non-empty so ProtectedRoute allows attendee access.
        const userForContext = data.name || data.team || teamName
        loginUser(userForContext, data.is_admin, data.team, data.is_volunteer)

        if (data.is_admin) {
          navigate('/admin')
        } else if (data.is_volunteer) {
          navigate('/volunteer')
        } else {
          navigate('/attendee')
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
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
                placeholder="Team A"
                required
              />
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
                  placeholder="1234"
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
      </div>
    </div>
  )
}

export default Login