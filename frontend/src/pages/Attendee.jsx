import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getTeamStatus } from '../api/client'
import AttendeeDashboard from '../attendee/AttendeeDashboard'
import DisqualificationScreen from '../attendee/DisqualifiationScreen'
import '../styles/Attendee.css'

const Attendee = () => {
  const { user, team, logout } = useAuth()
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [disqualificationReason, setDisqualificationReason] = useState('')
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if team is disqualified on mount
  useEffect(() => {
    const checkDisqualificationStatus = async () => {
      try {
        const response = await getTeamStatus(team)
        if (response.data.disqualified) {
          setIsDisqualified(true)
          setDisqualificationReason(response.data.disqualification_reason || 'Unknown reason')
        }
      } catch (err) {
        console.error('Failed to check disqualification status:', err)
      } finally {
        setCheckingStatus(false)
      }
    }

    if (team) {
      checkDisqualificationStatus()
    }
  }, [team])

  if (checkingStatus) {
    return (
      <div className="attendee-container">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading team status...</p>
        </div>
      </div>
    )
  }

  if (isDisqualified) {
    return (
      <div className="attendee-container">
        <header className="attendee-header">
          <div>
            <h1>🦸 {team}</h1>
          </div>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </header>
        <DisqualificationScreen team={team} reason={disqualificationReason} />
      </div>
    )
  }

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