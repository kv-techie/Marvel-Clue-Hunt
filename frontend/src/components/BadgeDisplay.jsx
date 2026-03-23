import React from 'react'
import '../styles/BadgeDisplay.css'

const BadgeDisplay = ({ badges = [] }) => {
  if (!badges || badges.length === 0) {
    return null
  }

  return (
    <div className="badge-display">
      <div className="badges-container">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="badge-card"
            title={badge.details?.name}
          >
            <div className="badge-icon">{badge.details?.icon}</div>
            <div className="badge-info">
              <div className="badge-name">{badge.details?.name}</div>
              <div className="badge-description">{badge.details?.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BadgeDisplay
