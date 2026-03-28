import React, { useState, useEffect } from 'react'
import { getDisqualificationCandidates, confirmDisqualification, getAllTeams, reverseDisqualification } from '../api/client'
import { useAuth } from '../context/AuthContext'
import '../styles/AdminComponents.css'

const DisqualificationManager = () => {
  const [candidates, setCandidates] = useState([])
  const [disqualifiedTeams, setDisqualifiedTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [reversing, setReversing] = useState(null)

  const { user, isGuest } = useAuth()

  const fetchData = async () => {
    try {
      const candidatesResponse = await getDisqualificationCandidates()
      setCandidates(candidatesResponse.candidates)
      
      // Fetch all teams to get disqualified ones
      const teamsResponse = await getAllTeams()
      const disqualified = teamsResponse.teams.filter(team => team.disqualified)
      setDisqualifiedTeams(disqualified)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Poll every 3 seconds
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleConfirmDisqualification = async (teamName) => {
    if (!window.confirm(`⚠️ Confirm disqualification of ${teamName}?\n\nThis action cannot be undone.`)) {
      return
    }

    setConfirming(teamName)
    setMessage('')

    try {
      const response = await confirmDisqualification(teamName, user)
      setMessage(`✅ ${teamName} has been disqualified`)
      setTimeout(() => {
        setMessage('')
        fetchData()
      }, 2000)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to confirm'}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setConfirming(null)
    }
  }

  const handleReverseDisqualification = async (teamName) => {
    if (!window.confirm(`🔄 Are you sure you want to REVERSE disqualification for ${teamName}?\n\nThis will allow the team to play again.`)) {
      return
    }

    setReversing(teamName)
    setMessage('')

    try {
      const response = await reverseDisqualification(teamName, user)
      setMessage(`✅ Disqualification reversed for ${teamName}`)
      setTimeout(() => {
        setMessage('')
        fetchData()
      }, 2000)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to reverse'}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setReversing(null)
    }
  }

  if (loading) {
    return <div>Loading disqualification data...</div>
  }

  return (
    <div>
      <h2 className="admin-section-title">⚠️ Disqualification Manager</h2>

      {message && (
        <div className={`admin-message ${message.startsWith('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* DISQUALIFIED TEAMS SECTION */}
      {disqualifiedTeams.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 className="admin-section-title" style={{ marginBottom: '15px' }}>
            ⛔ Currently Disqualified Teams ({disqualifiedTeams.length})
          </h3>
          <div className="admin-list">
            {disqualifiedTeams.map((team) => (
              <div key={team.name} className="admin-list-item danger">
                <div style={{ flex: 1 }}>
                  <div className="admin-list-title admin-text-danger">{team.name}</div>
                  <p className="admin-list-text">
                    <strong>Members:</strong> {team.members.join(', ')}
                  </p>
                  <p className="admin-list-text">
                    <strong>Reason:</strong> {team.disqualification_reason || 'No reason provided'}
                  </p>
                  {team.disqualification_timestamp && (
                    <p className="admin-list-subtitle">
                      <strong>Disqualified at:</strong> {new Date(team.disqualification_timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="admin-list-actions">
                  {!isGuest ? (
                    <button
                      className="admin-btn secondary lg"
                      onClick={() => handleReverseDisqualification(team.name)}
                      disabled={reversing === team.name}
                    >
                      {reversing === team.name ? 'Reversing...' : '🔄 Reverse'}
                    </button>
                  ) : (
                    <span className="admin-locked-indicator">Locked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CANDIDATES FOR DISQUALIFICATION SECTION */}
      <h3 className="admin-section-title" style={{ color: 'var(--accent-gold)', marginBottom: '15px' }}>
        ⚠️ Teams Eligible for Auto-Disqualification
      </h3>

      {candidates.length === 0 ? (
        <div className="admin-form-panel" style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', borderColor: 'rgba(46, 204, 113, 0.3)' }}>
          <p className="admin-text-success" style={{ fontWeight: 'bold' }}>✅ No teams eligible for disqualification</p>
          <small className="admin-text-muted">Teams are eligible when total deductions exceed the threshold</small>
        </div>
      ) : (
        <div>
          <p className="admin-text-warning" style={{ marginBottom: '15px', fontWeight: 'bold' }}>
            {candidates.length} team(s) eligible for disqualification
          </p>
          <div className="admin-list">
            {candidates.map((candidate) => (
              <div key={candidate.team_name} className="admin-list-item danger">
                <div style={{ flex: 1 }}>
                  <div className="admin-list-title admin-text-danger">{candidate.team_name}</div>
                  <p className="admin-list-text">
                    <strong>Members:</strong> {candidate.members.join(', ')}
                  </p>
                  <p className="admin-list-text admin-text-warning">
                    <strong>Total Deductions:</strong> {candidate.total_deductions} points
                  </p>
                  <p className="admin-list-text">
                    <strong>Threshold:</strong> {candidate.threshold} points
                  </p>
                  <p className="admin-list-subtitle admin-text-danger" style={{ marginTop: '10px' }}>
                    {candidate.reason}
                  </p>
                </div>
                <div className="admin-list-actions">
                  {!isGuest ? (
                    <button
                      className="admin-btn primary lg"
                      onClick={() => handleConfirmDisqualification(candidate.team_name)}
                      disabled={confirming === candidate.team_name}
                    >
                      {confirming === candidate.team_name ? 'Confirming...' : 'Confirm Disqualification'}
                    </button>
                  ) : (
                    <span className="admin-locked-indicator">View Only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-message info" style={{ marginTop: '20px' }}>
        <p style={{ fontSize: '12px', margin: 0 }}>
          <strong>ℹ️ System automatically flags teams when their total deductions exceed 500 points.
          Admin must confirm to officially disqualify. Teams will be notified and must acknowledge.
          Administrators can reverse disqualification by clicking the 🔄 Reverse button.</strong>
        </p>
      </div>
    </div>
  )
}

export default DisqualificationManager
