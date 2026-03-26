import React from 'react'

const StatusBanner = ({ teamStatus, currentQuestionIndex = 0, totalQuestions = 15 }) => {
  if (!teamStatus) return null

  return (
    <div className="status-banner">
      <div className="status-grid">
        <div className="status-item">
          <h3>Current Score</h3>
          <p className={`status-score ${teamStatus.current_score < 0 ? 'negative' : 'positive'}`}>
            {teamStatus.current_score}
          </p>
        </div>
        
        <div className="status-item">
          <h3>Question Progress</h3>
          <p className="status-progress">
            {currentQuestionIndex}/{totalQuestions}
          </p>
        </div>
        
        <div className="status-item">
          <h3>Hints Used</h3>
          <p className="status-hints">
            {teamStatus.hints_used_count || 0}/3
          </p>
        </div>
        
        <div className="status-item">
          <h3>Status</h3>
          <p className={`status-qualification ${teamStatus.qualified ? 'qualified' : 'in-progress'}`}>
            {teamStatus.qualified ? '✅ Qualified' : '⏳ In Progress'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default StatusBanner