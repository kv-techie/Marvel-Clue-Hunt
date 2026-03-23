import React, { createContext, useContext, useState, useEffect } from 'react'
import { logout as logoutAPI } from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVolunteer, setIsVolunteer] = useState(false)
  const [team, setTeam] = useState(null)
  const [deviceId, setDeviceId] = useState(null)
  const [loading, setLoading] = useState(true) // Add loading state

  useEffect(() => {
    // Load from sessionStorage on mount (per-tab sessions)
    const savedUser = sessionStorage.getItem('user')
    const savedIsAdmin = sessionStorage.getItem('isAdmin') === 'true'
    const savedIsVolunteer = sessionStorage.getItem('isVolunteer') === 'true'
    const savedTeam = sessionStorage.getItem('team')
    const savedDeviceId = sessionStorage.getItem('deviceId')

    if (savedUser) {
      setUser(savedUser)
      setIsAdmin(savedIsAdmin)
      setIsVolunteer(savedIsVolunteer)
      setTeam(savedTeam)
      setDeviceId(savedDeviceId)
    }
    
    setLoading(false) // Done loading
  }, [])

  const loginUser = (name, isAdminFlag, teamName, isVolunteerFlag = false, deviceId = null) => {
    setUser(name)
    setIsAdmin(isAdminFlag)
    setIsVolunteer(isVolunteerFlag)
    setTeam(teamName)
    setDeviceId(deviceId)

    sessionStorage.setItem('user', name)
    sessionStorage.setItem('isAdmin', isAdminFlag)
    sessionStorage.setItem('isVolunteer', isVolunteerFlag)
    if (teamName) {
      sessionStorage.setItem('team', teamName)
    }
    if (deviceId) {
      sessionStorage.setItem('deviceId', deviceId)
    }
  }

  const logout = async () => {
    // Call backend logout to deactivate device for attendees
    if (team && deviceId && !isAdmin && !isVolunteer) {
      try {
        await logoutAPI({ team_name: team, device_id: deviceId })
        console.log('Device logged out from backend')
      } catch (err) {
        console.error('Error logging out device:', err)
        // Continue with frontend logout even if backend call fails
      }
    }

    setUser(null)
    setIsAdmin(false)
    setIsVolunteer(false)
    setTeam(null)
    setDeviceId(null)
    sessionStorage.clear()
  }

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, isVolunteer, team, deviceId, loading, loginUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
