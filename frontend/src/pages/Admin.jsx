import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AdminOperations from '../admin/AdminOperations'
import GameOperations from '../admin/GameOperations'
import LeaderboardPage from '../admin/LeaderboardPage'
import ElectronicsMonitoring from '../admin/ElectronicsMonitoring'
import '../styles/Admin.css'

const Admin = () => {
  const { user, logout } = useAuth()
  const [activePage, setActivePage] = useState('admin') // 'admin', 'game', 'leaderboard', 'electronics'

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>🛡️ Admin Control Panel</h1>
        <div className="admin-user-info">
          <span>Welcome, {user}</span>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs">
        <button
          className={`nav-tab ${activePage === 'admin' ? 'active' : ''}`}
          onClick={() => setActivePage('admin')}
        >
          👤 Admin Operations
        </button>
        <button
          className={`nav-tab ${activePage === 'game' ? 'active' : ''}`}
          onClick={() => setActivePage('game')}
        >
          🎮 Game Operations
        </button>
        <button
          className={`nav-tab ${activePage === 'electronics' ? 'active' : ''}`}
          onClick={() => setActivePage('electronics')}
        >
          📱 Electronics Monitoring
        </button>
        <button
          className={`nav-tab ${activePage === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActivePage('leaderboard')}
        >
          🏆 Leaderboard
        </button>
      </nav>

      {/* Content Sections */}
      <div className="admin-content">
        {activePage === 'admin' && <AdminOperations />}
        {activePage === 'game' && <GameOperations />}
        {activePage === 'electronics' && <ElectronicsMonitoring />}
        {activePage === 'leaderboard' && <LeaderboardPage />}
      </div>
    </div>
  )
}

export default Admin
