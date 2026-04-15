import React, { useState, useEffect } from 'react'
import { generateGuestPassword, getGuestAuditLogs } from '../api/client'
import { useAuth } from '../context/AuthContext'

import '../styles/AdminComponents.css'

const GuestAccessPage = () => {
  const { user, isGuest } = useAuth()
  const [guestPIN, setGuestPIN] = useState('')
  const [guestMessage, setGuestMessage] = useState('')
  const [guestTag, setGuestTag] = useState('')
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [activeTab, setActiveTab] = useState('All')

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
    if (!guestTag.trim()) {
      setGuestMessage('❌ Please provide a name/tag for this OTP')
      return;
    }
    try {
      const response = await generateGuestPassword(user, guestTag.trim())
      setGuestPIN(response.pin)
      setGuestMessage(`✅ Temporary PIN generated for ${guestTag.trim()}`)
      setGuestTag('')
      fetchLogs()
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
    const filteredLogs = logs.filter(log => activeTab === 'All' || (log.status || 'Unknown') === activeTab);
    if (!filteredLogs || filteredLogs.length === 0) return;

    // Define CSV Headers
    const headers = ["Guest Tag", "Admin Name", "PIN Used", "Status", "Generated At", "Expires At", "IP Address", "Location", "Login Time", "Last Seen", "Session Duration (Mins)", "Violations"];
    
    // Format rows
    const rows = filteredLogs.map(log => {
      let loginTimeStr = 'N/A';
      let lastSeenStr = 'N/A';
      let diffMins = 'N/A';

      if (log.login_time) {
        const loginTime = new Date(ensureUTC(log.login_time));
        const lastSeen = new Date(ensureUTC(log.last_seen));
        diffMins = Math.round((lastSeen - loginTime) / 60000);
        loginTimeStr = loginTime.toISOString();
        lastSeenStr = lastSeen.toISOString();
      }

      const generatedAt = log.generated_at ? new Date(ensureUTC(log.generated_at)).toISOString() : 'N/A';
      const expiresAt = log.expires_at ? new Date(ensureUTC(log.expires_at)).toISOString() : 'N/A';
      
      return [
        log.guest_name,
        log.admin_name,
        log.pin_used,
        log.status || 'Unknown',
        generatedAt,
        expiresAt,
        log.ip_address || '',
        `"${log.location || ''}"`, // Handle commas in location
        loginTimeStr,
        lastSeenStr,
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
              <input
                type="text"
                className="admin-input"
                placeholder="Name / Purpose of OTP (e.g. VIP Guest)"
                value={guestTag}
                onChange={(e) => setGuestTag(e.target.value)}
                style={{ flex: 1 }}
              />
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

        {/* Status Tabs */}
        {logs.length > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-default)'
          }}>
            {['All', 'Active', 'Used', 'Expired'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 20px',
                  background: activeTab === tab ? 'var(--accent-secondary)' : 'var(--bg-glass)',
                  color: activeTab === tab ? '#101010' : 'var(--text-primary)',
                  border: `1px solid ${activeTab === tab ? 'var(--accent-secondary)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  boxShadow: activeTab === tab ? 'var(--glow-secondary)' : 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

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
                    <th>Status</th>
                    <th>Generated At</th>
                    <th>Expires At</th>
                    <th>IP & Location</th>
                    <th>Login Time</th>
                    <th>Session Duration</th>
                    <th>Logout Time</th>
                    <th>Violations</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.filter(log => activeTab === 'All' || (log.status || 'Unknown') === activeTab).map((log) => {
                    let loginTimeRender = 'N/A';
                    let lastSeenRender = 'N/A';
                    let diffMinsRender = 'N/A';

                    if (log.login_time) {
                      const loginTime = new Date(ensureUTC(log.login_time))
                      const lastSeen = new Date(ensureUTC(log.last_seen))
                      const diffMins = Math.round((lastSeen - loginTime) / 60000)
                      loginTimeRender = `${loginTime.toLocaleDateString()} ${loginTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                      lastSeenRender = `${lastSeen.toLocaleDateString()} ${lastSeen.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                      diffMinsRender = diffMins === 0 ? '< 1 min' : `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
                    }

                    const violations = log.violations || 0;
                    
                    let statusBadgeClass = "badge badge-secondary";
                    if (log.status === 'Active') statusBadgeClass = "badge badge-success";
                    else if (log.status === 'Expired') statusBadgeClass = "badge badge-danger";
                    else if (log.status === 'Used') statusBadgeClass = "badge badge-info";

                    return (
                      <tr key={log.session_id}>
                        <td>
                          <strong>{log.guest_name}</strong><br />
                          <small className="admin-text-muted">Generated by: {log.admin_name}</small>
                        </td>
                        <td><span className="badge badge-warning">{log.pin_used}</span></td>
                        <td><span className={statusBadgeClass}>{log.status || 'Unknown'}</span></td>
                        <td>
                          {log.generated_at ? (
                            <>
                              {new Date(ensureUTC(log.generated_at)).toLocaleDateString()} <br/>
                              <small className="admin-text-muted">{new Date(ensureUTC(log.generated_at)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                            </>
                          ) : 'N/A'}
                        </td>
                        <td>
                          {log.expires_at ? (
                            <>
                              {new Date(ensureUTC(log.expires_at)).toLocaleDateString()} <br/>
                              <small className="admin-text-muted">{new Date(ensureUTC(log.expires_at)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                            </>
                          ) : 'N/A'}
                        </td>
                        <td>
                          {log.ip_address !== "N/A" ? (
                            <>
                              {log.ip_address}<br />
                              <small className="admin-text-muted">📍 {log.location}</small>
                            </>
                          ) : (
                            <span className="admin-text-muted">Waiting for login</span>
                          )}
                        </td>
                        <td>
                          {loginTimeRender}
                        </td>
                        <td>
                          {diffMinsRender}
                        </td>
                        <td>
                          {lastSeenRender}
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
