import React, { useState, useEffect } from 'react'
import { submitDialogue, apiClient } from '../api/client'

const DialogueRound = ({ teamName, dialogueNumber, elapsedTime, onComplete }) => {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [clue, setClue] = useState('')
  const [character, setCharacter] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch team character and dialogue clue
  useEffect(() => {
    const fetchDialogue = async () => {
      try {
        setLoading(true)
        
        // Get team's assigned character
        const charResponse = await apiClient.get(`/attendee/team-character/${teamName}`)
        setCharacter(charResponse.data.character)
        
        // Get dialogue clue
        if (charResponse.data.character && dialogueNumber) {
          const dialogueResponse = await apiClient.get(
            `/attendee/dialogue/${teamName}/${dialogueNumber}`
          )
          setClue(dialogueResponse.data.clue)
        }
      } catch (err) {
        console.error('Error fetching dialogue:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDialogue()
  }, [teamName, dialogueNumber])

  // Reset state when dialogue number changes
  useEffect(() => {
    setAnswer('')
    setMessage('')
    setIsCorrect(false)
    setSubmitting(false)
  }, [dialogueNumber])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!answer.trim()) {
      setMessage('Please enter an answer')
      return
    }

    setSubmitting(true)
    setMessage('')
    
    try {
      const response = await submitDialogue(teamName, dialogueNumber, answer, elapsedTime)
      
      if (response.data.correct) {
        setIsCorrect(true)
        setMessage(`🎉 Correct! ${response.data.message}`)
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        setMessage('❌ ' + response.data.message)
      }
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.detail || 'Failed to submit'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="dialogue-section">Loading dialogue...</div>
  }

  return (
    <div className="dialogue-section">
      <h2>🦸 Dialogue {dialogueNumber}</h2>
      
      {character && (
        <p style={{ fontSize: '16px', color: '#3498db', marginBottom: '15px' }}>
          <strong>Character:</strong> {character}
        </p>
      )}
      
      <div className="dialogue-content">
        <p style={{ marginTop: '20px', fontSize: '16px', lineHeight: '1.6', color: '#f39c12' }}>
          {clue || 'Loading clue...'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="answer-section">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer..."
          disabled={submitting || isCorrect}
          autoFocus
        />
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={submitting || isCorrect}
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </form>

      {message && (
        <div className={isCorrect ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}
    </div>
  )
}

export default DialogueRound
