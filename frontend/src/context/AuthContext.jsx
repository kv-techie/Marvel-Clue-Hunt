import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVolunteer, setIsVolunteer] = useState(false)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true) // Add loading state

  useEffect(() => {
    // Load from localStorage on mount
    const savedUser = localStorage.getItem('user')
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true'
    const savedIsVolunteer = localStorage.getItem('isVolunteer') === 'true'
    const savedTeam = localStorage.getItem('team')

    if (savedUser) {
      setUser(savedUser)
      setIsAdmin(savedIsAdmin)
      setIsVolunteer(savedIsVolunteer)
      setTeam(savedTeam)
    }
    
    setLoading(false) // Done loading
  }, [])

  const loginUser = (name, isAdminFlag, teamName, isVolunteerFlag = false) => {
    setUser(name)
    setIsAdmin(isAdminFlag)
    setIsVolunteer(isVolunteerFlag)
    setTeam(teamName)

    localStorage.setItem('user', name)
    localStorage.setItem('isAdmin', isAdminFlag)
    localStorage.setItem('isVolunteer', isVolunteerFlag)
    if (teamName) {
      localStorage.setItem('team', teamName)
    }
  }

  const logout = () => {
    setUser(null)
    setIsAdmin(false)
    setIsVolunteer(false)
    setTeam(null)
    localStorage.clear()
  }

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, isVolunteer, team, loading, loginUser, logout }}
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
