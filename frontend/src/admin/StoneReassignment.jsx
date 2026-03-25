import React, { useState } from 'react'

const StoneReassignment = () => {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedStone, setSelectedStone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const teams = [
    'Mind Stone',
    'Power Stone',
    'Time Stone',
    'Space Stone',
    'Reality Stone',
    'Soul Stone'
  ]

  const stones = [
    'Mind Stone',
    'Power Stone',
    'Time Stone',
    'Space Stone',
    'Reality Stone',
    'Soul Stone'
  ]

  const handleReassign = async () => {
    if (!selectedTeam || !selectedStone) {
      setMessage('❌ Please select both a team and a stone')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/admin/assign-stone/${selectedTeam}/${selectedStone}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to reassign stone')
      }

      const data = await response.json()
      setMessage(`✅ ${data.message}`)
      setSelectedTeam('')
      setSelectedStone('')
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section-content">
      <h3>🔄 Reassign Stone to Team</h3>
      <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
        Reset team timer, streak, combo, and powerups by reassigning their stone
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', marginTop: '1.5rem' }}>
        {/* Team Selection */}
        <div>
          <label htmlFor="reassign-team" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Select Team
          </label>
          <select
            id="reassign-team"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#1a1f3a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            <option value="">-- Choose Team --</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        {/* Stone Selection */}
        <div>
          <label htmlFor="reassign-stone" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Select Stone
          </label>
          <select
            id="reassign-stone"
            value={selectedStone}
            onChange={(e) => setSelectedStone(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#1a1f3a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            <option value="">-- Choose Stone --</option>
            {stones.map((stone) => (
              <option key={stone} value={stone}>
                {stone}
              </option>
            ))}
          </select>
        </div>

        {/* Reassign Button */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={handleReassign}
            disabled={loading || !selectedTeam || !selectedStone}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: (loading || !selectedTeam || !selectedStone) ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Reassigning...' : '🔄 Reassign'}
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: message.includes('✅') ? '#1a3a2a' : '#3a1a1a',
            border: `1px solid ${message.includes('✅') ? '#27ae60' : '#e74c3c'}`,
            borderRadius: '4px',
            color: message.includes('✅') ? '#27ae60' : '#e74c3c'
          }}
        >
          {message}
        </div>
      )}

      {/* Info Box */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#1a2a3a',
          border: '1px solid #444',
          borderRadius: '4px',
          fontSize: '0.9rem',
          color: '#bbb'
        }}
      >
        <strong>ℹ️ What happens when you reassign:</strong>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
          <li>Team timer resets to zero</li>
          <li>Current streak resets to 0</li>
          <li>Combo multiplier resets to 1.0x</li>
          <li>Powerups reset for the new stone</li>
          <li>Questions answered so far are preserved</li>
        </ul>
      </div>
    </div>
  )
}

export default StoneReassignment
