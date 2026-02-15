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
    { label: '🚫 Disqualification Offense', value: 'Disqualification Offense', points: 200 }
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
        `${adjustmentForm.adjustment_type === 'reward' ? 'Reward' : 'Deduction'} of ${adjustmentForm.amount} points applied!\nNew Score: ${response.data.new_score}`
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2>📋 Volunteer Panel</h2>
        
        {/* Change PIN Button */}
        <button
          onClick={() => {
            setShowPinChange(!showPinChange)
            setPinMessage('')
            setNewPin('')
            setConfirmPin('')
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f39c12',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔐 Change My PIN
        </button>
      </div>

      {/* Change PIN Section */}
      {showPinChange && (
        <div style={{
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(243, 156, 18, 0.3)'
        }}>
          <h3 style={{ marginTop: 0, color: '#f39c12' }}>🔐 Change My PIN</h3>
          <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '15px' }}>
            Enter your new PIN below. You'll need to use this PIN for your next login.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
            <input
              type="password"
              placeholder="Enter new PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff',
                fontSize: '16px'
              }}
            />
            <input
              type="password"
              placeholder="Confirm new PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChangePin()}
              style={{
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleChangePin}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#2ecc71',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
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
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #888',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          {pinMessage && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              borderRadius: '4px',
              backgroundColor: pinMessage.includes('✅') 
                ? 'rgba(46, 204, 113, 0.2)' 
                : 'rgba(231, 76, 60, 0.2)',
              color: pinMessage.includes('✅') ? '#2ecc71' : '#e74c3c',
              border: `1px solid ${pinMessage.includes('✅') ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`
            }}>
              {pinMessage}
            </div>
          )}
        </div>
      )}

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
                  <td style={{ fontSize: '18px', fontWeight: 'bold', color: team.score < 0 ? '#e74c3c' : '#2ecc71' }}>
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
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Quick Categories
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                {PENALTY_CATEGORIES[adjustmentForm.adjustment_type].map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: adjustmentForm.reason === category.value ? '2px solid #2ecc71' : '1px solid #444',
                      backgroundColor: adjustmentForm.reason === category.value ? 'rgba(46, 204, 113, 0.2)' : '#222',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    {category.label}
                    <br/>
                    <strong style={{ color: adjustmentForm.adjustment_type === 'reward' ? '#2ecc71' : '#e74c3c' }}>
                      {category.points}pts
                    </strong>
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={useCustomReason}
                    onChange={(e) => setUseCustomReason(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Use Custom Reason
                </label>
              </div>
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
                Reason {useCustomReason && '(Custom)'}
              </label>
              {useCustomReason ? (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason"
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
              ) : (
                <input
                  type="text"
                  value={adjustmentForm.reason}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#111',
                    color: '#666',
                  }}
                  placeholder="Select a category above or enable custom reason"
                />
              )}
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
