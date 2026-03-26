import React from 'react'
import { useTimer } from '../context/TimerContext'

const TeamTimer = () => {
  const { formatTime, elapsedTime } = useTimer()

  return (
    <div className="card timer-card" style={{ textAlign: 'center' }}>
      <h2>⏱️ Team Timer</h2>
      <div className="timer">{formatTime(elapsedTime)}</div>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '10px' }}>
        Time elapsed since team started
      </p>
    </div>
  )
}

export default TeamTimer