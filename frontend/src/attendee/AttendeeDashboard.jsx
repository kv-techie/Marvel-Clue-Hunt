import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTimer } from '../context/TimerContext'
import { getTeamStatus, startTeamTimer, getCurrentDialogue } from '../api/client'
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
    
    // Refresh status every 5 seconds
    const interval = setInterval(() => {
      fetchTeamStatus()
      fetchCurrentDialogue()
    }, 5000)

    return () => clearInterval(interval)
  }, [team])

  const handleDialogueComplete = () => {
    fetchTeamStatus()
    fetchCurrentDialogue()
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
          <strong>Final Score: {teamStatus?.current_score}</strong>
        </div>
      )}
    </div>
  )
}

export default AttendeeDashboard