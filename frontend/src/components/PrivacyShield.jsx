import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendGuestHeartbeat, logGuestViolation } from '../api/client';

import '../styles/PrivacyShield.css';


/**
 * PrivacyShield Component
 * Implements security measures for guests:
 * - Blurs content when window loses focus
 * - Disables right-click and text selection
 * - Blocks common screenshot/dev-tool shortcuts
 */
const PrivacyShield = ({ children }) => {
  const { sessionId } = useAuth();
  const lastViolationTime = useRef(0);

  useEffect(() => {

    const content = document.getElementById('privacy-protected-content');
    const overlay = document.getElementById('privacy-alert-overlay');


    const triggerShield = (isViolation = false) => {
      if (content) content.style.opacity = '0';
      if (overlay) overlay.style.display = 'flex';
      
      // Throttle violation logging to once every 2 seconds to prevent spam
      if (isViolation && sessionId) {
        const now = Date.now();
        if (now - lastViolationTime.current > 2000) {
          lastViolationTime.current = now;
          logGuestViolation(sessionId).catch(e => console.error("Failed to log violation", e));
        }
      }
    };

    const removeShield = () => {
      if (content) content.style.opacity = '1';
      if (overlay) overlay.style.display = 'none';
    };

    const handleBlur = () => triggerShield(false);
    const handleFocus = () => removeShield();
    
    const handleVisibilityChange = () => {
      if (document.hidden) triggerShield(false);
      else removeShield();
    };


    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('focusout', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleKeyDown = (e) => {
      // Immediate synchronous execution
      if (
        e.key === 'PrintScreen' || 
        e.keyCode === 44 || 
        e.key === 'Meta' || e.key === 'OS' || 
        e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt'
      ) {
        triggerShield(true);
      }

      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'p') ||
        (e.ctrlKey && e.key === 'c') // Block copy shortcut explicitly
      ) {
        e.preventDefault();
        triggerShield(true);
      }
    };


    const handleKeyUp = (e) => {
      if (['Meta', 'OS', 'Shift', 'Control', 'Alt', 'PrintScreen'].includes(e.key)) {
        if (document.hasFocus()) {
           setTimeout(removeShield, 500); // Wait a tiny bit before revealing again
        }
      }
    };

    // Block copy events
    const handleCopy = (e) => {
      e.preventDefault();
      e.clipboardData.setData('text/plain', 'Data copying is disabled.');
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('copy', handleCopy);

    // Initial check
    if (!document.hasFocus()) triggerShield(false);


    // Heartbeat logic
    let heartbeatInterval = null;
    if (sessionId) {
      heartbeatInterval = setInterval(() => {
        sendGuestHeartbeat(sessionId).catch(e => console.error("Heartbeat failed", e));
      }, 15000); // every 15s
    }

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('focusout', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [sessionId]);


  return (
    <div 
      className="privacy-shield-container"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Main Content */}
      <div id="privacy-protected-content" className="privacy-content-wrapper" style={{ transition: 'none' }}>
        {children}
      </div>

      {/* Security Overlay */}
      <div id="privacy-alert-overlay" className="privacy-blur-overlay" style={{ display: 'none' }}>
        <div className="privacy-message">
          <h2>PRIVACY ALERT</h2>
          <p>Access restricted while window is inactive to protect sensitive game data.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyShield;
