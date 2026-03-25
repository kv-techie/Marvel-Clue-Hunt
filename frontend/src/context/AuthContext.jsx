import React, { createContext, useContext, useState, useEffect } from 'react'
import { logout as logoutAPI } from '../api/client'

const AuthContext = createContext(null)

const getStoredValue = (key) =>
  sessionStorage.getItem(key) ?? localStorage.getItem(key)

const setStoredValue = (key, value) => {
  sessionStorage.setItem(key, value)
  localStorage.setItem(key, value)
}

const removeStoredValue = (key) => {
  sessionStorage.removeItem(key)
  localStorage.removeItem(key)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVolunteer, setIsVolunteer] = useState(false)
  const [team, setTeam] = useState(null)
  const [deviceId, setDeviceId] = useState(null)
  const [loading, setLoading] = useState(true) // Add loading state

  useEffect(() => {
    const savedUser = getStoredValue('user')
    const savedIsAdmin = getStoredValue('isAdmin') === 'true'
    const savedIsVolunteer = getStoredValue('isVolunteer') === 'true'
    const savedTeam = getStoredValue('team')
    const savedDeviceId = getStoredValue('deviceId')

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

    setStoredValue('user', name)
    setStoredValue('isAdmin', String(isAdminFlag))
    setStoredValue('isVolunteer', String(isVolunteerFlag))
    if (teamName) {
      setStoredValue('team', teamName)
    }
    if (deviceId) {
      setStoredValue('deviceId', deviceId)
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
    removeStoredValue('user')
    removeStoredValue('isAdmin')
    removeStoredValue('isVolunteer')
    removeStoredValue('team')
    removeStoredValue('deviceId')
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
