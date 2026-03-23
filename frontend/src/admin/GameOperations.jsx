import React from 'react'
import AdminDashboard from './AdminDashboard'
import TeamDistribution from './TeamDistribution'
import GlobalTimerControl from './GlobalTimerControl'
import StoneReassignment from './StoneReassignment'
import AuditLog from './AuditLog'

const GameOperations = () => {
  return (
    <div className="game-operations-page">
      <section className="admin-section">
        <AdminDashboard />
      </section>

      <section className="admin-section">
        <TeamDistribution />
      </section>

      <section className="admin-section">
        <StoneReassignment />
      </section>

      <section className="admin-section">
        <GlobalTimerControl />
      </section>

      <section className="admin-section">
        <AuditLog />
      </section>
    </div>
  )
}

export default GameOperations
