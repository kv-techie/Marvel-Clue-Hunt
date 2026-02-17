import React from 'react'

const DisqualificationScreen = ({ team, reason }) => {
  return (
    <div className="disqualification-screen-container">
      <div className="disqualification-screen">
        <div className="disqualification-icon">⛔</div>
        
        <h1 className="disqualification-title">Team Disqualified</h1>
        
        <div className="disqualification-team-name">
          <p className="disqualification-label">Team:</p>
          <p className="disqualification-value">{team}</p>
        </div>
        
        <div className="disqualification-reason-section">
          <p className="disqualification-label">Reason for Disqualification:</p>
          <div className="disqualification-reason-box">
            {reason || 'No reason provided'}
          </div>
        </div>
        
        <div className="disqualification-message">
          <p>Your team has been removed from the Marvel Clue Hunt game.</p>
          <p>Please contact the game administrators if you believe this is an error.</p>
        </div>
      </div>
    </div>
  )
}

export default DisqualificationScreen
