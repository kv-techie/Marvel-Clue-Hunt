import axios from 'axios'

// Use environment variable, or construct from current origin
// This allows the proxy to intercept /api calls when accessed from network IP
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,  // Add /api to the base URL
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const deviceId = sessionStorage.getItem('deviceId') || localStorage.getItem('deviceId')
  if (deviceId) {
    config.headers = config.headers || {}
    config.headers['X-Device-Id'] = deviceId
  }
  return config
})

// Auto-unwrap response data
api.interceptors.response.use(
  (response) => {
    // Unwrap .data from axios response
    return response.data;
  },
  (error) => {
    // Log the error for debugging
    console.error("[API Error]", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
)

// Auth
// login payloads:
// - Admin/Volunteer: { name, pin, is_admin: true }
// - Attendee: { team_name, device_id, device_name, device_info }
export const login = (payload) => api.post('/login', payload)

// logout payload:
// - Attendee: { team_name, device_id }
export const logout = (payload) => api.post('/logout', payload)

// Admin APIs - Team Allocation
export const uploadAttendees = (attendeesFile) => {
  const formData = new FormData()
  formData.append('file', attendeesFile)
  
  return api.post('/admin/allocate-teams-random', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const uploadTeamsAndAttendees = (teamNamesFile, attendeesFile) => {
  const formData = new FormData()
  formData.append('team_names_file', teamNamesFile)
  formData.append('attendees_file', attendeesFile)
  
  return api.post('/admin/upload-teams-and-attendees', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getAllTeams = () => api.get('/admin/teams')

export const setStartTime = (startTime) =>
  api.post('/admin/set-start-time', null, { params: { start_time: startTime } })

export const startGame = () => api.post('/admin/start-game')

export const getLeaderboard = () => api.get('/admin/leaderboard')

export const awardEnactmentBonus = (teamName, bonusAmount) =>
  api.post(`/admin/award-enactment-bonus/${teamName}`, { bonus_amount: bonusAmount })

export const getGameStatus = () => api.get('/admin/game-status')

export const getAdminList = () => api.get('/admin/admins')

export const addAdmin = (name) => api.post(`/admin/admins/${name}`)

export const removeAdmin = (name) => api.delete(`/admin/admins/${name}`)

export const adjustPoints = (teamName, adjustedBy, request) =>
  api.post(`/admin/adjust-points/${teamName}`, request, { params: { adjusted_by: adjustedBy } })

export const getAdjustmentsLog = () => api.get('/admin/adjustments-log')

export const getVolunteerList = () => api.get('/admin/volunteers')

export const addVolunteer = (name) =>
  api.post(`/admin/volunteers/${encodeURIComponent(name)}`)

export const removeVolunteer = (name) =>
  api.delete(`/admin/volunteers/${encodeURIComponent(name)}`)

// PIN management
export const setPin = (role, name, pin) =>
  api.post(`/admin/set-pin/${encodeURIComponent(role)}/${encodeURIComponent(name)}`, null, { params: { pin } })

export const getPins = () => api.get('/admin/pins')

export const deletePin = (role, name) => api.delete(`/admin/pin/${encodeURIComponent(role)}/${encodeURIComponent(name)}`)

// Device management
export const getDevices = (teamName) => api.get(`/admin/devices/${encodeURIComponent(teamName)}`)

export const removeDevice = (teamName, deviceId) => api.delete(`/admin/devices/${encodeURIComponent(teamName)}/${encodeURIComponent(deviceId)}`)

export const getTeamsActiveDevices = () => api.get('/admin/teams-active-devices')

export const getTeamTabSwitches = (teamName) => api.get(`/admin/team-tab-switches/${encodeURIComponent(teamName)}`)

// Attendee APIs
export const startTeamTimer = (teamName) =>
  api.post(`/attendee/start-timer/${encodeURIComponent(teamName)}`)

export const getTeamStatus = (teamName) =>
  api.get(`/attendee/team-status/${encodeURIComponent(teamName)}`)

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
  api.get(`/attendee/current-dialogue/${encodeURIComponent(teamName)}`)

export const logTabSwitch = (teamName, eventType) =>
  api.post('/attendee/log-tab-switch', {
    team_name: teamName,
    event_type: eventType,
    timestamp: new Date().toISOString(),
  })

export const stopGame = () => api.post('/admin/stop-game')

export const deleteParticipantData = () => api.post('/admin/delete-participant-data')

export const getDisqualificationCandidates = () => api.get('/admin/disqualification-candidates')

export const confirmDisqualification = (teamName, confirmedBy) =>
  api.post(`/admin/confirm-disqualification/${encodeURIComponent(teamName)}`, {}, { params: { confirmed_by: confirmedBy } })

export const reverseDisqualification = (teamName, reversedBy) =>
  api.post(`/admin/reverse-disqualification/${encodeURIComponent(teamName)}`, {}, { params: { reversed_by: reversedBy } })

export const teamAcknowledgeDisqualification = (teamName) =>
  api.post(`/admin/team-acknowledge-disqualification/${encodeURIComponent(teamName)}`)

// ===================== INFINITY STONE QUESTION-BASED APIs =====================

// Get current question for a team
export const getCurrentQuestion = (teamName) =>
  api.get(`/attendee/current-question/${encodeURIComponent(teamName)}`)

// Submit answer to a question
export const submitQuestion = (submission) =>
  api.post('/attendee/submit-question', submission)

// Request a hint for current question
export const requestHintQuestion = (request) =>
  api.post('/attendee/request-hint-question', request)

// Get certainty check feedback (Reality Stone PowerUp)
export const certaintyCheck = (teamName, questionId, submittedAnswer) =>
  api.post('/attendee/certainty-check', {
    team_name: teamName,
    question_id: questionId,
    submitted_answer: submittedAnswer,
  })

// Get team's assigned stone and progress
export const getTeamStone = (teamName) =>
  api.get(`/attendee/team-stone/${encodeURIComponent(teamName)}`)

// Get available Infinity Stones
export const getAvailableStones = () =>
  api.get('/attendee/available-stones')

export const getTeamPowerups = (teamName) =>
  api.get(`/attendee/team-powerups/${encodeURIComponent(teamName)}`)

// ===================== GAMIFICATION APIs =====================

// Get team's badges and achievements
export const getTeamBadges = (teamName) =>
  api.get(`/attendee/team-badges/${encodeURIComponent(teamName)}`)

// Get full leaderboard
export const getLeaderboardData = (sortBy = 'total_points_earned') =>
  api.get('/attendee/leaderboard', { params: { sort_by: sortBy } })

// Get specific team's rank
export const getTeamRank = (teamName, sortBy = 'total_points_earned') =>
  api.get(`/attendee/team-rank/${encodeURIComponent(teamName)}`, { params: { sort_by: sortBy } })

// Get leaderboard statistics
export const getLeaderboardStats = () =>
  api.get('/attendee/leaderboard-stats')

// Export api as both default and named export
export const apiClient = api

