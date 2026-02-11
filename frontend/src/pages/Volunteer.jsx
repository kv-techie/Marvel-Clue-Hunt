import React from 'react'
import { useAuth } from '../context/AuthContext'
import VolunteerDashboard from '../volunteer/VolunteerDashboard'
import '../styles/Admin.css'

const Volunteer = () => {
  const { user, logout } = useAuth()

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>📋 Volunteer Control Panel</h1>
        <div className="admin-user-info">
          <span>Welcome, {user}</span>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-section">
          <VolunteerDashboard />
        </section>
      </div>
    </div>
  )
}

export default Volunteer
