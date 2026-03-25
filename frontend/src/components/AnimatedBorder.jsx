import React from 'react';
import '../styles/AnimatedBorder.css';

const AnimatedBorder = ({ children, className = '', isOvercharged = false }) => {
  return (
    <div className={`animated-border-wrapper ${isOvercharged ? 'overcharged' : ''} ${className}`}>
      <div className="animated-border-box"></div>
      <div className="animated-border-content">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBorder;
