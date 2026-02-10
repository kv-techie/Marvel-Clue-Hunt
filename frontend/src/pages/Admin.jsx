import React from 'react'
import { useAuth } from '../context/AuthContext'
import AdminDashboard from '../admin/AdminDashboard'
import TeamDistribution from '../admin/TeamDistribution'
import GlobalTimerControl from '../admin/GlobalTimerControl'
import Leaderboard from '../admin/Leaderboard'
import '../styles/Admin.css'

const Admin = () => {
  const { user, logout } = useAuth()

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>🛡️ Admin Control Panel</h1>
        <div className="admin-user-info">
          <span>Welcome, {user}</span>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-section">
          <AdminDashboard />
        </section>

        <section className="admin-section">
          <TeamDistribution />
        </section>

        <section className="admin-section">
          <GlobalTimerControl />
        </section>

        <section className="admin-section">
          <Leaderboard />
        </section>
      </div>
    </div>
  )
}

export default Admin