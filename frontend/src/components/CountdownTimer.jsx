import React, { useEffect, useState } from 'react'

const CountdownTimer = ({ targetTime }) => {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const target = new Date(targetTime).getTime()
      const difference = target - now

      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000))
      } else {
        setTimeLeft(0)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [targetTime])

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (timeLeft === 0) {
    return <div className="timer" style={{ color: '#2ecc71' }}>Game Started!</div>
  }

  return (
    <div>
      <h3>Time Until Start:</h3>
      <div className="timer">{formatTime(timeLeft)}</div>
    </div>
  )
}

export default CountdownTimer