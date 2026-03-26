import React, { useEffect, useRef, useState } from 'react';
import '../styles/HackerText.css';

const GLYPHS = 'ΩΨΣΔΛΞΠΦ◊∞⟡⬡▲●0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const HackerText = ({ text = '', speed = 30, delay = 0, className = '', onComplete }) => {
  const [displayChars, setDisplayChars] = useState([]);
  const resolvedRef = useRef(new Set());
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!text) return;

    const chars = text.split('');
    resolvedRef.current = new Set();
    startTimeRef.current = null;

    // Initialize all chars as scrambled
    setDisplayChars(
      chars.map((ch) =>
        ch === ' '
          ? { char: ' ', resolved: true }
          : { char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], resolved: false }
      )
    );

    const delayMs = delay;
    let delayTimer = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      const newDisplay = chars.map((ch, i) => {
        if (ch === ' ') return { char: ' ', resolved: true };
        if (resolvedRef.current.has(i)) return { char: ch, resolved: true };

        // Resolve characters progressively based on elapsed time
        const resolveAt = (i / chars.length) * chars.length * speed;
        if (elapsed > resolveAt) {
          resolvedRef.current.add(i);
          return { char: ch, resolved: true };
        }

        // Still scrambling
        return {
          char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          resolved: false,
        };
      });

      setDisplayChars(newDisplay);

      if (resolvedRef.current.size < chars.filter((c) => c !== ' ').length) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        // Fully resolved
        setDisplayChars(chars.map((ch) => ({ char: ch, resolved: true })));
        onComplete?.();
      }
    };

    delayTimer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      clearTimeout(delayTimer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text, speed, delay]);

  return (
    <span className={`hacker-text ${className}`}>
      {displayChars.map((item, i) => (
        <span
          key={i}
          className={`hacker-char ${item.resolved ? 'resolved' : 'scrambling'}`}
        >
          {item.char}
        </span>
      ))}
    </span>
  );
};

export default HackerText;
