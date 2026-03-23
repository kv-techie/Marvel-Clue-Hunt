import React from 'react'
import '../styles/StreakCounter.css'

const StreakCounter = ({ currentStreak = 0, bestStreak = 0 }) => {
  const getStreakMessage = () => {
    if (currentStreak === 0) return 'No streak'
    if (currentStreak === 1) return '🔥 On fire!'
    if (currentStreak === 2) return '🔥 On fire!'
    if (currentStreak === 3) return '🔥 Hot streak!'
    if (currentStreak === 5) return '⚡ On a roll!'
    if (currentStreak >= 7) return '💥 Unstoppable!'
    return '🔥 Keep it up!'
  }

  const getStreakWidth = () => {
    return Math.min((currentStreak / 10) * 100, 100)
  }

  return (
    <div className="streak-counter">
      <div className="streak-section">
        <div className="streak-header">
          <span className="streak-label">Current Streak</span>
          <span className="streak-value">{currentStreak}</span>
        </div>
        <div className="streak-bar">
          <div
            className="streak-fill"
            style={{
              width: `${getStreakWidth()}%`,
              backgroundColor: currentStreak > 5 ? '#ff4444' : '#ffaa00'
            }}
          />
        </div>
        <div className="streak-message">{getStreakMessage()}</div>
      </div>

      <div className="streak-section">
        <div className="streak-header">
          <span className="streak-label">Best Streak</span>
          <span className="streak-value">{bestStreak}</span>
        </div>
        <div className="streak-stat">
          {bestStreak > 0 && (
            <span className="streak-stat-text">
              🏆 {bestStreak} in a row
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default StreakCounter
