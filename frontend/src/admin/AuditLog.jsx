import React, { useState, useEffect } from 'react'
import { getAdjustmentsLog } from '../api/client'

// Utility function to convert data to CSV format
const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  let csv = headers.join(',') + '\n'
  
  // Add rows
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header]
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = ''
      }
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (typeof value === 'string') {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = '"' + value.replace(/"/g, '""') + '"'
        }
      }
      return value
    })
    csv += values.join(',') + '\n'
  });

  // Create blob and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const AuditLog = () => {
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, reward, deduct

  const fetchAdjustments = async () => {
    try {
      const response = await getAdjustmentsLog()
      setAdjustments(response.data.adjustments)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch adjustments log:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdjustments()
    const interval = setInterval(fetchAdjustments, 2000) // Refresh every 2 seconds for instant feedback
    return () => clearInterval(interval)
  }, [])

  const filteredAdjustments =
    filter === 'all'
      ? adjustments
      : adjustments.filter((adj) => adj.adjustment_type === filter)

  const handleExportAuditLog = () => {
    const exportData = filteredAdjustments.map(adjustment => ({
      'Timestamp': new Date(adjustment.timestamp).toLocaleString(),
      'Team': adjustment.team_name,
      'Adjusted By': adjustment.adjusted_by,
      'Type': adjustment.adjustment_type === 'reward' ? 'Reward' : 'Deduction',
      'Amount': adjustment.adjustment_type === 'reward' ? '+' + adjustment.amount : '-' + adjustment.amount,
      'Reason': adjustment.reason
    }))

    const timestamp = new Date().toISOString().split('T')[0]
    const filterSuffix = filter === 'all' ? 'all' : filter
    downloadCSV(exportData, `audit_log_${filterSuffix}_${timestamp}.csv`)
  }

  if (loading) {
    return <div>Loading audit log...</div>
  }

  return (
    <div>
      <h2>📊 Points Adjustment Audit Log</h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px' }}
        >
          All ({adjustments.length})
        </button>
        <button
          onClick={() => setFilter('reward')}
          className={`btn ${filter === 'reward' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px' }}
        >
          Rewards ({adjustments.filter((a) => a.adjustment_type === 'reward').length})
        </button>
        <button
          onClick={() => setFilter('deduct')}
          className={`btn ${filter === 'deduct' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px' }}
        >
          Deductions ({adjustments.filter((a) => a.adjustment_type === 'deduct').length})
        </button>
        <button
          onClick={handleExportAuditLog}
          style={{
            padding: '8px 16px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginLeft: 'auto'
          }}
        >
          📥 Download as CSV
        </button>
      </div>

      {filteredAdjustments.length === 0 ? (
        <div style={{ color: '#bbb', padding: '20px', textAlign: 'center' }}>
          No adjustments recorded yet
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #444' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Team</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Adjusted By</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdjustments.map((adjustment, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    {new Date(adjustment.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {adjustment.team_name}
                  </td>
                  <td style={{ padding: '12px' }}>{adjustment.adjusted_by}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          adjustment.adjustment_type === 'reward'
                            ? 'rgba(46, 204, 113, 0.3)'
                            : 'rgba(231, 76, 60, 0.3)',
                        color:
                          adjustment.adjustment_type === 'reward'
                            ? '#2ecc71'
                            : '#e74c3c',
                        fontWeight: 'bold',
                      }}
                    >
                      {adjustment.adjustment_type === 'reward' ? '➕ Reward' : '➖ Deduct'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color:
                        adjustment.adjustment_type === 'reward'
                          ? '#2ecc71'
                          : '#e74c3c',
                    }}
                  >
                    {adjustment.adjustment_type === 'reward' ? '+' : '-'}
                    {adjustment.amount}
                  </td>
                  <td style={{ padding: '12px', color: '#aaa' }}>
                    {adjustment.reason}
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

export default AuditLog
