import React, { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TeamProvider } from './context/TeamContext'
import { TimerProvider } from './context/TimerContext'
import ProtectedRoute from './components/ProtectedRoute'
import ParticleBackground from './components/ParticleBackground'
import CustomCursor from './components/CustomCursor'
import MarvelLoader from './components/MarvelLoader'
import ErrorBoundary from './components/ErrorBoundary'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useDeviceTier } from './hooks/useDeviceTier'

// Lazy load route components
const Login = lazy(() => import('./pages/Login'))
const Admin = lazy(() => import('./pages/Admin'))
const Attendee = lazy(() => import('./pages/Attendee'))
const Volunteer = lazy(() => import('./pages/Volunteer'))

function App() {
  const reducedMotion = useReducedMotion();
  const tier = useDeviceTier();
  
  return (
    <ErrorBoundary fallbackMessage="The game client has crashed. Tap reload to recover.">
      {!reducedMotion && <CustomCursor />}
      {!reducedMotion && tier !== 'low' && <ParticleBackground density={tier === 'high' ? 80 : 30} />}
      <HashRouter>
      <AuthProvider>
        <ErrorBoundary fallbackMessage="Session error. Please log in again.">
        <TeamProvider>
          <TimerProvider>
            <Suspense fallback={<MarvelLoader />}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/volunteer/*"
                  element={
                    <ProtectedRoute requireVolunteer>
                      <Volunteer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendee/*"
                  element={
                    <ProtectedRoute requireAttendee>
                      <Attendee />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </TimerProvider>
        </TeamProvider>
        </ErrorBoundary>
      </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App