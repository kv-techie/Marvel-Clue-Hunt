import React, { useState } from 'react'
import { requestHint } from '../api/client'

const HintPanel = ({ teamName, dialogueNumber, hintsUsed, hintsRemaining }) => {
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequestHint = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await requestHint(teamName, dialogueNumber)
      setHint(response.data.hint)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get hint')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hint-section">
      <h2>💡 Hints</h2>
      <p>
        Hints Used: <strong>{hintsUsed}/3</strong> 
        {hintsUsed > 0 && <span style={{ color: '#e74c3c' }}> (-{hintsUsed * 10} points)</span>}
      </p>
      
      <button 
        onClick={handleRequestHint}
        className="btn btn-secondary"
        disabled={loading || hintsRemaining === 0}
        style={{ marginTop: '10px' }}
      >
        {loading ? 'Getting hint...' : `Request Hint (${hintsRemaining} remaining)`}
      </button>

      {hint && (
        <div className="hint-text">
          <strong>💡 Hint:</strong> {hint}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  )
}

export default HintPanel