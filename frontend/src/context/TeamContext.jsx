import React, { createContext, useContext, useState } from 'react'

const TeamContext = createContext(null)

export const TeamProvider = ({ children }) => {
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(false)

  const updateTeamData = (data) => {
    setTeamData(data)
  }

  const setTeamLoading = (isLoading) => {
    setLoading(isLoading)
  }

  return (
    <TeamContext.Provider value={{ teamData, updateTeamData, loading, setTeamLoading }}>
      {children}
    </TeamContext.Provider>
  )
}

export const useTeam = () => {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider')
  }
  return context
}