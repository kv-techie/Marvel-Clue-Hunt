import React, { useState, useEffect } from 'react'
import { uploadTeamsAndAttendees, getAllTeams } from '../api/client'

const TeamDistribution = () => {
  const [teamNamesFile, setTeamNamesFile] = useState(null)
  const [attendeesFile, setAttendeesFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [result, setResult] = useState(null)
  const [teams, setTeams] = useState(null)

  const fetchTeams = async () => {
    try {
      const response = await getAllTeams()
      setTeams(response.data)
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  const handleTeamNamesFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setTeamNamesFile(file)
      setError('')
    }
  }

  const handleAttendeesFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAttendeesFile(file)
      setError('')
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResult(null)

    if (!teamNamesFile) {
      setError('Please select a team names file')
      return
    }

    if (!attendeesFile) {
      setError('Please select an attendees file')
      return
    }

    setLoading(true)

    try {
      const response = await uploadTeamsAndAttendees(teamNamesFile, attendeesFile)
      const data = response.data

      setSuccess(data.message)
      setResult(data)
      
      // Refresh teams list
      fetchTeams()
      
      // Clear file inputs
      setTeamNamesFile(null)
      setAttendeesFile(null)
      
      // Reset file input elements
      document.getElementById('teamNamesInput').value = ''
      document.getElementById('attendeesInput').value = ''
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to allocate teams')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>📋 Team Distribution</h2>
      <p style={{ color: '#888', marginBottom: '20px' }}>
        Upload team names and attendees to randomly allocate teams
      </p>

      {error && (
        <div style={{
          color: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.2)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid rgba(231, 76, 60, 0.3)'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          color: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.2)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid rgba(46, 204, 113, 0.3)'
        }}>
          ✅ {success}
        </div>
      )}

      <form onSubmit={handleUpload} style={{ marginBottom: '30px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Team Names File Upload */}
          <div style={{
            padding: '20px',
            border: '2px dashed #444',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#fff' }}>
              📝 Team Names File
            </h3>
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px' }}>
              One team name per line (CSV or TXT)
            </p>
            
            <input
              id="teamNamesInput"
              type="file"
              accept=".csv,.txt"
              onChange={handleTeamNamesFileChange}
              style={{
                padding: '10px',
                width: '100%',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff',
                cursor: 'pointer'
              }}
            />
            
            {teamNamesFile && (
              <div style={{
                marginTop: '10px',
                padding: '8px',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderRadius: '4px',
                fontSize: '13px',
                border: '1px solid rgba(46, 204, 113, 0.3)'
              }}>
                ✓ {teamNamesFile.name}
              </div>
            )}
            
            <div style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#3498db',
              border: '1px solid rgba(52, 152, 219, 0.3)'
            }}>
              <strong>Example format:</strong>
              <pre style={{ 
                marginTop: '8px', 
                marginBottom: 0, 
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
{`Team Avengers
Team Justice League
Team X-Men
Team Guardians
Team Fantastic Four`}
              </pre>
            </div>
          </div>

          {/* Attendees File Upload */}
          <div style={{
            padding: '20px',
            border: '2px dashed #444',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#fff' }}>
              👥 Attendees File
            </h3>
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px' }}>
              One attendee name per line (CSV or TXT)
            </p>
            
            <input
              id="attendeesInput"
              type="file"
              accept=".csv,.txt"
              onChange={handleAttendeesFileChange}
              style={{
                padding: '10px',
                width: '100%',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#222',
                color: '#fff',
                cursor: 'pointer'
              }}
            />
            
            {attendeesFile && (
              <div style={{
                marginTop: '10px',
                padding: '8px',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderRadius: '4px',
                fontSize: '13px',
                border: '1px solid rgba(46, 204, 113, 0.3)'
              }}>
                ✓ {attendeesFile.name}
              </div>
            )}
            
            <div style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#3498db',
              border: '1px solid rgba(52, 152, 219, 0.3)'
            }}>
              <strong>Example format:</strong>
              <pre style={{ 
                marginTop: '8px', 
                marginBottom: 0, 
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
{`John Doe
Jane Smith
Bob Wilson
Alice Johnson
Charlie Brown`}
              </pre>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !teamNamesFile || !attendeesFile}
          className="btn btn-primary"
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            width: '100%',
            opacity: loading || !teamNamesFile || !attendeesFile ? 0.5 : 1,
            cursor: loading || !teamNamesFile || !attendeesFile ? 'not-allowed' : 'pointer',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '🔄 Allocating Teams...' : '🚀 Upload & Allocate Teams'}
        </button>
      </form>

      {/* Results Display */}
      {result && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: '#fff' }}>📊 Allocation Results</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderRadius: '6px',
              textAlign: 'center',
              border: '1px solid rgba(52, 152, 219, 0.3)'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>
                {result.total_teams}
              </div>
              <div style={{ fontSize: '14px', color: '#aaa' }}>Total Teams</div>
            </div>
            
            <div style={{
              padding: '15px',
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              borderRadius: '6px',
              textAlign: 'center',
              border: '1px solid rgba(46, 204, 113, 0.3)'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ecc71' }}>
                {result.total_attendees}
              </div>
              <div style={{ fontSize: '14px', color: '#aaa' }}>Total Attendees</div>
            </div>
            
            <div style={{
              padding: '15px',
              backgroundColor: 'rgba(155, 89, 182, 0.1)',
              borderRadius: '6px',
              textAlign: 'center',
              border: '1px solid rgba(155, 89, 182, 0.3)'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9b59b6' }}>
                {result.min_team_size} - {result.max_team_size}
              </div>
              <div style={{ fontSize: '14px', color: '#aaa' }}>Members per Team</div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#fff' }}>🎲 Team Distribution</h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {Object.entries(result.teams).map(([teamName, members]) => (
                <div
                  key={teamName}
                  style={{
                    padding: '15px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <strong style={{ fontSize: '16px', color: '#fff' }}>{teamName}</strong>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: 'rgba(52, 152, 219, 0.2)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      color: '#3498db',
                      border: '1px solid rgba(52, 152, 219, 0.3)'
                    }}>
                      {members.length} members
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {members.map((member, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#ddd',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Existing Teams Display */}
      {teams && (
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ color: '#fff' }}>📊 Current Teams Status</h3>
          <div className="teams-grid" style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginTop: '20px'
          }}>
            {Object.entries(teams).map(([teamName, teamData]) => (
              <div key={teamName} className="team-card" style={{
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ marginTop: 0, color: '#fff' }}>{teamName}</h3>
                <ul className="team-members" style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '10px 0'
                }}>
                  {teamData.members.map((member, idx) => (
                    <li key={idx} style={{
                      padding: '5px 0',
                      color: '#ddd',
                      fontSize: '14px'
                    }}>• {member}</li>
                  ))}
                </ul>
                <div className="team-stats" style={{
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="stat-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#aaa' }}>Hints Used:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{teamData.hints_used}/3</span>
                  </div>
                  <div className="stat-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#aaa' }}>Dialogues:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{teamData.dialogues_completed}/3</span>
                  </div>
                  <div className="stat-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#aaa' }}>Score:</span>
                    <span style={{ 
                      color: teamData.current_score < 0 ? '#e74c3c' : '#2ecc71', 
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {teamData.current_score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamDistribution
