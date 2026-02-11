import React, { useState } from 'react'
import { setStartTime, startGame, stopGame } from '../api/client'

const GlobalTimerControl = () => {
  const [scheduledTime, setScheduledTime] = useState('')
  const [message, setMessage] = useState('')

  const handleScheduleStart = async () => {
    if (!scheduledTime) {
      setMessage('Please select a start time')
      return
    }

    try {
      const response = await setStartTime(scheduledTime)
      setMessage(`Game scheduled to start at ${new Date(scheduledTime).toLocaleString()}`)
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to schedule'}`)
    }
  }

  const handleStartNow = async () => {
    try {
      const response = await startGame()
      setMessage('Game started immediately!')
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to start game'}`)
    }
  }

  const handleStopGame = async () => {
    try {
      const response = await stopGame()
      setMessage('Game stopped successfully!')
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Failed to stop game'}`)
    }
  }

  return (
    <div>
      <h2>⏱️ Global Timer Control</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3>Schedule Start Time</h3>
          <input 
            type="datetime-local" 
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            style={{ marginBottom: '10px' }}
          />
          <button onClick={handleScheduleStart} className="btn btn-secondary">
            Schedule Start
          </button>
        </div>
        
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3>Start Immediately</h3>
          <button onClick={handleStartNow} className="btn btn-primary" style={{ marginTop: '10px' }}>
            Start Game Now
          </button>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3>Stop Game</h3>
          <button 
            onClick={handleStopGame} 
            className="btn" 
            style={{ 
              marginTop: '10px',
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
              color: 'white'
            }}
          >
            🛑 Stop Game
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
