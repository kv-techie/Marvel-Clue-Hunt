import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PrivacyShield from './PrivacyShield'

const ProtectedRoute = ({ children, requireAdmin, requireVolunteer, requireAttendee }) => {
  const { user, isAdmin, isVolunteer, isGuest, loading } = useAuth()

  // Wait for auth state to load from localStorage
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#fff',
        backgroundColor: '#1a1a2e'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            ⏳
          </div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" />
  }

  if (requireAdmin && !isAdmin) {
    if (isVolunteer) {
      return <Navigate to="/volunteer" />
    }
    return <Navigate to="/attendee" />
  }

  if (requireVolunteer && !isVolunteer) {
    if (isAdmin) {
      return <Navigate to="/admin" />
    }
    return <Navigate to="/attendee" />
  }

  if (requireAttendee && (isAdmin || isVolunteer)) {
    if (isAdmin) {
      return <Navigate to="/admin" />
    }
    return <Navigate to="/volunteer" />
  }

  // If the user is a guest, wrap the dashboard/game with the privacy shield
  if (isGuest) {
    return <PrivacyShield guestName={user}>{children}</PrivacyShield>
  }

  return children
}

export default ProtectedRoute
