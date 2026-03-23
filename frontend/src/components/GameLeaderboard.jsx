import React, { useState, useEffect } from 'react'
import { getLeaderboardData, getTeamRank, getLeaderboardStats } from '../api/client'
import '../styles/GameLeaderboard.css'

const GameLeaderboard = ({ teamName, autoRefresh = true, refreshInterval = 3000 }) => {
  const [leaderboard, setLeaderboard] = useState([])
  const [teamRank, setTeamRank] = useState(null)
  const [stats, setStats] = useState(null)
  const [sortBy, setSortBy] = useState('total_points_earned')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true)
        const [leaderData, rankData, statsData] = await Promise.all([
          getLeaderboardData(sortBy),
          getTeamRank(teamName, sortBy),
          getLeaderboardStats()
        ])

        setLeaderboard(leaderData.leaderboard || [])
        setTeamRank(rankData)
        setStats(statsData)
      } catch (err) {
        console.warn('Leaderboard fetch warning:', err.message)
        // Don't throw - leaderboard is optional for gameplay
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboardData()

    if (autoRefresh) {
      const interval = setInterval(fetchLeaderboardData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [teamName, sortBy, autoRefresh, refreshInterval])

  if (loading) {
    return <div className="leaderboard-loading">Loading leaderboard...</div>
  }

  const topTeams = leaderboard.slice(0, 5)
  const userTeamInTop = topTeams.some(t => t.team_name === teamName)

  return (
    <div className="game-leaderboard">
      <div className="leaderboard-header">
        <h2>🏆 Rankings</h2>
        <div className="sort-buttons">
          <button
            className={`sort-btn ${sortBy === 'total_points_earned' ? 'active' : ''}`}
            onClick={() => setSortBy('total_points_earned')}
          >
            🎯 Points
          </button>
          <button
            className={`sort-btn ${sortBy === 'accuracy_percentage' ? 'active' : ''}`}
            onClick={() => setSortBy('accuracy_percentage')}
          >
            🎯 Accuracy
          </button>
          <button
            className={`sort-btn ${sortBy === 'best_streak' ? 'active' : ''}`}
            onClick={() => setSortBy('best_streak')}
          >
            🔥 Streak
          </button>
        </div>
      </div>

      {/* Top 5 Rankings */}
      <div className="top-rankings">
        <h3 className="rankings-title">Top Performers</h3>
        <div className="rankings-list">
          {topTeams.map((team, idx) => (
            <div
              key={team.team_name}
              className={`ranking-item ${team.team_name === teamName ? 'user-team' : ''}`}
            >
              <div className="rank-badge">
                {idx === 0 && '🥇'}
                {idx === 1 && '🥈'}
                {idx === 2 && '🥉'}
                {idx > 2 && `#${idx + 1}`}
              </div>
              <div className="rank-info">
                <div className="rank-name">{team.team_name}</div>
                <div className="rank-stone">{team.stone}</div>
              </div>
              <div className="rank-stats">
                {sortBy === 'total_points_earned' && (
                  <span className="stat-value">{team.total_points} pts</span>
                )}
                {sortBy === 'accuracy_percentage' && (
                  <span className="stat-value">{team.accuracy}%</span>
                )}
                {sortBy === 'best_streak' && (
                  <span className="stat-value">{team.best_streak} 🔥</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User's Team Rank */}
      {teamRank && (
        <div className="user-rank-section">
          <h3 className="rankings-title">Your Position</h3>
          <div className="user-rank-card">
            <div className="rank-position">
              Rank #{teamRank.current_rank} of {teamRank.total_teams}
            </div>
            <div className="rank-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">Points</span>
                <span className="breakdown-value">{teamRank.team_data.total_points}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Accuracy</span>
                <span className="breakdown-value">{teamRank.team_data.accuracy}%</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Best Streak</span>
                <span className="breakdown-value">{teamRank.team_data.best_streak}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Badges</span>
                <span className="breakdown-value">{teamRank.team_data.badges_count}</span>
              </div>
            </div>

            {!userTeamInTop && teamRank.nearby_teams && (
              <div className="nearby-teams">
                <div className="nearby-label">Around You</div>
                {teamRank.nearby_teams.map((team, idx) => (
                  <div
                    key={team.team_name}
                    className={`nearby-item ${team.team_name === teamName ? 'current' : ''}`}
                  >
                    <span className="nearby-rank">#{team.rank}</span>
                    <span className="nearby-name">{team.team_name}</span>
                    <span className="nearby-points">{team.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overall Stats */}
      {stats && (
        <div className="overall-stats">
          <h3 className="rankings-title">Event Statistics</h3>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">Highest Score</div>
              <div className="stat-number">{stats.highest_score}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Avg Score</div>
              <div className="stat-number">{stats.avg_score}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Highest Accuracy</div>
              <div className="stat-number">{stats.highest_accuracy}%</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Avg Accuracy</div>
              <div className="stat-number">{stats.avg_accuracy}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameLeaderboard
