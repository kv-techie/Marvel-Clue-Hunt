import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth
export const login = (name, isAdmin = false) => 
  api.post('/login', { name, is_admin: isAdmin })

// Admin APIs
export const uploadAttendance = (formData) =>
  api.post('/admin/upload-attendance', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getAllTeams = () => api.get('/admin/teams')

export const setStartTime = (startTime) =>
  api.post('/admin/set-start-time', null, { params: { start_time: startTime } })

export const startGame = () => api.post('/admin/start-game')

export const getLeaderboard = () => api.get('/admin/leaderboard')

export const awardEnactmentBonus = (teamName) =>
  api.post(`/admin/award-enactment-bonus/${teamName}`)

export const getGameStatus = () => api.get('/admin/game-status')

// Attendee APIs
export const startTeamTimer = (teamName) =>
  api.post(`/attendee/start-timer/${teamName}`)

export const getTeamStatus = (teamName) =>
  api.get(`/attendee/team-status/${teamName}`)

export const requestHint = (teamName, dialogueNumber) =>
  api.post('/attendee/request-hint', { team_name: teamName, dialogue_number: dialogueNumber })

export const submitDialogue = (teamName, dialogueNumber, answer, timeTaken) =>
  api.post('/attendee/submit-dialogue', {
    team_name: teamName,
    dialogue_number: dialogueNumber,
    answer,
    time_taken: timeTaken,
  })

export const getCurrentDialogue = (teamName) =>
  api.get(`/attendee/current-dialogue/${teamName}`)

export default api