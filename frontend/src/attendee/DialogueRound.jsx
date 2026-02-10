import React, { useState } from 'react'
import { submitDialogue } from '../api/client'

const DIALOGUE_PROMPTS = {
  1: {
    title: '🦸 Dialogue 1: The Genius Billionaire',
    description: 'A hero in red and gold armor stands before you. His arc reactor glows bright. He speaks of his journey from weapons maker to world protector.',
    question: 'Who is this armored Avenger?'
  },
  2: {
    title: '💜 Dialogue 2: The Mad Titan',
    description: 'A purple giant sits on his throne, speaking of balance and destiny. He wields stones of infinite power, seeking to reshape reality itself.',
    question: 'What is the name of this universal threat?'
  },
  3: {
    title: '⚡ Dialogue 3: Earth\'s Mightiest',
    description: 'A team assembled by Nick Fury stands united. Iron Man, Captain America, Thor, Hulk, Black Widow, and Hawkeye fight side by side against impossible odds.',
    question: 'What is this legendary team called?'
  }
}

const DialogueRound = ({ teamName, dialogueNumber, elapsedTime, onComplete }) => {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)

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
        <p>{dialogue.description}</p>
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