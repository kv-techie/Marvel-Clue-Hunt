import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTimer } from '../context/TimerContext'
import { getTeamStatus, startTeamTimer, getCurrentDialogue, teamAcknowledgeDisqualification } from '../api/client'
import TeamTimer from './TeamTimer'
import HintPanel from './HintPanel'
import DialogueRound from './DialogueRound'
import StatusBanner from '../components/StatusBanner'

const AttendeeDashboard = () => {
  const { team } = useAuth()
  const { startTimer, elapsedTime } = useTimer()
  const [teamStatus, setTeamStatus] = useState(null)
  const [currentDialogue, setCurrentDialogue] = useState(1)
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState(false)
  const [ackMessage, setAckMessage] = useState('')

  const fetchTeamStatus = async () => {
    try {
      const response = await getTeamStatus(team)
      setTeamStatus(response.data)
      
      // Start timer if not already running
      if (response.data.elapsed_time > 0) {
        startTimer(response.data.elapsed_time)
      }
    } catch (err) {
      console.error('Failed to fetch team status:', err)
    }
  }

  const fetchCurrentDialogue = async () => {
    try {
      const response = await getCurrentDialogue(team)
      setCurrentDialogue(response.data.current_dialogue)
    } catch (err) {
      console.error('Failed to fetch current dialogue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initializeTeam = async () => {
      try {
        await startTeamTimer(team)
        await fetchTeamStatus()
        await fetchCurrentDialogue()
      } catch (err) {
        console.error('Failed to initialize:', err)
        setLoading(false)
      }
    }

    initializeTeam()
    
    // Refresh status every 2 seconds for instant updates
    const interval = setInterval(() => {
      fetchTeamStatus()
      fetchCurrentDialogue()
    }, 2000)

    return () => clearInterval(interval)
  }, [team])

  const handleDialogueComplete = () => {
    // Immediately refresh on completion
    setTimeout(() => {
      fetchTeamStatus()
      fetchCurrentDialogue()
    }, 500)
  }

  const handleAcknowledgeDisqualification = async () => {
    setAcknowledging(true)
    setAckMessage('')

    try {
      await teamAcknowledgeDisqualification(team)
      setAckMessage('✅ Disqualification acknowledged. Please see the admin panel.')
      setTimeout(() => {
        fetchTeamStatus()
      }, 1500)
    } catch (err) {
      setAckMessage(`Error: ${err.response?.data?.detail || 'Failed to acknowledge'}`)
    } finally {
      setAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-grid">
        <div className="card">
          <h2>Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-grid">
      <StatusBanner teamStatus={teamStatus} />

      {teamStatus?.disqualified && (
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: 'rgba(231, 76, 60, 0.15)',
          border: '2px solid #e74c3c',
          marginBottom: '20px',
          gridColumn: '1 / -1'
        }}>
          <h2 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>⚠️ DISQUALIFICATION NOTICE</h2>
          <p style={{ margin: '10px 0', fontSize: '16px' }}>
            Your team has been flagged for disqualification.
          </p>
          <p style={{ margin: '10px 0', fontSize: '14px', color: '#bbb' }}>
            <strong>Reason:</strong> {teamStatus.disqualification_reason}
          </p>
          {teamStatus.disqualification_confirmed && !teamStatus.disqualification_acknowledged && (
            <div style={{ marginTop: '15px' }}>
              <p style={{ color: '#f39c12', fontWeight: 'bold', marginBottom: '10px' }}>
                The admin has confirmed your disqualification. Please acknowledge below:
              </p>
              <button
                onClick={handleAcknowledgeDisqualification}
                disabled={acknowledging}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  opacity: acknowledging ? 0.6 : 1
                }}
              >
                {acknowledging ? 'Acknowledging...' : '✓ Acknowledge Disqualification'}
              </button>
              {ackMessage && (
                <p style={{
                  marginTop: '10px',
                  color: ackMessage.startsWith('Error') ? '#e74c3c' : '#2ecc71',
                  fontSize: '14px'
                }}>
                  {ackMessage}
                </p>
              )}
            </div>
          )}
          {teamStatus.disqualification_acknowledged && (
            <p style={{ color: '#2ecc71', fontWeight: 'bold', marginTop: '10px' }}>
              ✅ Disqualification acknowledged
            </p>
          )}
        </div>
      )}
      
      <TeamTimer />

      {teamStatus && (
        <div className="card">
          <h2>📊 Team Progress</h2>
          <div className="progress-indicator">
            <div className={`progress-step ${teamStatus.dialogue_1_completed ? 'completed' : currentDialogue === 1 ? 'active' : ''}`}>
              <h3>Dialogue 1</h3>
              <p>{teamStatus.dialogue_1_completed ? '✅ Complete' : currentDialogue === 1 ? '⏳ Active' : '🔒 Locked'}</p>
            </div>
            <div className={`progress-step ${teamStatus.dialogue_2_completed ? 'completed' : currentDialogue === 2 ? 'active' : ''}`}>
              <h3>Dialogue 2</h3>
              <p>{teamStatus.dialogue_2_completed ? '✅ Complete' : currentDialogue === 2 ? '⏳ Active' : '🔒 Locked'}</p>
            </div>
            <div className={`progress-step ${teamStatus.dialogue_3_completed ? 'completed' : currentDialogue === 3 ? 'active' : ''}`}>
              <h3>Dialogue 3</h3>
              <p>{teamStatus.dialogue_3_completed ? '✅ Complete' : currentDialogue === 3 ? '⏳ Active' : '🔒 Locked'}</p>
            </div>
          </div>
        </div>
      )}

      {currentDialogue > 0 && currentDialogue <= 3 && (
        <>
          <HintPanel 
            teamName={team} 
            dialogueNumber={currentDialogue}
            hintsUsed={teamStatus?.hints_used || 0}
            hintsRemaining={teamStatus?.hints_remaining || 3}
          />
          
          <DialogueRound 
            teamName={team}
            dialogueNumber={currentDialogue}
            elapsedTime={elapsedTime}
            onComplete={handleDialogueComplete}
          />
        </>
      )}

      {currentDialogue === 0 && (
        <div className="success-message" style={{ fontSize: '24px', padding: '40px' }}>
          🎉 Congratulations! All dialogues completed!
          <br />
          <br />
          {teamStatus?.qualified ? (
            <span>✅ Your team is QUALIFIED for the final round!</span>
          ) : (
            <span>You completed the hunt! Check the leaderboard for results.</span>
          )}
          <br />
          <br />
          <strong style={{ color: teamStatus?.current_score < 0 ? '#e74c3c' : '#2ecc71' }}>Final Score: {teamStatus?.current_score}</strong>
        </div>
      )}
    </div>
  )
}

export default AttendeeDashboard