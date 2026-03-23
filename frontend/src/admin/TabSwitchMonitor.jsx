import React, { useState, useEffect } from 'react'
import { getTeamTabSwitches } from '../api/client'

const TabSwitchMonitor = ({ teamName }) => {
  const [tabSwitches, setTabSwitches] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTabSwitches = async () => {
      try {
        setLoading(true)
        const response = await getTeamTabSwitches(teamName)
        setTabSwitches(response)
        setError('')
      } catch (err) {
        setError('Failed to fetch tab switch logs')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (teamName) {
      fetchTabSwitches()
    }
  }, [teamName])

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading tab switch logs...</div>
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#e74c3c' }}>⚠️ {error}</div>
  }

  if (!tabSwitches) {
    return <div style={{ padding: '20px', color: '#888' }}>No data available</div>
  }

  const switchCount = tabSwitches.total_tab_switches

  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: switchCount > 0 ? '#fff3cd' : '#d4edda',
      border: `2px solid ${switchCount > 0 ? '#ffc107' : '#28a745'}`,
      marginTop: '12px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: switchCount > 0 ? '#856404' : '#155724' }}>
        🔍 Tab Focus Tracking
      </h4>
      
      <div style={{ marginBottom: '12px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '16px' }}>
          📊 Tab Switches: <span style={{ color: switchCount > 0 ? '#e74c3c' : '#27ae60' }}>
            {switchCount}
          </span>
        </p>
        {switchCount === 0 && (
          <p style={{ margin: '0', color: '#155724', fontSize: '14px' }}>
            ✅ No tab switches detected - fair play!
          </p>
        )}
      </div>

      {switchCount > 0 && tabSwitches.events.length > 0 && (
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
          padding: '8px'
        }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '4px', color: '#856404' }}>Event</th>
                <th style={{ textAlign: 'left', padding: '4px', color: '#856404' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {tabSwitches.events.map((event, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px', color: '#856404' }}>
                    {event.event_type === 'tab_left' ? '❌ Left Tab' : '✅ Returned'}
                  </td>
                  <td style={{ padding: '4px', color: '#856404', fontSize: '11px' }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TabSwitchMonitor
