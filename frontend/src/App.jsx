import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TeamProvider } from './context/TeamContext'
import { TimerProvider } from './context/TimerContext'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Attendee from './pages/Attendee'
import Volunteer from './pages/Volunteer'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <TimerProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/volunteer"
                element={
                  <ProtectedRoute requireVolunteer>
                    <Volunteer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendee"
                element={
                  <ProtectedRoute requireAttendee>
                    <Attendee />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </TimerProvider>
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App