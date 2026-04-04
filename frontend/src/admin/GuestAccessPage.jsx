import React, { useState, useEffect } from 'react'
import { generateGuestPassword, getGuestAuditLogs } from '../api/client'
import { useAuth } from '../context/AuthContext'

import '../styles/AdminComponents.css'

const GuestAccessPage = () => {
  const { user, isGuest } = useAuth()
  const [guestPIN, setGuestPIN] = useState('')
  const [guestMessage, setGuestMessage] = useState('')
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const data = await getGuestAuditLogs(user)
      if (data && data.logs) {
        setLogs(data.logs)
      }
    } catch (err) {
      console.error("Failed to load logs", err)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (!isGuest) fetchLogs()
    // Poll logs every 30 seconds
    const interval = setInterval(() => {
      if (!isGuest) fetchLogs()
    }, 30000)
    return () => clearInterval(interval)
  }, [user, isGuest])

  // Guest PIN Generation

  const handleGenerateGuestPIN = async () => {
    try {
      const response = await generateGuestPassword(user)
      setGuestPIN(response.pin)
      setGuestMessage(`✅ Temporary PIN generated for ${user}`)
    } catch (err) {
      setGuestMessage(`❌ Error: ${err.response?.data?.detail || 'Failed to generate guest PIN'}`)
    }
  }

  if (isGuest) {
    return (
      <div className="admin-section">
        <h2 className="admin-section-title">🔑 Guest Access</h2>
        <div className="admin-message error" style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Access Denied</h3>
          <p>Guests cannot view or generate access logs and PINs.</p>
        </div>
      </div>
    )
  }

  const ensureUTC = (dtString) => {
    if (!dtString) return '';
    if (dtString.endsWith('Z') || dtString.includes('+') || dtString.includes('-') && dtString.split('T')[1]?.includes('-')) return dtString;
    return `${dtString}Z`;
  };

  const handleDownloadCSV = () => {
    if (!logs || logs.length === 0) return;

    // Define CSV Headers
    const headers = ["Guest Name", "Admin Name", "PIN Used", "IP Address", "Location", "Login Time", "Last Seen", "Session Duration (Mins)", "Violations"];
    
    // Format rows
    const rows = logs.map(log => {
      const loginTime = new Date(ensureUTC(log.login_time));
      const lastSeen = new Date(ensureUTC(log.last_seen));
      const diffMins = Math.round((lastSeen - loginTime) / 60000);
      
      return [
        log.guest_name,
        log.admin_name,
        log.pin_used,
        log.ip_address,
        `"${log.location}"`, // Handle commas in location
        loginTime.toISOString(),
        lastSeen.toISOString(),
        diffMins,
        log.violations || 0
      ].join(",");
    });


    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `guest_audit_logs_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-operations-page">
      {/* Generate Access Block */}
      <section className="admin-section">
        <div style={{ marginBottom: '40px' }}>
          <h2 className="admin-section-title">
            🔑 Temporary Guest Access
          </h2>
          <div className="admin-form-panel">
            <h3>Generate Temporary Access</h3>
            <p className="admin-text-muted" style={{ marginBottom: '15px' }}>
              Create a one-time-use PIN for guests to view the progress. They will have strictly view-only access.
            </p>
            <div className="admin-input-group">
              <button 
                className="admin-btn primary" 
                onClick={handleGenerateGuestPIN}
                style={{ minWidth: '200px' }}
              >
                Generate Guest PIN
              </button>
            </div>
            {guestMessage && (
              <div className={`admin-message ${guestMessage.includes('✅') ? 'success' : 'error'}`}>
                {guestMessage}
              </div>
            )}
            {guestPIN && (
              <div style={{ 
                marginTop: '15px', 
                padding: '20px', 
                background: 'rgba(0, 255, 0, 0.05)', 
                border: '1px solid var(--success)', 
                borderRadius: '12px', 
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Share this Temporary PIN
                </div>
                <div style={{ fontSize: '42px', fontWeight: 'bold', letterSpacing: '8px', color: 'var(--success)', textShadow: '0 0 10px rgba(0,255,0,0.3)' }}>
                  {guestPIN}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
                  This PIN is valid for one-time use only. It will deactivate once used for login.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Guest Audit Log Table */}
      <section className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="admin-section-title" style={{ marginBottom: 0 }}>
            📋 Guest Audit Logs
          </h2>
          {logs.length > 0 && (
            <button className="admin-btn outline-info" onClick={handleDownloadCSV} style={{ fontSize: '12px', padding: '6px 12px' }}>
              ⬇️ Download CSV
            </button>
          )}
        </div>
        <div className="admin-form-panel">
          {loadingLogs ? (
            <p className="admin-text-muted">Loading audit logs...</p>
          ) : logs.length === 0 ? (
            <p className="admin-text-muted">No guest logs found.</p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Guest Details</th>
                    <th>PIN Used</th>
                    <th>IP & Location</th>
                    <th>Login Time</th>
                    <th>Session Duration</th>
                    <th>Logout Time</th>
                    <th>Violations</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const loginTime = new Date(ensureUTC(log.login_time))
                    const lastSeen = new Date(ensureUTC(log.last_seen))
                    const diffMins = Math.round((lastSeen - loginTime) / 60000)
                    const violations = log.violations || 0;
                    
                    return (
                      <tr key={log.session_id}>
                        <td>
                          <strong>{log.guest_name}</strong><br />
                          <small className="admin-text-muted">Generated by: {log.admin_name}</small>
                        </td>
                        <td><span className="badge badge-warning">{log.pin_used}</span></td>
                        <td>
                          {log.ip_address}<br />
                          <small className="admin-text-muted">📍 {log.location}</small>
                        </td>
                        <td>
                          {loginTime.toLocaleDateString()} {loginTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td>
                          {diffMins === 0 ? '< 1 min' : `${diffMins} min${diffMins !== 1 ? 's' : ''}`}
                        </td>
                        <td>
                          {lastSeen.toLocaleDateString()} {lastSeen.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td>
                          {violations > 0 ? (
                            <span className="badge badge-danger">🚨 {violations} attempts</span>
                          ) : (
                            <span className="badge badge-success">0</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: '15px', textAlign: 'right' }}>
            <button className="admin-btn secondary" onClick={fetchLogs}>
              Refresh Logs
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default GuestAccessPage
