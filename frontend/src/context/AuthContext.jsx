import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [team, setTeam] = useState(null)

  useEffect(() => {
    // Load from localStorage on mount
    const savedUser = localStorage.getItem('user')
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true'
    const savedTeam = localStorage.getItem('team')

    if (savedUser) {
      setUser(savedUser)
      setIsAdmin(savedIsAdmin)
      setTeam(savedTeam)
    }
  }, [])

  const loginUser = (name, isAdminFlag, teamName) => {
    setUser(name)
    setIsAdmin(isAdminFlag)
    setTeam(teamName)

    localStorage.setItem('user', name)
    localStorage.setItem('isAdmin', isAdminFlag)
    if (teamName) {
      localStorage.setItem('team', teamName)
    }
  }

  const logout = () => {
    setUser(null)
    setIsAdmin(false)
    setTeam(null)
    localStorage.clear()
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, team, loginUser, logout }}>
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