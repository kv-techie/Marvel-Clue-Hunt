import React, { useEffect, useState } from 'react'
import { getGameStatus } from '../api/client'

const AdminDashboard = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const response = await getGameStatus()
      setStatus(response.data)
    } catch (err) {
      console.error('Failed to fetch game status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div>Loading game status...</div>
  }

  return (
    <div>
      <h2>📊 Game Overview</h2>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="stat-card card">
          <h3>Game Status</h3>
          <p style={{ fontSize: '24px', color: status?.game_active ? '#2ecc71' : '#e74c3c' }}>
            {status?.game_active ? '🟢 Active' : '🔴 Inactive'}
          </p>
        </div>
        
        <div className="stat-card card">
          <h3>Total Teams</h3>
          <p style={{ fontSize: '24px', color: '#3498db' }}>{status?.total_teams || 0}</p>
        </div>
        
        <div className="stat-card card">
          <h3>Active Teams</h3>
          <p style={{ fontSize: '24px', color: '#f39c12' }}>{status?.teams_active || 0}</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard