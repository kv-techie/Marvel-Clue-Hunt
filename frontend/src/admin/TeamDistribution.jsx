import React, { useState, useEffect } from 'react'
import { uploadAttendees, getAllTeams } from '../api/client'

const TeamDistribution = () => {
  const [attendeesFile, setAttendeesFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [result, setResult] = useState(null)
  const [teams, setTeams] = useState(null)

  const fetchTeams = async () => {
    try {
      const response = await getAllTeams()
      setTeams(response)
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

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

    if (!attendeesFile) {
      setError('Please select an attendees file')
      return
    }

    setLoading(true)

    try {
      const response = await uploadAttendees(attendeesFile)
      const data = response

      setSuccess(data.message)
      setResult(data)
      
      // Refresh teams list
      fetchTeams()
      
      // Clear file input
      setAttendeesFile(null)
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
        Upload attendees to randomly allocate them into the 6 Infinity Stone teams
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
          gridTemplateColumns: '1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
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
          disabled={!attendeesFile || loading}
          style={{
            padding: '12px 24px',
            backgroundColor: attendeesFile && !loading ? '#3498db' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: attendeesFile && !loading ? 'pointer' : 'default',
            opacity: attendeesFile && !loading ? 1 : 0.5,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (attendeesFile && !loading) {
              e.target.style.backgroundColor = '#2980b9'
            }
          }}
          onMouseLeave={(e) => {
            if (attendeesFile && !loading) {
              e.target.style.backgroundColor = '#3498db'
            }
          }}
        >
          {loading ? '⏳ Allocating...' : '🚀 Allocate Teams'}
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
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#fff' }}>🎲 Team Sizes</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px'
            }}>
              {Object.entries(result.team_sizes || {}).map(([teamName, size]) => (
                <div
                  key={teamName}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(155, 89, 182, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 'bold' }}>{teamName}</div>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>
                    {size} attendee{size !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Teams */}
      {teams && teams.teams && teams.teams.length > 0 && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: '#fff' }}>👥 Current Teams ({teams.teams.length})</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {teams.teams.map((team, idx) => (
              <div
                key={idx}
                style={{
                  padding: '15px',
                  backgroundColor: 'rgba(52, 152, 219, 0.1)',
                  borderRadius: '6px',
                  border: `1px solid rgba(52, 152, 219, 0.3)`
                }}
              >
                <h4 style={{ color: '#3498db', marginTop: 0, marginBottom: '8px' }}>{team.name}</h4>
                <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '12px', fontWeight: 'bold' }}>
                  {team.members.length} team member{team.members.length !== 1 ? 's' : ''}
                </div>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  fontSize: '13px',
                  color: '#ddd'
                }}>
                  {team.members && team.members.length > 0 ? (
                    team.members.map((member, idx) => (
                      <div key={idx} style={{ 
                        padding: '8px', 
                        marginBottom: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '4px',
                        borderLeft: '3px solid #3498db'
                      }}>
                        {member}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#999', fontStyle: 'italic' }}>No members assigned</div>
                  )}
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
