import React, { useState, useEffect } from 'react'
import { getLeaderboard, adjustPoints, setPin } from '../api/client'
import { useAuth } from '../context/AuthContext'

// Predefined point deduction categories
const PENALTY_CATEGORIES = {
  reward: [
    { label: '➕ Bonus (Generic)', value: 'Bonus (Generic)', points: 25 },
    { label: '⭐ Excellent Performance', value: 'Excellent Performance', points: 50 },
    { label: '🏆 Outstanding Achievement', value: 'Outstanding Achievement', points: 100 }
  ],
  deduct: [
    { label: '📱 Phone Usage - Warning 1', value: 'Phone Usage - Warning 1', points: 25 },
    { label: '📱 Phone Usage - Warning 2', value: 'Phone Usage - Warning 2', points: 50 },
    { label: '📱 Phone Usage - Violation', value: 'Phone Usage - Violation', points: 100 },
    { label: '🗣️ Unauthorized Discussion - Minor', value: 'Unauthorized Discussion - Minor', points: 20 },
    { label: '🗣️ Unauthorized Discussion - Major', value: 'Unauthorized Discussion - Major', points: 75 },
    { label: '❌ Rule Violation (General)', value: 'Rule Violation (General)', points: 30 },
    { label: '⚠️ Unsportsmanlike Conduct', value: 'Unsportsmanlike Conduct', points: 50 },
    { label: '🚫 Disqualification Offense', value: 'Disqualification Offense', points: 500 }
  ]
}

