import React from 'react'

const StatusBanner = ({ teamStatus }) => {
  if (!teamStatus) return null

  return (
    <div className="status-banner">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', textAlign: 'center' }}>
        <div>
          <h3>Current Score</h3>
          <p style={{ fontSize: '32px', color: '#2ecc71', fontWeight: 'bold' }}>
            {teamStatus.current_score}
          </p>
        </div>
        
        <div>
          <h3>Dialogues</h3>
          <p style={{ fontSize: '32px', color: '#3498db', fontWeight: 'bold' }}>
            {[teamStatus.dialogue_1_completed, teamStatus.dialogue_2_completed, teamStatus.dialogue_3_completed].filter(Boolean).length}/3
          </p>
        </div>
        
        <div>
          <h3>Hints Used</h3>
          <p style={{ fontSize: '32px', color: '#f39c12', fontWeight: 'bold' }}>
            {teamStatus.hints_used}/3
          </p>
        </div>
        
        <div>
          <h3>Status</h3>
          <p style={{ fontSize: '24px', color: teamStatus.qualified ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
            {teamStatus.qualified ? '✅ Qualified' : '⏳ In Progress'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default StatusBanner