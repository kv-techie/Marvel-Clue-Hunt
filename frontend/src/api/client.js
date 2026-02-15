import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth
// login payloads:
// - Admin/Volunteer: { name, pin, is_admin: true }
// - Attendee: { team_name, device_id, device_name, device_info }
export const login = (payload) => api.post('/login', payload)

// Admin APIs - Team Allocation
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

export const addVolunteer = (name) => api.post(`/admin/volunteers/${name}`)

export const removeVolunteer = (name) => api.delete(`/admin/volunteers/${name}`)

// PIN management
export const setPin = (role, name, pin) =>
  api.post(`/admin/set-pin/${encodeURIComponent(role)}/${encodeURIComponent(name)}`, null, { params: { pin } })

export const getPins = () => api.get('/admin/pins')

export const deletePin = (role, name) => api.delete(`/admin/pin/${encodeURIComponent(role)}/${encodeURIComponent(name)}`)

// Device management
export const getDevices = (teamName) => api.get(`/admin/devices/${encodeURIComponent(teamName)}`)

export const removeDevice = (teamName, deviceId) => api.delete(`/admin/devices/${encodeURIComponent(teamName)}/${encodeURIComponent(deviceId)}`)

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

export const stopGame = () => api.post('/admin/stop-game')

export const deleteParticipantData = () => api.post('/admin/delete-participant-data')

export const getDisqualificationCandidates = () => api.get('/admin/disqualification-candidates')

export const confirmDisqualification = (teamName, confirmedBy) =>
  api.post(`/admin/confirm-disqualification/${teamName}`, {}, { params: { confirmed_by: confirmedBy } })

export const teamAcknowledgeDisqualification = (teamName) =>
  api.post(`/admin/team-acknowledge-disqualification/${teamName}`)

export default api
