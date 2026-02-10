import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, requireAdmin, requireAttendee }) => {
  const { user, isAdmin } = useAuth()

  if (!user) {
    return <Navigate to="/" />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/attendee" />
  }

  if (requireAttendee && isAdmin) {
    return <Navigate to="/admin" />
  }

  return children
}

export default ProtectedRoute