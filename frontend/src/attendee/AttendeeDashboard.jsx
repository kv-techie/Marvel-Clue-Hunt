import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTimer } from '../context/TimerContext'
import { getTeamStatus, startTeamTimer, getCurrentDialogue, teamAcknowledgeDisqualification } from '../api/client'
import { useTabFocusTracking } from '../hooks/useTabFocusTracking'
import TeamTimer from './TeamTimer'
import HintPanel from './HintPanel'
import DialogueRound from './DialogueRound'
import StatusBanner from '../components/StatusBanner'

// Tab Switch Warning Component
const TabSwitchWarning = ({ focusWarning, isPenalized, switchesRemaining, onDismiss }) => {
  if (!focusWarning) return null

  return (
    <div className={`tab-warning ${isPenalized ? 'penalized' : 'warned'}`}>
      <div className="tab-warning-content">
        <span className="tab-warning-icon">
          {isPenalized ? '🚨' : '⚠️'}
        </span>
        <div className="tab-warning-text">
          <h3 className="tab-warning-title">
            {isPenalized ? 'Electronics Violation: -50 Points!' : 'Tab Switch Detected'}
          </h3>
          <p className="tab-warning-message">
            {isPenalized ? (
              <>You've exceeded the allowed tab switches. <strong>-50 points deducted</strong> for this violation.</>
            ) : (
              <>You switched away from the game. You have <strong>{switchesRemaining} more</strong> free switches before points are deducted.</>
            )}
          </p>
          {!isPenalized && switchesRemaining === 1 && (
            <p className="tab-warning-final">
              ⚠️ Next switch will result in -50 point penalty!
            </p>
          )}
        </div>
        <button className="tab-warning-close" onClick={onDismiss}>
          ✕
        </button>
      </div>
    </div>
  )
}

// Disqualification Notice Component
const DisqualificationNotice = ({ teamStatus, onAcknowledge, acknowledging, ackMessage }) => {
  if (!teamStatus?.disqualified) return null

  return (
    <div className="disqualification-notice">
      <h2 className="disqualification-title">⚠️ DISQUALIFICATION NOTICE</h2>
      <p className="disqualification-message">
        Your team has been flagged for disqualification.
      </p>
      <p className="disqualification-reason">
        <strong>Reason:</strong> {teamStatus.disqualification_reason}
      </p>
      
      {teamStatus.disqualification_confirmed && !teamStatus.disqualification_acknowledged && (
        <div className="disqualification-actions">
          <p className="disqualification-action-text">
            The admin has confirmed your disqualification. Please acknowledge below:
          </p>
          <button
            className="disqualification-button"
            onClick={onAcknowledge}
            disabled={acknowledging}
          >
            {acknowledging ? 'Acknowledging...' : '✓ Acknowledge Disqualification'}
          </button>
          {ackMessage && (
            <p className={`disqualification-ack-message ${ackMessage.startsWith('Error') ? 'error' : 'success'}`}>
              {ackMessage}
            </p>
          )}
        </div>
      )}
      
      {teamStatus.disqualification_acknowledged && (
        <p className="disqualification-acknowledged">
          ✅ Disqualification acknowledged
        </p>
      )}
    </div>
  )
}

// Team Progress Component
const TeamProgress = ({ teamStatus, currentDialogue }) => {
  if (!teamStatus) return null

  const getProgressStatus = (dialogueNum) => {
    const completed = teamStatus[`dialogue_${dialogueNum}_completed`]
    if (completed) return { status: 'completed', text: '✅ Complete' }
    if (currentDialogue === dialogueNum) return { status: 'active', text: '⏳ Active' }
    return { status: 'locked', text: '🔒 Locked' }
  }

  return (
    <div className="card">
      <h2>📊 Team Progress</h2>
      <div className="progress-indicator">
        {[1, 2, 3].map(num => {
          const { status, text } = getProgressStatus(num)
          return (
            <div key={num} className={`progress-step ${status}`}>
              <h3>Dialogue {num}</h3>
              <p>{text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Completion Message Component
const CompletionMessage = ({ teamStatus }) => {
  return (
    <div className="completion-message">
      <div className="completion-content">
        <div className="completion-emoji">🎉</div>
        <h2>Congratulations! All dialogues completed!</h2>
        <div className="completion-status">
          {teamStatus?.qualified ? (
            <span className="qualified-badge">✅ Your team is QUALIFIED for the final round!</span>
          ) : (
            <span>You completed the hunt! Check the leaderboard for results.</span>
          )}
        </div>
        <div className={`completion-score ${teamStatus?.current_score < 0 ? 'negative' : 'positive'}`}>
          Final Score: {teamStatus?.current_score}
        </div>
      </div>
    </div>
  )
}

const AttendeeDashboard = () => {
  const { team } = useAuth()
  const { startTimer, elapsedTime } = useTimer()
  const { focusWarning, total_tab_left, switches_remaining, is_penalized, setFocusWarning } = useTabFocusTracking(team)
  const [teamStatus, setTeamStatus] = useState(null)
  const [currentDialogue, setCurrentDialogue] = useState(1)
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState(false)
  const [ackMessage, setAckMessage] = useState('')

  // Data fetching functions
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

  // Event handlers
  const handleDialogueComplete = () => {
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
      {/* Status and Notifications */}
      <StatusBanner teamStatus={teamStatus} />
      
      <TabSwitchWarning
        focusWarning={focusWarning}
        isPenalized={is_penalized}
        switchesRemaining={switches_remaining}
        onDismiss={() => setFocusWarning(false)}
      />
      
      <DisqualificationNotice
        teamStatus={teamStatus}
        onAcknowledge={handleAcknowledgeDisqualification}
        acknowledging={acknowledging}
        ackMessage={ackMessage}
      />
      
      {/* Timer */}
      <TeamTimer />

      {/* Progress Tracker */}
      <TeamProgress teamStatus={teamStatus} currentDialogue={currentDialogue} />

      {/* Active Dialogue Section */}
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

      {/* Completion Message */}
      {currentDialogue === 0 && <CompletionMessage teamStatus={teamStatus} />}
    </div>
  )
}

export default AttendeeDashboard