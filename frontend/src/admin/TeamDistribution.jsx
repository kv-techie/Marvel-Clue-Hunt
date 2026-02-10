import React, { useState, useEffect } from 'react'
import { uploadAttendance, getAllTeams } from '../api/client'

const TeamDistribution = () => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [teams, setTeams] = useState(null)
  const [message, setMessage] = useState('')

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

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setMessage('')
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a CSV file')
      return
    }

    setUploading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await uploadAttendance(formData)
      setMessage(`Success! ${response.data.total_teams} teams created with ${response.data.total_attendees} attendees`)
      fetchTeams()
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || 'Upload failed'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h2>👥 Team Distribution</h2>
      
      <div className="upload-section">
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange}
          style={{ marginBottom: '10px' }}
        />
        <button 
          onClick={handleUpload} 
          className="btn btn-primary"
          disabled={uploading || !file}
        >
          {uploading ? 'Uploading...' : 'Upload & Allocate Teams'}
        </button>
        {message && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            borderRadius: '5px',
            background: message.startsWith('Success') ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'
          }}>
            {message}
          </div>
        )}
      </div>

      {teams && (
        <div className="teams-grid" style={{ marginTop: '30px' }}>
          {Object.entries(teams).map(([teamName, teamData]) => (
            <div key={teamName} className="team-card">
              <h3>{teamName}</h3>
              <ul className="team-members">
                {teamData.members.map((member, idx) => (
                  <li key={idx}>{member}</li>
                ))}
              </ul>
              <div className="team-stats">
                <div className="stat-row">
                  <span>Hints Used:</span>
                  <span>{teamData.hints_used}/3</span>
                </div>
                <div className="stat-row">
                  <span>Dialogues:</span>
                  <span>{teamData.dialogues_completed}/3</span>
                </div>
                <div className="stat-row">
                  <span>Score:</span>
                  <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{teamData.current_score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TeamDistribution