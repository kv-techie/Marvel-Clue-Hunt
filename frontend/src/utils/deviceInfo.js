/**
 * Device Information Utility with Fingerprinting
 * Captures and generates device metadata for authentication and tracking
 * Includes fingerprinting to prevent duplicates when localStorage is cleared
 */

/**
 * Generate a UUID v4
 * @returns {string} UUID in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a semi-persistent device fingerprint
 * This helps identify the same device even if localStorage is cleared
 * @returns {string} Fingerprint hash
 */
function generateDeviceFingerprint() {
  try {
    // Collect stable device characteristics
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages ? navigator.languages.join(',') : '',
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      screenResolution: `${screen.width}x${screen.height}`,
      availableResolution: `${screen.availWidth}x${screen.availHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navigator.deviceMemory || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      vendor: navigator.vendor || '',
      doNotTrack: navigator.doNotTrack || 'unknown',
    };

    // Add canvas fingerprint for additional uniqueness
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('DeviceFingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('DeviceFingerprint', 4, 17);
      fingerprint.canvasFingerprint = canvas.toDataURL();
    } catch (e) {
      fingerprint.canvasFingerprint = 'unsupported';
    }

    // Create hash from fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    let hash = 0;
    
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Return fingerprint ID
    return `fp-${Math.abs(hash).toString(36)}`;
  } catch (error) {
    console.error('Fingerprint generation failed:', error);
    // Fallback to simple fingerprint
    return `fp-${Date.now().toString(36)}`;
  }
}

/**
 * Detect browser name from user agent
 * @returns {string} Browser name
 */
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  
  // Check for specific browsers (order matters - check more specific first)
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
  
  return 'Unknown Browser';
}

/**
 * Detect operating system from user agent and platform
 * @returns {string} OS name
 */
function getOSInfo() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Mobile OS detection (check first as they can contain desktop strings)
  if (/Android/i.test(userAgent)) {
    // Try to get Android version
    const match = userAgent.match(/Android\s([0-9.]+)/);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/iPod/i.test(userAgent)) return 'iPod';
  
  // Desktop OS detection
  if (/Win/i.test(platform)) {
    if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
    if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
    if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
    return 'Windows';
  }
  if (/Mac/i.test(platform)) return 'macOS';
  if (/Linux/i.test(platform)) return 'Linux';
  
  return 'Unknown OS';
}

/**
 * Get device type based on screen size and user agent
 * @returns {string} Device type (Mobile, Tablet, Desktop)
 */
function getDeviceType() {
  const width = window.screen.width;
  const userAgent = navigator.userAgent;
  
  // Check for mobile/tablet indicators in user agent
  if (/Mobile|Android|iPhone|iPod/i.test(userAgent)) {
    return 'Mobile';
  }
  if (/iPad|Tablet/i.test(userAgent)) {
    return 'Tablet';
  }
  
  // Fallback to screen size detection
  if (width < 768) return 'Mobile';
  if (width >= 768 && width < 1024) return 'Tablet';
  return 'Desktop';
}

/**
 * Generate a friendly device name
 * @returns {string} Device name like "Chrome on Windows" or "Safari on iPhone"
 */
function getDeviceName() {
  const browser = getBrowserInfo();
  const os = getOSInfo();
  const deviceType = getDeviceType();
  
  // For mobile devices, prefer OS name
  if (deviceType === 'Mobile' || deviceType === 'Tablet') {
    return `${browser} on ${os}`;
  }
  
  // For desktop, include device type if helpful
  return `${browser} on ${os}`;
}

/**
 * Get screen resolution
 * @returns {string} Screen resolution like "1920x1080"
 */
function getScreenResolution() {
  return `${window.screen.width}x${window.screen.height}`;
}

/**
 * Get viewport size
 * @returns {string} Viewport size like "1920x937"
 */
function getViewportSize() {
  return `${window.innerWidth}x${window.innerHeight}`;
}

/**
 * Check if device supports touch
 * @returns {boolean} True if touch is supported
 */
function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get or create device ID with fingerprint fallback
 * This prevents duplicate device registrations when localStorage is cleared
 * @returns {Object} Complete device information
 */
export function getDeviceInfo() {
  // Generate device fingerprint
  const fingerprint = generateDeviceFingerprint();
  
  // Try to get existing device ID from localStorage
  let deviceId = localStorage.getItem('device_id');
  const storedFingerprint = localStorage.getItem('device_fingerprint');
  
  if (!deviceId) {
    // No device ID in localStorage
    
    if (storedFingerprint === fingerprint) {
      // Same fingerprint exists - localStorage was cleared but device is the same
      // Try to recover device ID from fingerprint mapping
      const fingerprintMapping = localStorage.getItem('fingerprint_device_mapping');
      if (fingerprintMapping) {
        try {
          const mapping = JSON.parse(fingerprintMapping);
          if (mapping[fingerprint]) {
            deviceId = mapping[fingerprint];
            console.log('Recovered device ID from fingerprint mapping');
          }
        } catch (e) {
          console.error('Failed to parse fingerprint mapping:', e);
        }
      }
    }
    
    if (!deviceId) {
      // Generate new UUID for new device
      deviceId = generateUUID();
      console.log('Generated new device ID:', deviceId);
    }
    
    // Store device ID and fingerprint
    localStorage.setItem('device_id', deviceId);
    localStorage.setItem('device_fingerprint', fingerprint);
    
    // Store fingerprint to device ID mapping (for recovery)
    try {
      const mapping = {};
      mapping[fingerprint] = deviceId;
      localStorage.setItem('fingerprint_device_mapping', JSON.stringify(mapping));
    } catch (e) {
      console.error('Failed to store fingerprint mapping:', e);
    }
  } else {
    // Device ID exists - update fingerprint if changed
    if (storedFingerprint !== fingerprint) {
      console.log('Device fingerprint changed - updating');
      localStorage.setItem('device_fingerprint', fingerprint);
    }
  }
  
  // Collect all device information
  const deviceInfo = {
    device_id: deviceId,
    device_name: getDeviceName(),
    browser: getBrowserInfo(),
    os: getOSInfo(),
    device_type: getDeviceType(),
    screen_resolution: getScreenResolution(),
    viewport_size: getViewportSize(),
    touch_supported: isTouchDevice(),
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    registered_at: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    online: navigator.onLine,
    fingerprint: fingerprint // Include fingerprint for backend duplicate detection
  };
  
  return deviceInfo;
}

/**
 * Get minimal device info (just ID and name)
 * Use this for lightweight operations
 * @returns {Object} Minimal device info
 */
export function getMinimalDeviceInfo() {
  const fingerprint = generateDeviceFingerprint();
  let deviceId = localStorage.getItem('device_id');
  
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem('device_id', deviceId);
    localStorage.setItem('device_fingerprint', fingerprint);
  }
  
  return {
    device_id: deviceId,
    device_name: getDeviceName(),
    fingerprint: fingerprint
  };
}

/**
 * Clear device ID from storage
 * Useful for testing or logout
 */
export function clearDeviceId() {
  localStorage.removeItem('device_id');
  // Keep fingerprint and mapping for recovery
  console.log('Device ID cleared (fingerprint retained for recovery)');
}

/**
 * Clear all device data including fingerprint
 * Use with caution - will create new device on next login
 */
export function clearAllDeviceData() {
  localStorage.removeItem('device_id');
  localStorage.removeItem('device_fingerprint');
  localStorage.removeItem('fingerprint_device_mapping');
  console.log('All device data cleared');
}

/**
 * Get stored device ID without generating a new one
 * @returns {string|null} Device ID or null if not found
 */
export function getStoredDeviceId() {
  return localStorage.getItem('device_id');
}

/**
 * Check if this is a returning device
 * @returns {boolean} True if device ID exists in storage
 */
export function isReturningDevice() {
  return localStorage.getItem('device_id') !== null;
}

/**
 * Get current device fingerprint
 * @returns {string} Device fingerprint
 */
export function getCurrentFingerprint() {
  return generateDeviceFingerprint();
}

/**
 * Check if device fingerprint has changed
 * @returns {boolean} True if fingerprint changed
 */
export function hasDeviceFingerprintChanged() {
  const current = generateDeviceFingerprint();
  const stored = localStorage.getItem('device_fingerprint');
  return stored !== null && current !== stored;
}

// Default export
export default {
  getDeviceInfo,
  getMinimalDeviceInfo,
  clearDeviceId,
  clearAllDeviceData,
  getStoredDeviceId,
  isReturningDevice,
  getBrowserInfo,
  getOSInfo,
  getDeviceType,
  getDeviceName,
  getCurrentFingerprint,
  hasDeviceFingerprintChanged
};
