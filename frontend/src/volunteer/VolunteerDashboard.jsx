import React, { useState, useEffect } from 'react'
import { getLeaderboard, adjustPoints } from '../api/client'
import { useAuth } from '../context/AuthContext'

const VolunteerDashboard = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [adjustmentForm, setAdjustmentForm] = useState({
    amount: '',
    reason: '',
    adjustment_type: 'reward',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const { user } = useAuth()

  const fetchLeaderboard = async () => {
    try {
      const response = await getLeaderboard()
      setLeaderboard(response.data.leaderboard)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
      setError('Failed to load leaderboard')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleAdjustPoints = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedTeam) {
      setError('Please select a team')
      return
    }

    if (!adjustmentForm.amount || adjustmentForm.amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!adjustmentForm.reason.trim()) {
      setError('Please provide a reason')
      return
    }

    try {
      const response = await adjustPoints(selectedTeam, user, {
        amount: parseInt(adjustmentForm.amount, 10),
        reason: adjustmentForm.reason.trim(),
        adjustment_type: adjustmentForm.adjustment_type,
      })

      setSuccess(
        `${adjustmentForm.adjustment_type === 'reward' ? 'Reward' : 'Deduction'} of ${adjustmentForm.amount} points applied!\nNew Score: ${response.data.new_score}`
      )

      setAdjustmentForm({ amount: '', reason: '', adjustment_type: 'reward' })
      setSelectedTeam(null)
      await fetchLeaderboard()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to adjust points')
    }
  }

  if (loading) {
    return <div>Loading leaderboard...</div>
  }

  return (
    <div>
      <h2>📋 Volunteer Panel</h2>

      {error && (
        <div
          style={{
            color: '#e74c3c',
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            borderRadius: '4px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            color: '#2ecc71',
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: 'rgba(46, 204, 113, 0.2)',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
          }}
        >
          ✅ {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Leaderboard */}
        <div>
          <h3>Live Leaderboard</h3>
          <table className="leaderboard-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((team, index) => (
                <tr
                  key={team.team_name}
                  onClick={() => setSelectedTeam(team.team_name)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      selectedTeam === team.team_name
                        ? 'rgba(52, 152, 219, 0.3)'
                        : 'transparent',
                  }}
                >
                  <td style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td>
                    <strong>{team.team_name}</strong>
                  </td>
                  <td style={{ fontSize: '18px', fontWeight: 'bold', color: '#2ecc71' }}>
                    {team.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Adjustment Form */}
        <div>
          <h3>Adjust Points</h3>
          <form onSubmit={handleAdjustPoints}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Selected Team
              </label>
              <input
                type="text"
                value={selectedTeam || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#222',
                  color: selectedTeam ? '#fff' : '#666',
                }}
              />
              <small style={{ color: '#bbb' }}>Click on a team in the leaderboard</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Adjustment Type
              </label>
              <select
                value={adjustmentForm.adjustment_type}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, adjustment_type: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#222',
                  color: '#fff',
                }}
              >
                <option value="reward">➕ Reward Points</option>
                <option value="deduct">➖ Deduct Points</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Amount
              </label>
              <input
                type="number"
                min="1"
                value={adjustmentForm.amount}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })
                }
                placeholder="Enter amount"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#222',
                  color: '#fff',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Reason (Required)
              </label>
              <textarea
                value={adjustmentForm.reason}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
                }
                placeholder="e.g., Outstanding performance, Rule violation, Bonus task"
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#222',
                  color: '#fff',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!selectedTeam}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                opacity: selectedTeam ? 1 : 0.5,
              }}
            >
              Apply Adjustment
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default VolunteerDashboard
