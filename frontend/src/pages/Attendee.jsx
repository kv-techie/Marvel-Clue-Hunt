import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import AttendeeDashboard from '../attendee/AttendeeDashboard'
import '../styles/Attendee.css'

const Attendee = () => {
  const { user, team, logout } = useAuth()

  return (
    <div className="attendee-container">
      <header className="attendee-header">
        <div>
          <h1>🦸 {team}</h1>
          <p>Welcome, {user}!</p>
        </div>
        <button onClick={logout} className="btn btn-secondary">Logout</button>
      </header>

      <AttendeeDashboard />
    </div>
  )
}

export default Attendee