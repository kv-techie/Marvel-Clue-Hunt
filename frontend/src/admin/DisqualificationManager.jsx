import React, { useState, useEffect } from 'react'
import { getDisqualificationCandidates, confirmDisqualification } from '../api/client'
import { useAuth } from '../context/AuthContext'

const DisqualificationManager = () => {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(null)

  const { user } = useAuth()

  const fetchCandidates = async () => {
    try {
      const response = await getDisqualificationCandidates()
      setCandidates(response.data.candidates)
    } catch (err) {
      console.error('Failed to fetch candidates:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
    // Poll every 3 seconds
    const interval = setInterval(fetchCandidates, 3000)
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
        fetchCandidates()
      }, 2000)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to confirm'}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setConfirming(null)
    }
  }

  if (loading) {
    return <div>Loading disqualification candidates...</div>
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
                    <h3 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>{candidate.team_name}</h3>
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
          <strong>ℹ️ System automatically flags teams when their total deductions exceed {200} points.
          Admin must confirm to officially disqualify. Teams will be notified and must acknowledge.</strong>
        </p>
      </div>
    </div>
  )
}

export default DisqualificationManager
