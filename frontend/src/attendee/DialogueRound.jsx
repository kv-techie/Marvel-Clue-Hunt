import React, { useState, useEffect } from 'react'
import { submitDialogue } from '../api/client'

const DIALOGUE_PROMPTS = {
  1: {
    title: '🦸 Dialogue 1',
    question: 'What is the answer?'
  },
  2: {
    title: '💜 Dialogue 2',
    question: 'What is the answer?'
  },
  3: {
    title: '⚡ Dialogue 3',
    question: 'What is the answer?'
  }
}

const DialogueRound = ({ teamName, dialogueNumber, elapsedTime, onComplete }) => {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)

  // Reset state when dialogue number changes
  useEffect(() => {
    setAnswer('')
    setMessage('')
    setIsCorrect(false)
    setSubmitting(false)
  }, [dialogueNumber])

  const dialogue = DIALOGUE_PROMPTS[dialogueNumber]

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

  if (!dialogue) {
    return null
  }

  return (
    <div className="dialogue-section">
      <h2>{dialogue.title}</h2>
      
      <div className="dialogue-content">
        <p style={{ marginTop: '20px', fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
          {dialogue.question}
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
