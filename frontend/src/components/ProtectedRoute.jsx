import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, requireAdmin, requireVolunteer, requireAttendee }) => {
  const { user, isAdmin, isVolunteer } = useAuth()

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

  return children
}

export default ProtectedRoute