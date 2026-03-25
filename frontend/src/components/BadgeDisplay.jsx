import React from 'react'
import { motion } from 'framer-motion'
import '../styles/BadgeDisplay.css'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', damping: 12, stiffness: 120 }
  }
}

const BadgeDisplay = ({ badges = [] }) => {
  if (!badges || badges.length === 0) {
    return null
  }

  return (
    <div className="badge-display">
      <motion.div 
        className="badges-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {badges.map((badge) => (
          <motion.div
            variants={itemVariants}
            key={badge.id}
            className="badge-card"
            title={badge.details?.name}
          >
            <div className="badge-icon">{badge.details?.icon}</div>
            <div className="badge-info">
              <div className="badge-name">{badge.details?.name}</div>
              <div className="badge-description">{badge.details?.description}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export default BadgeDisplay
