import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTimer } from '../context/TimerContext'
import { getTeamStatus, getTeamStone, startTeamTimer, teamAcknowledgeDisqualification, getTeamBadges, getTeamPowerups } from '../api/client'
import { useTabFocusTracking } from '../hooks/useTabFocusTracking'
import { useGameSocket } from '../hooks/useGameSocket'
import TeamTimer from './TeamTimer'
import QuestionRound from './QuestionRound'
import DisqualificationScreen from './DisqualifiationScreen'
import StatusBanner from '../components/StatusBanner'
import BadgeDisplay from '../components/BadgeDisplay'
import StreakCounter from '../components/StreakCounter'
import GameLeaderboard from '../components/GameLeaderboard'

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
const TeamProgress = ({ teamStatus, currentQuestionIndex }) => {
  if (!teamStatus) return null

  const questionResultMap = new Map(
    (teamStatus.question_results || [])
      .filter((item) => Number.isInteger(item.question_index))
      .map((item) => [item.question_index + 1, item.correct])
  )

  const getProgressStatus = (questionNum) => {
    if (questionResultMap.has(questionNum)) {
      const isCorrect = questionResultMap.get(questionNum)
      if (isCorrect) return { status: 'completed', text: '✅ Complete' }
      return { status: 'incorrect', text: '❌ Wrong' }
    }
    if (questionNum === currentQuestionIndex + 1) return { status: 'active', text: '⏳ Active' }
    return { status: 'locked', text: '🔒 Locked' }
  }

  return (
    <div className="card">
      <h2>📊 Question Progress ({currentQuestionIndex}/10)</h2>
      <div className="progress-indicator">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
          const { status, text } = getProgressStatus(num)
          return (
            <div key={num} className={`progress-step ${status}`}>
              <h3>Q{num}</h3>
              <p>{text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Completion Message Component
const CompletionMessage = ({ teamStatus, stone }) => {
  return (
    <div className="completion-message">
      <div className="completion-content">
        <div className="completion-emoji">🎉</div>
        <h2>Congratulations! All 10 questions completed!</h2>
        <div className="stone-name">
          <span className="stone-badge">{stone}</span>
        </div>
        <div className="completion-status">
          <span className="qualified-badge">✅ Your team has finished the Infinity Stone Challenge!</span>
        </div>
        <div className={`completion-score ${teamStatus?.current_score < 0 ? 'negative' : 'positive'}`}>
          Final Score: {teamStatus?.current_score} points
        </div>
      </div>
    </div>
  )
}

const KnowYourPowerups = ({ powerups = [], teamName, stone }) => {
  return (
    <details className="card powerup-guide-card powerup-guide-dropdown">
      <summary className="powerup-guide-summary">⚡ Know Your PowerUps</summary>

      <p className="powerup-guide-intro">
        These are your <strong>{teamName}</strong> powerups{stone ? ` for ${stone}` : ''}. Each team gets a unique set based on its Infinity Stone.
      </p>
      <p className="powerup-guide-intro">
        Use them from the question screen when they become available.
      </p>

      {powerups.length === 0 ? (
        <p className="powerup-guide-empty">No powerups assigned yet. Keep solving questions to unlock them.</p>
      ) : (
        <div className="powerup-guide-list">
          {powerups.map((item) => {
            const statusText = item.used ? 'Used' : item.available ? 'Available now' : 'Locked'
            const statusClass = item.used ? 'used' : item.available ? 'available' : 'locked'

            return (
              <div key={item.id} className={`powerup-guide-item ${statusClass}`}>
                <div className="powerup-guide-header">
                  <h3>{item.name}</h3>
                  <span className={`powerup-status ${statusClass}`}>{statusText}</span>
                </div>
                <p className="powerup-guide-description">{item.description || 'No description available.'}</p>
                {item.effect && (
                  <p className="powerup-guide-effect"><strong>Effect:</strong> {item.effect}</p>
                )}
                <p className="powerup-guide-usage">
                  <strong>How to use:</strong> Open the active question card, then tap this powerup in the PowerUps bar before submitting your answer.
                </p>
              </div>
            )
          })}
        </div>
      )}
    </details>
  )
}

const AttendeeDashboard = () => {
  const { team } = useAuth()
  const { startTimer, stopTimer, elapsedTime } = useTimer()
  const { focusWarning, total_tab_left, switches_remaining, is_penalized, setFocusWarning } = useTabFocusTracking(team)
  const [teamStatus, setTeamStatus] = useState(null)
  const [stone, setStone] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const [badges, setBadges] = useState([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [teamPowerups, setTeamPowerups] = useState([])

  // Data fetching functions
  const fetchTeamStatus = async () => {
    try {
      const response = await getTeamStatus(team)
      setTeamStatus(response)
      setDashboardError('')
    } catch (err) {
      console.error('Failed to fetch team status:', err)
      setDashboardError(err.response?.data?.detail || 'Failed to fetch team status')
    }
  }

  const fetchTeamStone = async () => {
    try {
      const response = await getTeamStone(team)
      console.log("[AttendeeDashboard] Team stone data (unwrapped):", response);
      setStone(response.stone)
      setCurrentQuestionIndex(response.current_question_index)
      console.log("[AttendeeDashboard] Set currentQuestionIndex to:", response.current_question_index);
      setCurrentStreak(response.current_streak || 0)
      setBestStreak(response.best_streak || 0)
      setDashboardError('')
    } catch (err) {
      console.error('Failed to fetch team stone:', err)
      setDashboardError(err.response?.data?.detail || 'Failed to fetch team details')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamBadges = async () => {
    try {
      const response = await getTeamBadges(team)
      setBadges(response.badges_earned || [])
      setCurrentStreak(response.current_streak || 0)
      setBestStreak(response.best_streak || 0)
    } catch (err) {
      console.error('Failed to fetch team badges:', err)
    }
  }

  const fetchTeamPowerups = async () => {
    try {
      const response = await getTeamPowerups(team)
      setTeamPowerups(response.powerups || [])
    } catch (err) {
      console.error('Failed to fetch team powerups:', err)
    }
  }

  // WebSocket event integration replacing active polling
  useGameSocket((event, data) => {
    console.log("[WS] Received event:", event, data);
    switch (event) {
      case 'score_update':
      case 'powerup_used':
      case 'state_update':
      case 'leaderboard_update':
      case 'round_start':
        fetchTeamStatus();
        fetchTeamStone();
        fetchTeamBadges();
        fetchTeamPowerups();
        break;
      case 'disqualify':
        fetchTeamStatus();
        break;
      default:
        break;
    }
  });

  useEffect(() => {
    const initializeTeam = async () => {
      try {
        const timerResponse = await startTeamTimer(team)
        // Start the frontend timer with elapsed time from backend
        const elapsedTime = timerResponse.elapsed_time || 0
        startTimer(elapsedTime)
        
        await fetchTeamStatus()
        await fetchTeamStone()
        await fetchTeamBadges()
        await fetchTeamPowerups()
      } catch (err) {
        console.error('Failed to initialize:', err)
        setDashboardError(err.response?.data?.detail || 'Failed to initialize team session')
        setLoading(false)
      }
    }

    initializeTeam()
  }, [team])

  // Stop the timer immediately when disqualification is detected
  useEffect(() => {
    if (teamStatus?.disqualified) {
      stopTimer()
    }
  }, [teamStatus?.disqualified])

  // Event handlers
  const handleQuestionComplete = (response) => {
    setTimeout(() => {
      fetchTeamStatus()
      fetchTeamStone()
      fetchTeamBadges()
      fetchTeamPowerups()
    }, 500)
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

  if (dashboardError) {
    return (
      <div className="dashboard-grid">
        <div className="card">
          <h2>⚠️ Access Notice</h2>
          <p>{dashboardError}</p>
        </div>
      </div>
    )
  }

  // If disqualified, show ONLY the disqualification screen — nothing else
  if (teamStatus?.disqualified) {
    return (
      <div className="dashboard-grid">
        <DisqualificationScreen
          team={team}
          reason={teamStatus.disqualification_reason}
        />
      </div>
    )
  }

  return (
    <div className="dashboard-grid">
      {/* Status and Notifications */}
      <StatusBanner teamStatus={teamStatus} currentQuestionIndex={currentQuestionIndex} />
      
      <TabSwitchWarning
        focusWarning={focusWarning}
        isPenalized={is_penalized}
        switchesRemaining={switches_remaining}
        onDismiss={() => setFocusWarning(false)}
      />
      
      {/* Timer */}
      <TeamTimer />

      {/* Progress Tracker */}
      <TeamProgress teamStatus={teamStatus} currentQuestionIndex={currentQuestionIndex} />

      {/* Gamification - Streak Counter */}
      {currentQuestionIndex > 0 && (
        <StreakCounter currentStreak={currentStreak} bestStreak={bestStreak} />
      )}

      {/* Gamification - Badges */}
      {badges.length > 0 && <BadgeDisplay badges={badges} />}

      {/* PowerUp Guide */}
      <KnowYourPowerups powerups={teamPowerups} teamName={team} stone={stone} />

      {/* Leaderboard Toggle Button */}
      <div className="leaderboard-toggle">
        <button 
          className={`toggle-btn ${showLeaderboard ? 'active' : ''}`}
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          {showLeaderboard ? '🏆 Hide Leaderboard' : '🏆 Show Leaderboard'}
        </button>
      </div>

      {/* Leaderboard Section */}
      {showLeaderboard && <GameLeaderboard teamName={team} autoRefresh={true} />}

      {/* Active Question Section */}
      {currentQuestionIndex < 10 && (
        <QuestionRound
          teamName={team}
          stone={stone}
          onQuestionComplete={handleQuestionComplete}
        />
      )}

      {/* Completion Message */}
      {currentQuestionIndex === 10 && <CompletionMessage teamStatus={teamStatus} stone={stone} />}
    </div>
  )
}

export default AttendeeDashboard