const VolunteerDashboard = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [adjustmentForm, setAdjustmentForm] = useState({
    amount: '',
    reason: '',
    adjustment_type: 'reward',
  })
  const [customReason, setCustomReason] = useState('')
  const [useCustomReason, setUseCustomReason] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // PIN change state
  const [showPinChange, setShowPinChange] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  
  const { user } = useAuth()

  const fetchLeaderboard = async () => {
    try {
      const response = await getLeaderboard()
      setLeaderboard(response.leaderboard)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
      setError('Failed to load leaderboard')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    // Poll every 2 seconds for instant feedback
    const interval = setInterval(fetchLeaderboard, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleCategorySelect = (category) => {
    setAdjustmentForm({
      amount: category.points,
      reason: category.value,
      adjustment_type: adjustmentForm.adjustment_type,
    })
    setUseCustomReason(false)
  }

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

    const finalReason = useCustomReason ? customReason.trim() : adjustmentForm.reason.trim()
    
    if (!finalReason) {
      setError('Please provide or select a reason')
      return
    }

    try {
      const response = await adjustPoints(selectedTeam, user, {
        amount: parseInt(adjustmentForm.amount, 10),
        reason: finalReason,
        adjustment_type: adjustmentForm.adjustment_type,
      })

      setSuccess(
        `${adjustmentForm.adjustment_type === 'reward' ? 'Reward' : 'Deduction'} of ${adjustmentForm.amount} points applied!\nNew Score: ${response.new_score}`
      )

      // Immediately refresh leaderboard
      setTimeout(() => fetchLeaderboard(), 300)
      
      setAdjustmentForm({ amount: '', reason: '', adjustment_type: 'reward' })
      setCustomReason('')
      setUseCustomReason(false)
      setSelectedTeam(null)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to adjust points')
    }
  }

  // Change PIN functionality
  const handleChangePin = async () => {
    if (!newPin.trim()) {
      setPinMessage('❌ Please enter a new PIN')
      return
    }

    if (newPin !== confirmPin) {
      setPinMessage('❌ PINs do not match')
      return
    }

    if (newPin.length < 4) {
      setPinMessage('❌ PIN must be at least 4 characters')
      return
    }

    try {
      await setPin('volunteer', user, newPin.trim())
      setPinMessage('✅ PIN changed successfully! Use your new PIN for next login.')
      setNewPin('')
      setConfirmPin('')
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowPinChange(false)
        setPinMessage('')
      }, 3000)
    } catch (err) {
      setPinMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to change PIN'}`)
    }
  }

  if (loading) {
    return <div>Loading leaderboard...</div>
  }

  return (
    <div>
      <div className="volunteer-topbar">
        <h2 className="volunteer-title">📋 Volunteer Panel</h2>
        
        {/* Change PIN Button */}
        <button
          onClick={() => {
            setShowPinChange(!showPinChange)
            setPinMessage('')
            setNewPin('')
            setConfirmPin('')
          }}
          className="volunteer-pin-button"
        >
          🔐 Change My PIN
        </button>
      </div>

      {/* Change PIN Section */}
      {showPinChange && (
        <div className="volunteer-pin-panel">
          <h3>🔐 Change My PIN</h3>
          <p>
            Enter your new PIN below. You'll need to use this PIN for your next login.
          </p>
          
          <div className="volunteer-pin-inputs">
            <label htmlFor="volunteer-new-pin" className="sr-only">
              New PIN
            </label>
            <input
              id="volunteer-new-pin"
              type="password"
              placeholder="Enter new PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
            />
            <label htmlFor="volunteer-confirm-pin" className="sr-only">
              Confirm new PIN
            </label>
            <input
              id="volunteer-confirm-pin"
              type="password"
              placeholder="Confirm new PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChangePin()}
            />
          </div>

          <div className="volunteer-pin-actions">
            <button
              onClick={handleChangePin}
              className="volunteer-pin-primary"
            >
              Save New PIN
            </button>
            <button
              onClick={() => {
                setShowPinChange(false)
                setPinMessage('')
                setNewPin('')
                setConfirmPin('')
              }}
              className="volunteer-pin-secondary"
            >
              Cancel
            </button>
          </div>

          {pinMessage && (
            <div className={`volunteer-pin-message ${pinMessage.includes('✅') ? 'success' : 'error'}`}>
              {pinMessage}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="volunteer-message error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="volunteer-message success">
          ✅ {success}
        </div>
      )}

      <div className="volunteer-grid">
        {/* Leaderboard */}
        <div>
          <h3>Live Leaderboard</h3>
          <table className="leaderboard-table volunteer-leaderboard">
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
                  className={selectedTeam === team.team_name ? 'is-selected' : ''}
                >
                  <td className="volunteer-rank">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td>
                    <strong>{team.team_name}</strong>
                  </td>
                  <td className={`volunteer-score ${team.score < 0 ? 'negative' : 'positive'}`}>
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
          <form onSubmit={handleAdjustPoints} className="volunteer-form">
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="selected-team-display">
                Selected Team
              </label>
              <input
                id="selected-team-display"
                type="text"
                value={selectedTeam || ''}
                disabled
                className="volunteer-disabled-input"
              />
              <small>Click on a team in the leaderboard</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="adjustment-type">
                Adjustment Type
              </label>
              <select
                id="adjustment-type"
                value={adjustmentForm.adjustment_type}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, adjustment_type: e.target.value })
                }
                className="volunteer-select"
              >
                <option value="reward">➕ Reward Points</option>
                <option value="deduct">➖ Deduct Points</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Quick Categories
              </label>
              <div className="volunteer-category-grid">
                {PENALTY_CATEGORIES[adjustmentForm.adjustment_type].map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className={`volunteer-category-button ${adjustmentForm.reason === category.value ? 'active' : ''}`}
                  >
                    {category.label}
                    <br/>
                    <strong className={`volunteer-category-points ${adjustmentForm.adjustment_type === 'reward' ? 'reward' : 'deduct'}`}>
                      {category.points}pts
                    </strong>
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
                <label className="volunteer-custom-toggle">
                  <input
                    id="use-custom-reason"
                    type="checkbox"
                    checked={useCustomReason}
                    onChange={(e) => setUseCustomReason(e.target.checked)}
                  />
                  Use Custom Reason
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="adjustment-amount">
                Amount
              </label>
              <input
                id="adjustment-amount"
                type="number"
                min="1"
                value={adjustmentForm.amount}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })
                }
                placeholder="Enter amount"
                className="volunteer-input"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor={useCustomReason ? 'custom-reason' : 'selected-reason'}>
                Reason {useCustomReason && '(Custom)'}
              </label>
              {useCustomReason ? (
                <textarea
                  id="custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason"
                  rows="3"
                  className="volunteer-input"
                />
              ) : (
                <input
                  id="selected-reason"
                  type="text"
                  value={adjustmentForm.reason}
                  disabled
                  className="volunteer-disabled-input"
                  placeholder="Select a category above or enable custom reason"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={!selectedTeam}
              className="btn btn-primary volunteer-submit"
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
