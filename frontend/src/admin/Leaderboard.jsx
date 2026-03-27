import React, { useState, useEffect } from 'react'
import { getLeaderboard, awardEnactmentBonus, reverseDisqualification } from '../api/client'
import { useAuth } from '../context/AuthContext'

// Utility function to convert data to CSV format
const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  let csv = headers.join(',') + '\n'
  
  // Add rows
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header]
      // Handle arrays (like members)
      if (Array.isArray(value)) {
        value = '"' + value.join('; ') + '"'
      }
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = ''
      }
      // Escape quotes in values
      if (typeof value === 'string' && value.includes('"')) {
        value = '"' + value.replace(/"/g, '""') + '"'
      }
      return value
    })
    csv += values.join(',') + '\n'
  })

  // Create blob and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const Leaderboard = () => {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'disqualified'
  const [reinstatingTeam, setReinstatingTeam] = useState(null)
  const [message, setMessage] = useState('')

  const fetchLeaderboard = async () => {
    try {
      const response = await getLeaderboard()
      setLeaderboard(response.leaderboard)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 2000) // Refresh every 2 seconds for instant updates
    return () => clearInterval(interval)
  }, [])

  // Separate active and disqualified teams
  const activeTeams = leaderboard.filter(team => !team.disqualified)
  const disqualifiedTeams = leaderboard.filter(team => team.disqualified)

  // Function to get the disqualification reason with highest deduction
  const getMainDisqualificationReason = (team) => {
    if (!team.manual_adjustments || team.manual_adjustments.length === 0) {
      return team.disqualification_reason || 'Unknown reason'
    }

    // Find deductions (negative adjustments)
    const deductions = team.manual_adjustments
      .filter(adj => adj.adjustment_type === 'deduct')
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending

    if (deductions.length > 0) {
      return deductions[0].reason
    }

    return team.disqualification_reason || 'Unknown reason'
  }

  const handleAwardBonus = async (teamName) => {
    const bonusAmount = prompt(`Enter bonus amount for ${teamName}:`, '10')
    if (bonusAmount === null) return // User cancelled
    
    const bonus = parseInt(bonusAmount, 10)
    if (isNaN(bonus) || bonus <= 0) {
      alert('Please enter a valid positive number')
      return
    }

    try {
      const response = await awardEnactmentBonus(teamName, bonus)
      alert(`Enactment bonus of ${bonus} awarded to ${teamName}!\nNew Score: ${response.new_score}`)
      // Immediately refresh leaderboard
      await fetchLeaderboard()
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to award bonus'}`)
    }
  }

  const handleExportLeaderboard = () => {
    const exportData = leaderboard.map(team => ({
      'Team Name': team.team_name,
      'Members': team.members.join('; '),
      'Score': team.score,
      'Questions Completed': team.questions_completed,
      'Hints Used': team.hints_used,
      'Qualified': team.qualified ? 'Yes' : 'No',
      'Status': team.disqualified ? 'Disqualified' : 'Active',
      'Disqualification Reason': team.disqualification_reason || 'N/A'
    }))

    const timestamp = new Date().toISOString().split('T')[0]
    downloadCSV(exportData, `leaderboard_${timestamp}.csv`)
  }

  const handleReinstate = async (teamName) => {
    if (!window.confirm(`🔄 Are you sure you want to REINSTATE ${teamName}?\n\nThis will allow the team to play again.`)) {
      return
    }

    setReinstatingTeam(teamName)
    setMessage('')

    try {
      await reverseDisqualification(teamName, user)
      setMessage(`✅ ${teamName} has been reinstated successfully`)
      setTimeout(() => {
        setMessage('')
        fetchLeaderboard()
      }, 2000)
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to reinstate'}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setReinstatingTeam(null)
    }
  }

  if (loading) {
    return <div>Loading leaderboard...</div>
  }

  return (
    <div>
      <h2>🏆 Leaderboard</h2>
      
      {message && (
        <div
          style={{
            padding: '15px',
            borderRadius: '5px',
            background: message.startsWith('❌') ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
            marginBottom: '15px',
            color: message.startsWith('❌') ? '#e74c3c' : '#2ecc71',
            fontWeight: 'bold'
          }}
        >
          {message}
        </div>
      )}
      
      {/* Export Button */}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={handleExportLeaderboard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          📥 Download as CSV
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="tab-navigation" style={{ marginBottom: '20px', borderBottom: '2px solid #444' }}>
        <button
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'active' ? '#3498db' : '#555',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            borderRadius: '4px 4px 0 0'
          }}
        >
          Active Teams ({activeTeams.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'disqualified' ? 'active' : ''}`}
          onClick={() => setActiveTab('disqualified')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'disqualified' ? '#e74c3c' : '#555',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            borderRadius: '4px 4px 0 0'
          }}
        >
          Disqualified Teams ({disqualifiedTeams.length})
        </button>
      </div>

      {/* Active Teams Tab */}
      {activeTab === 'active' && (
        <div>
          {activeTeams.length === 0 ? (
            <p>No active teams in the leaderboard.</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Score</th>
                  <th>Questions</th>
                  <th>Hints Used</th>
                  <th>Qualified</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeTeams.map((team, index) => (
                  <tr key={team.team_name}>
                    <td style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td>
                      <strong>{team.team_name}</strong>
                      <br />
                      <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {team.members.join(', ')}
                      </small>
                    </td>
                    <td style={{ fontSize: '20px', fontWeight: 'bold', color: team.score < 0 ? '#e74c3c' : '#2ecc71' }}>
                      {team.score}
                    </td>
                    <td>{team.questions_completed || 0}/10</td>
                    <td>{team.hints_used}/3</td>
                    <td>
                      {team.qualified ? (
                        <span style={{ color: '#2ecc71' }}>✅ Yes</span>
                      ) : (
                        <span style={{ color: '#e74c3c' }}>❌ No</span>
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleAwardBonus(team.team_name)}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '14px' }}
                      >
                        Award Bonus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Disqualified Teams Tab */}
      {activeTab === 'disqualified' && (
        <div>
          {disqualifiedTeams.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px' }}>
              <p style={{ color: '#2ecc71', fontWeight: 'bold' }}>✅ No disqualified teams</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {disqualifiedTeams.map((team) => (
                <div
                  key={team.team_name}
                  style={{
                    padding: '15px',
                    backgroundColor: 'rgba(231, 76, 60, 0.15)',
                    borderLeft: '4px solid #e74c3c',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '18px' }}>⛔ {team.team_name}</strong>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e74c3c' }}>
                        {team.score} pts
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Reason:</strong>
                      <span style={{ color: '#e74c3c', marginLeft: '8px', fontWeight: '500' }}>
                        {getMainDisqualificationReason(team)}
                      </span>
                    </div>
                    <div>
                      <strong>Members:</strong>
                      <small style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '8px' }}>
                        {team.members.join(', ')}
                      </small>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReinstate(team.team_name)}
                    disabled={reinstatingTeam === team.team_name}
                    style={{
                      padding: '10px 20px',
                      marginLeft: '15px',
                      background: 'linear-gradient(135deg, #3498db, #2980b9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      opacity: reinstatingTeam === team.team_name ? 0.6 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {reinstatingTeam === team.team_name ? 'Reinstating...' : '🔄 Reinstate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
