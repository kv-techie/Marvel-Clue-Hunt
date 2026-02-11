import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/client'
import '../styles/Login.css'

const Login = () => {
  const [name, setName] = useState('')
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
      const response = await login(name, isAdminLogin)
      const data = response.data

      if (data.success) {
        loginUser(data.name, data.is_admin, data.team, data.is_volunteer)
        
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
          <div className="form-group">
            <label htmlFor="name">Enter Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tony Stark"
              required
            />
          </div>

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