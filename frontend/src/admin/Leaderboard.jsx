import React, { useState, useEffect } from 'react'
import { getLeaderboard, awardEnactmentBonus } from '../api/client'

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const response = await getLeaderboard()
      setLeaderboard(response.data.leaderboard)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const handleAwardBonus = async (teamName) => {
    try {
      await awardEnactmentBonus(teamName)
      alert(`Enactment bonus awarded to ${teamName}!`)
      fetchLeaderboard()
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || 'Failed to award bonus'}`)
    }
  }

  if (loading) {
    return <div>Loading leaderboard...</div>
  }

  return (
    <div>
      <h2>🏆 Leaderboard</h2>
      
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Score</th>
            <th>Dialogues</th>
            <th>Hints Used</th>
            <th>Qualified</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((team, index) => (
            <tr key={team.team_name}>
              <td style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </td>
              <td>
                <strong>{team.team_name}</strong>
                <br />
                <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {team.members.join(', ')}
                </small>
              </td>
              <td style={{ fontSize: '20px', fontWeight: 'bold', color: '#2ecc71' }}>
                {team.score}
              </td>
              <td>{team.dialogues_completed}/3</td>
              <td>{team.hints_used}/3</td>
              <td>
                {team.qualified ? (
                  <span style={{ color: '#2ecc71' }}>✅ Yes</span>
                ) : (
                  <span style={{ color: '#e74c3c' }}>❌ No</span>
                )}
              </td>
              <td>
                <button 
                  onClick={() => handleAwardBonus(team.team_name)}
                  className="btn btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '14px' }}
                >
                  Award Bonus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Leaderboard