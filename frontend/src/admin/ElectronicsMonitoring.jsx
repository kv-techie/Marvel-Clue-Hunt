import React, { useState, useEffect } from 'react'
import { getAllTeams, getTeamTabSwitches } from '../api/client'

const ElectronicsMonitoring = () => {
  const [teams, setTeams] = useState([])
  const [tabSwitchData, setTabSwitchData] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [sortBy, setSortBy] = useState('switches') // 'switches' or 'name'

  useEffect(() => {
    const fetchData = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true)
        }
        
        // Fetch all teams
        const teamsResponse = await getAllTeams()
        const teamsList = teamsResponse.data.teams.map(team => ({
          name: team.name,
          members: team.members || []
        }))
        setTeams(teamsList)

        // Fetch tab switch logs for each team
        const switchData = {}
        for (const team of teamsList) {
          try {
            const response = await getTeamTabSwitches(team.name)
            switchData[team.name] = response.data
          } catch (err) {
            switchData[team.name] = { total_tab_left: 0, events: [] }
          }
        }
        setTabSwitchData(switchData)
      } catch (err) {
        console.error('Failed to fetch monitoring data:', err)
      } finally {
        if (isInitialLoad) {
          setLoading(false)
        }
      }
    }

    // Initial fetch
    fetchData(true)
    
    // Poll for updates every 3 seconds
    const intervalId = setInterval(() => fetchData(false), 3000)
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId)
  }, [])

  const getSortedTeams = () => {
    const sorted = [...teams]
    if (sortBy === 'switches') {
      return sorted.sort((a, b) => {
        const aCount = tabSwitchData[a.name]?.total_tab_left || 0
        const bCount = tabSwitchData[b.name]?.total_tab_left || 0
        return bCount - aCount
      })
    } else {
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>⏳ Loading Electronics Monitoring Data...</h2>
      </div>
    )
  }

  const sortedTeams = getSortedTeams()
  const teamsWithViolations = sortedTeams.filter(
    team => (tabSwitchData[team.name]?.total_tab_switches || 0) > 0
  )

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          📱 Electronics Monitoring Dashboard
        </h1>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          Track which teams switched to other applications/tabs during the game
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Summary Cards */}
          <div style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: '#ecf0f1',
            border: '2px solid #95a5a6'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Total Teams</h3>
            <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>
              {teams.length}
            </p>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: '#ffe6e6',
            border: '2px solid #e74c3c'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#c0392b' }}>Teams with Penalty</h3>
            <p style={{
              margin: '0',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#e74c3c'
            }}>
              {Object.values(tabSwitchData).filter(team => (team.total_tab_left || 0) > 3).length}
            </p>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>Warned (Not Penalized)</h3>
            <p style={{
              margin: '0',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#f39c12'
            }}>
              {Object.values(tabSwitchData).filter(team => (team.total_tab_left || 0) > 0 && (team.total_tab_left || 0) <= 3).length}
            </p>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: '#fff5f5',
            border: '2px solid #e67e22'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#d35400' }}>Total Points Deducted</h3>
            <p style={{
              margin: '0',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#e74c3c'
            }}>
              -{Object.values(tabSwitchData).reduce((sum, team) => sum + (team.total_deductions_from_switches || 0), 0)}
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
            Sort by:
          </span>
          <button
            onClick={() => setSortBy('switches')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: sortBy === 'switches' ? '#e74c3c' : '#e0e0e0',
              color: sortBy === 'switches' ? 'white' : '#2c3e50',
              fontWeight: sortBy === 'switches' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '13px'
            }}
            onMouseEnter={(e) => {
              if (sortBy !== 'switches') {
                e.target.style.backgroundColor = '#d0d0d0'
              }
            }}
            onMouseLeave={(e) => {
              if (sortBy !== 'switches') {
                e.target.style.backgroundColor = '#e0e0e0'
              }
            }}
          >
            📊 Violations (High to Low)
          </button>
          <button
            onClick={() => setSortBy('name')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: sortBy === 'name' ? '#3498db' : '#e0e0e0',
              color: sortBy === 'name' ? 'white' : '#2c3e50',
              fontWeight: sortBy === 'name' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '13px'
            }}
            onMouseEnter={(e) => {
              if (sortBy !== 'name') {
                e.target.style.backgroundColor = '#d0d0d0'
              }
            }}
            onMouseLeave={(e) => {
              if (sortBy !== 'name') {
                e.target.style.backgroundColor = '#e0e0e0'
              }
            }}
          >
            🔤 Team Name
          </button>
        </div>
      </div>

      {/* Teams List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {sortedTeams.map(team => {
          const switchCount = tabSwitchData[team.name]?.total_tab_left || 0
          const isSuspicious = switchCount > 3
          const penaltyAmount = Math.max(0, switchCount - 3) * 50

          return (
            <div
              key={team.name}
              onClick={() => setSelectedTeam(selectedTeam === team.name ? null : team.name)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: isSuspicious ? '#fff5f5' : '#f8f9fa',
                border: `2px solid ${isSuspicious ? '#e74c3c' : '#bdc3c7'}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#2c3e50' }}>
                    {team.name}
                  </h3>
                  <p style={{ margin: '0', color: '#7f8c8d', fontSize: '12px' }}>
                    {team.members.length} members
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'right'
                }}>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '20px',
                    backgroundColor: isSuspicious ? '#e74c3c' : switchCount === 0 ? '#27ae60' : '#f39c12',
                    color: 'white',
                    fontWeight: 'bold',
                    minWidth: '60px'
                  }}>
                    {switchCount} switches
                  </div>
                  {isSuspicious && (
                    <div style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      backgroundColor: '#c0392b',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      -${penaltyAmount} pts
                    </div>
                  )}
                </div>
              </div>

              {switchCount === 0 ? (
                <p style={{ margin: '0', color: '#27ae60', fontSize: '14px', fontWeight: 'bold' }}>
                  ✅ Clean - No violations
                </p>
              ) : switchCount <= 3 ? (
                <p style={{
                  margin: '0',
                  color: '#f39c12',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  ⚠️ Warned - {3 - switchCount} free switches remaining
                </p>
              ) : (
                <>
                  <p style={{
                    margin: '0 0 8px 0',
                    color: '#c0392b',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    🚨 PENALIZED: {switchCount - 3} violation(s)
                  </p>
                  <p style={{
                    margin: '0',
                    color: '#c0392b',
                    fontSize: '12px'
                  }}>
                    Points deducted: -{penaltyAmount}
                  </p>
                </>
              )}

              {selectedTeam === team.name && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #ddd',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ddd' }}>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Event</th>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tabSwitchData[team.name]?.events || []).map((event, idx) => {
                        const switchNumber = (tabSwitchData[team.name]?.events || [])
                          .filter(e => e.event_type === 'tab_left')
                          .indexOf(event) + 1;
                        const hasPenalty = event.event_type === 'tab_left' && switchNumber > 3;
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ 
                              padding: '4px', 
                              color: hasPenalty ? '#c0392b' : '#2c3e50',
                              fontWeight: hasPenalty ? 'bold' : 'normal'
                            }}>
                              {event.event_type === 'tab_left' ? (
                                <>{hasPenalty ? '🚨' : '❌'} Left #{switchNumber}</> 
                              ) : (
                                '✅ Returned'
                              )}
                            </td>
                            <td style={{ padding: '4px', color: '#7f8c8d', fontSize: '11px' }}>
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {teamsWithViolations.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          borderRadius: '8px',
          backgroundColor: '#d4edda',
          border: '2px solid #28a745',
          marginTop: '30px'
        }}>
          <h2 style={{ color: '#155724', margin: '0 0 10px 0' }}>
            ✅ All Teams Playing Fair!
          </h2>
          <p style={{ color: '#155724', margin: '0' }}>
            No tab switches detected from any team.
          </p>
        </div>
      )}
    </div>
  )
}

export default ElectronicsMonitoring
