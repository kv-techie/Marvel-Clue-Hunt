import React, { useState, useEffect } from 'react';
import { playTypeSound } from '../utils/audio';

const CHARS = '!<>-_\\/[]{}—=+*^?#________01';

const HackerText = ({ text, delay = 0 }) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    // Reset on text change
    setDisplayText('');
    
    let iteration = 0;
    let interval = null;
    
    const startAnimation = () => {
      interval = setInterval(() => {
        setDisplayText(
          text.split('')
            .map((letter, index) => {
              if (index < iteration) return letter;
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join('')
        );

        // Play subtle clicking sound during decryption
        if (iteration < text.length && Math.random() > 0.6) {
          playTypeSound();
        }

        if (iteration >= text.length) {
          clearInterval(interval);
          setDisplayText(text);
        }
        
        iteration += 1 / 3;
      }, 30);
    };

    const timeout = setTimeout(startAnimation, delay);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [text, delay]);

  return <span>{displayText || text.replace(/./g, '_')}</span>;
};

export default HackerText;
