import React from 'react'
import AdminManagement from './AdminManagement'
import DisqualificationManager from './DisqualificationManager'

const AdminOperations = () => {
  return (
    <div className="admin-operations-page">
      <section className="admin-section">
        <AdminManagement />
      </section>

      <section className="admin-section">
        <DisqualificationManager />
      </section>
    </div>
  )
}

export default AdminOperations
