import React, { useState, useEffect } from 'react'
import { getDisqualificationCandidates, confirmDisqualification, getAllTeams, reverseDisqualification } from '../api/client'
import { useAuth } from '../context/AuthContext'

const DisqualificationManager = () => {
  const [candidates, setCandidates] = useState([])
  const [disqualifiedTeams, setDisqualifiedTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [reversing, setReversing] = useState(null)

  const { user } = useAuth()

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
      <h2>⚠️ Disqualification Manager</h2>

      {message && (
        <div
          style={{
            padding: '15px',
            borderRadius: '5px',
            background: message.startsWith('Error') ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
            marginBottom: '15px',
            color: message.startsWith('Error') ? '#e74c3c' : '#2ecc71'
          }}
        >
          {message}
        </div>
      )}

      {/* DISQUALIFIED TEAMS SECTION */}
      {disqualifiedTeams.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#e74c3c', marginBottom: '15px' }}>
            ⛔ Currently Disqualified Teams ({disqualifiedTeams.length})
          </h3>
          <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
            {disqualifiedTeams.map((team) => (
              <div
                key={team.name}
                style={{
                  padding: '15px',
                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                  borderLeft: '4px solid #e74c3c',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#e74c3c' }}>{team.name}</h4>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Members:</strong> {team.members.join(', ')}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Reason:</strong> {team.disqualification_reason || 'No reason provided'}
                    </p>
                    {team.disqualification_timestamp && (
                      <p style={{ margin: '5px 0', fontSize: '12px', color: '#bbb' }}>
                        <strong>Disqualified at:</strong> {new Date(team.disqualification_timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleReverseDisqualification(team.name)}
                    disabled={reversing === team.name}
                    style={{
                      padding: '10px 20px',
                      marginLeft: '15px',
                      background: 'linear-gradient(135deg, #3498db, #2980b9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      opacity: reversing === team.name ? 0.6 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {reversing === team.name ? 'Reversing...' : '🔄 Reverse'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CANDIDATES FOR DISQUALIFICATION SECTION */}
      <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>
        ⚠️ Teams Eligible for Auto-Disqualification
      </h3>

      {candidates.length === 0 ? (
        <div style={{ padding: '20px', backgroundColor: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px' }}>
          <p style={{ color: '#2ecc71', fontWeight: 'bold' }}>✅ No teams eligible for disqualification</p>
          <small>Teams are eligible when total deductions exceed the threshold</small>
        </div>
      ) : (
        <div>
          <p style={{ color: '#f39c12', marginBottom: '15px' }}>
            <strong>{candidates.length} team(s) eligible for disqualification</strong>
          </p>
          <div style={{ display: 'grid', gap: '15px' }}>
            {candidates.map((candidate) => (
              <div
                key={candidate.team_name}
                style={{
                  padding: '15px',
                  backgroundColor: 'rgba(231, 76, 60, 0.1)',
                  borderLeft: '4px solid #e74c3c',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>{candidate.team_name}</h4>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Members:</strong> {candidate.members.join(', ')}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#f39c12' }}>
                      <strong>Total Deductions:</strong> {candidate.total_deductions} points
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Threshold:</strong> {candidate.threshold} points
                    </p>
                    <p style={{ margin: '10px 0', fontSize: '13px', color: '#e74c3c' }}>
                      {candidate.reason}
                    </p>
                  </div>
                  <button
                    onClick={() => handleConfirmDisqualification(candidate.team_name)}
                    disabled={confirming === candidate.team_name}
                    style={{
                      padding: '10px 20px',
                      marginLeft: '15px',
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      opacity: confirming === candidate.team_name ? 0.6 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {confirming === candidate.team_name ? 'Confirming...' : 'Confirm Disqualification'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderRadius: '6px' }}>
        <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>
          <strong>ℹ️ System automatically flags teams when their total deductions exceed 200 points.
          Admin must confirm to officially disqualify. Teams will be notified and must acknowledge.
          Administrators can reverse disqualification by clicking the 🔄 Reverse button.</strong>
        </p>
      </div>
    </div>
  )
}

export default DisqualificationManager
