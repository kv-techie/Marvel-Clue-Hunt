import React, { useEffect, useState } from 'react'
import { getGameStatus } from '../api/client'
import '../styles/AdminComponents.css'

const AdminDashboard = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const response = await getGameStatus()
      setStatus(response)
    } catch (err) {
      console.error('Failed to fetch game status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Poll every 1 second for instant status updates
    const interval = setInterval(fetchStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div>Loading game status...</div>
  }

  return (
    <div>
      <h2 className="admin-section-title">📊 Game Overview</h2>
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <h3>Game Status</h3>
          <p className={`admin-stat-value ${status?.game_active ? 'success' : 'danger'}`}>
            {status?.game_active ? '🟢 Active' : '🔴 Inactive'}
          </p>
        </div>
        
        <div className="admin-stat-card">
          <h3>Total Teams</h3>
          <p className="admin-stat-value info">{status?.total_teams || 0}</p>
        </div>
        
        <div className="admin-stat-card">
          <h3>Active Teams</h3>
          <p className="admin-stat-value warning">{status?.teams_active || 0}</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard