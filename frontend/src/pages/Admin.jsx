import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AdminOperations from '../admin/AdminOperations'
import GameOperations from '../admin/GameOperations'
import LeaderboardPage from '../admin/LeaderboardPage'
import ElectronicsMonitoring from '../admin/ElectronicsMonitoring'
import GuestAccessPage from '../admin/GuestAccessPage'
import '../styles/Admin.css'

const Admin = () => {
  const { user, logout, isGuest } = useAuth()
  const [activePage, setActivePage] = useState('admin') // 'admin', 'game', 'leaderboard', 'electronics', 'guest_access'

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
        {!isGuest && (
          <button
            className={`nav-tab ${activePage === 'guest_access' ? 'active' : ''}`}
            onClick={() => setActivePage('guest_access')}
          >
            🔑 Guest Access
          </button>
        )}
      </nav>

      <div className="admin-content">
        {activePage === 'admin' && <AdminOperations />}
        {activePage === 'game' && <GameOperations />}
        {activePage === 'electronics' && <ElectronicsMonitoring />}
        {activePage === 'leaderboard' && <LeaderboardPage />}
        {!isGuest && activePage === 'guest_access' && <GuestAccessPage />}
      </div>
    </div>
  )
}

export default Admin
