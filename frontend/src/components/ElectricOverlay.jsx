import React, { useEffect, useState } from 'react';
import '../styles/ElectricOverlay.css';

const ElectricOverlay = () => {
  const [bolts, setBolts] = useState([]);

  useEffect(() => {
    const generateBolt = () => {
      const id = Math.random();
      const x1 = Math.random() * 100;
      const x2 = x1 + (Math.random() - 0.5) * 20;
      const opacity = 0.5 + Math.random() * 0.5;
      
      const newBolt = { id, x1, x2, opacity };
      setBolts(prev => [...prev, newBolt]);
      
      setTimeout(() => {
        setBolts(prev => prev.filter(b => b.id !== id));
      }, 150);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        generateBolt();
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="electric-overlay">
      <svg width="100%" height="100%" preserveAspectRatio="none">
        {bolts.map(bolt => (
          <line
            key={bolt.id}
            x1={`${bolt.x1}%`}
            y1="0"
            x2={`${bolt.x2}%`}
            y2="100%"
            stroke="cyan"
            strokeWidth="2"
            strokeOpacity={bolt.opacity}
            filter="drop-shadow(0 0 8px cyan)"
          />
        ))}
      </svg>
    </div>
  );
};

export default ElectricOverlay;
