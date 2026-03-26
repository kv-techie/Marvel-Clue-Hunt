import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '../api/client'

/**
 * Custom hook to track tab visibility and focus changes
 * Rules: 3 free switches with warnings, then -50 points per switch
 */
export const useTabFocusTracking = (teamName) => {
  const [isVisible, setIsVisible] = useState(true)
  const [tabSwitchData, setTabSwitchData] = useState({
    total_tab_left: 0,
    switches_remaining: 3,
    is_penalized: false,
    total_deductions_from_switches: 0
  })
  const [focusWarning, setFocusWarning] = useState(false)

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
          
          // Update local state with response data
          setTabSwitchData({
            total_tab_left: response.data.total_tab_left,
            switches_remaining: response.data.switches_remaining,
            is_penalized: response.data.is_penalized,
            total_deductions_from_switches: response.data.total_deductions_from_switches
          })
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

          // Update local state with response data
          setTabSwitchData({
            total_tab_left: response.data.total_tab_left,
            switches_remaining: response.data.switches_remaining,
            is_penalized: response.data.is_penalized,
            total_deductions_from_switches: response.data.total_deductions_from_switches
          })
          
          setFocusWarning(true)
          
          // Auto-hide warning after 8 seconds (longer so they see it)
          setTimeout(() => setFocusWarning(false), 8000)
        } catch (err) {
          console.error('Failed to log tab return:', err)
        }
      }

      setIsVisible(newVisibility)
    },
    [teamName, isVisible]
  )

  useEffect(() => {
    document.addEventListener('visibilitychange', logTabSwitch)

    return () => {
      document.removeEventListener('visibilitychange', logTabSwitch)
    }
  }, [logTabSwitch])

  return {
    isVisible,
    ...tabSwitchData,
    focusWarning,
    setFocusWarning,
  }
}
