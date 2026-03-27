import { useEffect, useState, useCallback, useRef } from 'react'
import { apiClient } from '../api/client'

/**
 * Custom hook to track tab visibility and focus changes
 * Rules: 3 free switches with warnings, then -50 points per switch
 */
export const useTabFocusTracking = (teamName) => {
  const [isVisible, setIsVisible] = useState(true)
  const [tabSwitchData, setTabSwitchData] = useState({
    total_tab_left: 0,
    warning_count: 0,
    switches_remaining: 3,
    is_penalized: false,
    penalty_applied: false,
    total_deductions_from_switches: 0
  })
  const [focusWarning, setFocusWarning] = useState(false)
  const warningTimeoutRef = useRef(null)

  const applyTabSwitchResponse = useCallback((data) => {
    setTabSwitchData({
      total_tab_left: data.total_tab_left,
      warning_count: data.warning_count ?? Math.min(3, data.total_tab_left ?? 0),
      switches_remaining: data.switches_remaining,
      is_penalized: data.is_penalized,
      penalty_applied: data.penalty_applied ?? false,
      total_deductions_from_switches: data.total_deductions_from_switches
    })
  }, [])

  const showWarning = useCallback(() => {
    setFocusWarning(true)
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    warningTimeoutRef.current = setTimeout(() => setFocusWarning(false), 8000)
  }, [])

  const logTabSwitch = useCallback(
    async (event) => {
      const newVisibility = document.visibilityState === 'visible'
      
      if (!newVisibility && isVisible) {
        // User switched away from tab
        try {
          const response = await apiClient.post('/attendee/log-tab-switch', {
            team_name: teamName,
            event_type: 'tab_left',
            timestamp: new Date().toISOString(),
          })
          
          applyTabSwitchResponse(response.data)
        } catch (err) {
          console.error('Failed to log tab switch:', err)
        }
      } else if (newVisibility && !isVisible) {
        // User returned to tab
        try {
          const response = await apiClient.post('/attendee/log-tab-switch', {
            team_name: teamName,
            event_type: 'tab_returned',
            timestamp: new Date().toISOString(),
          })

          applyTabSwitchResponse(response.data)
          showWarning()
        } catch (err) {
          console.error('Failed to log tab return:', err)
        }
      }

      setIsVisible(newVisibility)
    },
    [teamName, isVisible, applyTabSwitchResponse, showWarning]
  )

  useEffect(() => {
    document.addEventListener('visibilitychange', logTabSwitch)

    return () => {
      document.removeEventListener('visibilitychange', logTabSwitch)
    }
  }, [logTabSwitch])

  useEffect(() => () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
  }, [])

  return {
    isVisible,
    ...tabSwitchData,
    focusWarning,
    setFocusWarning,
  }
}
