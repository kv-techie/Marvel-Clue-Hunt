export const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export const getTimeSinceStart = (startTime) => {
  if (!startTime) return 0
  const now = new Date().getTime()
  const start = new Date(startTime).getTime()
  return Math.floor((now - start) / 1000)
}

export const getTimeUntil = (targetTime) => {
  const now = new Date().getTime()
  const target = new Date(targetTime).getTime()
  const difference = target - now
  return difference > 0 ? Math.floor(difference / 1000) : 0
}
