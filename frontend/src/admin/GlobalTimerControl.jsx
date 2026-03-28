import React, { useState } from 'react'
import { setStartTime, startGame, stopGame, deleteParticipantData } from '../api/client'
import { useAuth } from '../context/AuthContext'

const GlobalTimerControl = () => {
  const { user, isGuest } = useAuth()
  const [scheduledTime, setScheduledTime] = useState('')
  const [message, setMessage] = useState('')

  const handleScheduleStart = async () => {
    if (!scheduledTime) {
      setMessage('Please select a start time')
      return
    }

    try {
      const response = await setStartTime(scheduledTime, user)
      setMessage(`✅ Game scheduled to start at ${new Date(scheduledTime).toLocaleString()}`)
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to schedule'}`)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleStartNow = async () => {
    try {
      const response = await startGame(user)
      setMessage('🎮 Game started immediately!')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to start game'}`)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleStopGame = async () => {
    try {
      const response = await stopGame(user)
      setMessage('✅ Game stopped successfully!')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to stop game'}`)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleDeleteData = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete all participant data? This cannot be undone!')) {
      return
    }

    try {
      const response = await deleteParticipantData(user)
      setMessage('✅ All participant data has been deleted successfully! Teams and game state reset.')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to delete data'}`)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div>
      <h2>⏱️ Global Timer Control</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3>Schedule Start Time</h3>
          <label htmlFor="scheduled-start-time" className="sr-only">Scheduled start time</label>
          <input 
            id="scheduled-start-time"
            type="datetime-local" 
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            style={{ marginBottom: '10px' }}
          />
          <button onClick={handleScheduleStart} className="btn btn-secondary" disabled={isGuest}>
            Schedule Start
          </button>
        </div>
        
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3>Start Immediately</h3>
          <button 
            onClick={handleStartNow} 
            className={`btn btn-primary ${isGuest ? 'guest-locked' : ''}`} 
            style={{ marginTop: '10px' }} 
            disabled={isGuest}
          >
            {isGuest ? '🔒 Locked' : 'Start Game Now'}
          </button>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3>Stop Game</h3>
          <button 
            onClick={handleStopGame} 
            className={`btn ${isGuest ? 'guest-locked' : ''}`}
            disabled={isGuest}
            style={{ 
              marginTop: '10px',
              background: isGuest ? '' : 'linear-gradient(135deg, #e74c3c, #c0392b)',
              color: isGuest ? '' : 'white',
              width: '100%'
            }}
          >
            🛑 Stop Game
          </button>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3>Delete Data</h3>
          <button 
            onClick={handleDeleteData} 
            className={`btn ${isGuest ? 'guest-locked' : ''}`}
            disabled={isGuest}
            style={{ 
              marginTop: '10px',
              background: isGuest ? '' : 'linear-gradient(135deg, #8e44ad, #6c3483)',
              color: isGuest ? '' : 'white',
              width: '100%'
            }}
          >
            {isGuest ? '🔒 Locked (View Only)' : '🗑️ Delete All Participant Data'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ 
          padding: '15px', 
          borderRadius: '5px',
          background: message.startsWith('Error') ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
          marginTop: '10px'
        }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default GlobalTimerControl
