import React, { useState, useEffect } from 'react'
import { getAllTeams, getTeamTabSwitches, getTeamsActiveDevices } from '../api/client'
import '../styles/ElectronicsMonitoring.css'

const ElectronicsMonitoring = () => {
  const [teams, setTeams] = useState([])
  const [tabSwitchData, setTabSwitchData] = useState({})
  const [activeDevicesData, setActiveDevicesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [sortBy, setSortBy] = useState('switches') // 'switches' or 'name'
  const [showDevicesView, setShowDevicesView] = useState(false)

  useEffect(() => {
    let isFetching = false

    const fetchData = async (isInitialLoad = false) => {
      if (isFetching) {
        return
      }
      isFetching = true
      try {
        if (isInitialLoad) {
          setLoading(true)
        }
        
        // Fetch all teams
        const teamsResponse = await getAllTeams()
        const teamsList = teamsResponse.teams.map(team => ({
          name: team.name,
          members: team.members || []
        }))
        setTeams(teamsList)

        // Fetch active devices info
        try {
          const devicesResponse = await getTeamsActiveDevices()
          setActiveDevicesData(devicesResponse.teams || [])
        } catch (err) {
          console.error('Failed to fetch active devices:', err)
          setActiveDevicesData([])
        }

        // Fetch tab switch logs for each team in parallel
        const switchResults = await Promise.all(
          teamsList.map(async (team) => {
            try {
              const response = await getTeamTabSwitches(team.name)
              return [team.name, response]
            } catch (err) {
              return [team.name, { total_tab_left: 0, events: [] }]
            }
          })
        )
        setTabSwitchData(Object.fromEntries(switchResults))
      } catch (err) {
        console.error('Failed to fetch monitoring data:', err)
      } finally {
        if (isInitialLoad) {
          setLoading(false)
        }
        isFetching = false
      }
    }

    // Initial fetch
    fetchData(true)
    
    // Poll for updates every 1 second
    const intervalId = setInterval(() => fetchData(false), 1000)
    
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
      <div className="em-container" style={{ textAlign: 'center', paddingTop: '40px' }}>
        <h2 className="em-text-info">⏳ Loading Electronics Monitoring Data...</h2>
      </div>
    )
  }

  const sortedTeams = getSortedTeams()
  const teamsWithViolations = sortedTeams.filter(
    team => (tabSwitchData[team.name]?.total_tab_switches || 0) > 0
  )

  return (
    <div className="em-container">
      <div style={{ marginBottom: '30px' }}>
        <div className="em-header">
          <h1>📱 Electronics Monitoring Dashboard</h1>
          <p>Track device activity and tab switches during the game</p>
        </div>

        {/* View Toggle */}
        <div className="em-view-toggle">
          <button
            onClick={() => setShowDevicesView(false)}
            className={`em-toggle-btn ${!showDevicesView ? 'active switches' : 'inactive'}`}
          >
            📊 Tab Switch Violations
          </button>
          <button
            onClick={() => setShowDevicesView(true)}
            className={`em-toggle-btn ${showDevicesView ? 'active devices' : 'inactive'}`}
          >
            📱 Active Devices
          </button>
        </div>

        {/* Active Devices View */}
        {showDevicesView && (
          <div style={{ marginBottom: '30px' }}>
            <div className="em-summary-grid">
              <div className="em-summary-card em-card-info">
                <h3>Total Teams</h3>
                <p className="em-summary-value">{activeDevicesData.length}</p>
              </div>

              <div className="em-summary-card em-card-success">
                <h3>With Active Device</h3>
                <p className="em-summary-value">
                  {activeDevicesData.filter(t => t.has_active).length}
                </p>
              </div>

              <div className="em-summary-card em-card-warning">
                <h3>No Active Device</h3>
                <p className="em-summary-value">
                  {activeDevicesData.filter(t => !t.has_active).length}
                </p>
              </div>
            </div>

            <div className="em-list-grid">
              {activeDevicesData.map(team => (
                <div
                  key={team.team_name}
                  className={`em-list-card ${team.has_active ? 'active' : 'offline'}`}
                >
                  <div className="em-card-header">
                    <div style={{ flex: 1 }}>
                      <h3>
                        {team.team_name}
                        {team.has_active ? (
                          <span className="em-switches-badge success" style={{ padding: '2px 8px', fontSize: '11px', marginLeft: '8px' }}>
                            🟢 ACTIVE
                          </span>
                        ) : (
                          <span className="em-switches-badge danger" style={{ padding: '2px 8px', fontSize: '11px', marginLeft: '8px' }}>
                            ⚠️ OFFLINE
                          </span>
                        )}
                      </h3>
                      <p>
                        {team.members_count} members • {team.registered_devices_count} registered devices
                      </p>
                    </div>
                  </div>

                  {team.has_active && team.active_device ? (
                    <div className="em-device-info active">
                      <div className="em-device-name">
                        {team.active_device.device_name || 'Unknown Device'}
                      </div>
                      <div className="em-text-muted" style={{ fontSize: '12px' }}>
                        <p>📱 {team.active_device.browser} • {team.active_device.os}</p>
                        <p>🖥️ {team.active_device.screen_resolution}</p>
                        {team.active_device.last_login && (
                          <p>⏱️ Last: {new Date(team.active_device.last_login).toLocaleTimeString()}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="em-device-info inactive">
                      No device currently active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Switches View */}
        {!showDevicesView && (
          <>
            <div className="em-summary-grid">
              <div className="em-summary-card em-card-info">
                <h3>Total Teams</h3>
                <p className="em-summary-value">{teams.length}</p>
              </div>

              <div className="em-summary-card em-card-danger">
                <h3>Teams with Penalty</h3>
                <p className="em-summary-value">
                  {Object.values(tabSwitchData).filter(team => (team.total_tab_left || 0) > 3).length}
                </p>
              </div>

              <div className="em-summary-card em-card-warning">
                <h3>Warned (Not Penalized)</h3>
                <p className="em-summary-value">
                  {Object.values(tabSwitchData).filter(team => (team.total_tab_left || 0) > 0 && (team.total_tab_left || 0) <= 3).length}
                </p>
              </div>

              <div className="em-summary-card em-card-danger" style={{ borderColor: '#d35400', backgroundColor: 'rgba(211, 84, 0, 0.1)' }}>
                <h3 style={{ color: '#d35400' }}>Total Points Deducted</h3>
                <p className="em-summary-value" style={{ color: '#e74c3c' }}>
                  -{Object.values(tabSwitchData).reduce((sum, team) => sum + (team.total_deductions_from_switches || 0), 0)}
                </p>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="em-sort-controls">
              <span className="em-sort-label">Sort by:</span>
              <button
                onClick={() => setSortBy('switches')}
                className={`em-toggle-btn ${sortBy === 'switches' ? 'active switches' : 'inactive'}`}
              >
                📊 Violations (High to Low)
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`em-toggle-btn ${sortBy === 'name' ? 'active switches' : 'inactive'}`}
                style={{ backgroundColor: sortBy === 'name' ? 'var(--accent-secondary)' : '' }}
              >
                🔤 Team Name
              </button>
            </div>

            {/* Teams List */}
            <div className="em-list-grid">
              {sortedTeams.map(team => {
                const switchCount = tabSwitchData[team.name]?.total_tab_left || 0
                const isSuspicious = switchCount > 3
                const penaltyAmount = tabSwitchData[team.name]?.total_deductions_from_switches || 0

                return (
                  <div
                    key={team.name}
                    onClick={() => setSelectedTeam(selectedTeam === team.name ? null : team.name)}
                    className={`em-list-card clickable ${isSuspicious ? 'suspicious' : 'clean'}`}
                  >
                    <div className="em-card-header">
                      <div>
                        <h3 className="em-device-name">{team.name}</h3>
                        <p>{team.members.length} members</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                        <div className={`em-switches-badge ${isSuspicious ? 'danger' : switchCount === 0 ? 'success' : 'warning'}`}>
                          {switchCount} switches
                        </div>
                        {isSuspicious && (
                          <div className="em-penalty-badge">
                            -${penaltyAmount} pts
                          </div>
                        )}
                      </div>
                    </div>

                    {switchCount === 0 ? (
                      <p className="em-text-success" style={{ margin: 0, fontSize: '14px' }}>✅ Clean - No violations</p>
                    ) : switchCount <= 3 ? (
                      <p className="em-text-warning" style={{ margin: 0, fontSize: '14px' }}>⚠️ Warned - {3 - switchCount} free switches remaining</p>
                    ) : (
                      <>
                        <p className="em-text-danger" style={{ margin: '0 0 8px 0', fontSize: '14px' }}>🚨 PENALIZED: {switchCount - 3} violation(s)</p>
                        <p className="em-text-danger" style={{ margin: 0, fontSize: '12px' }}>Points deducted: -{penaltyAmount}</p>
                      </>
                    )}

                    {selectedTeam === team.name && (
                      <div className="em-details">
                        <table className="em-table">
                          <thead>
                            <tr>
                              <th>Event</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(tabSwitchData[team.name]?.events || []).map((event, idx) => {
                              const switchNumber = (tabSwitchData[team.name]?.events || [])
                                .filter(e => e.event_type === 'tab_left')
                                .indexOf(event) + 1;
                              const hasPenalty = event.event_type === 'tab_left' && switchNumber > 3;
                              
                              return (
                                <tr key={idx}>
                                  <td className={hasPenalty ? 'em-text-danger' : 'em-text-primary'}>
                                    {event.event_type === 'tab_left' ? (
                                      <>{hasPenalty ? '🚨' : '❌'} Left #{switchNumber}</> 
                                    ) : (
                                      '✅ Returned'
                                    )}
                                  </td>
                                  <td className="em-text-muted" style={{ fontSize: '11px' }}>
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
              <div className="em-alert">
                <h2>✅ All Teams Playing Fair!</h2>
                <p>No tab switches detected from any team.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ElectronicsMonitoring
