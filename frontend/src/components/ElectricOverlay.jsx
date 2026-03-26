import React, { useEffect, useRef } from 'react';
import '../styles/ElectricOverlay.css';

/**
 * Canvas2D branching lightning overlay.
 * Renders forking electric bolts that flash and fade.
 */
const ElectricOverlay = ({ color = '#00d4ff', frequency = 120 }) => {
  const canvasRef = useRef(null);
  const boltsRef = useRef([]);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate a single lightning bolt with forks
    const createBolt = () => {
      const w = canvas.width;
      const h = canvas.height;
      const startX = Math.random() * w;
      const segments = [];
      let x = startX;
      let y = 0;
      const segCount = 12 + Math.floor(Math.random() * 10);
      const segH = h / segCount;

      for (let i = 0; i < segCount; i++) {
        const nx = x + (Math.random() - 0.5) * 80;
        const ny = y + segH;
        segments.push({ x1: x, y1: y, x2: nx, y2: ny });
        x = nx;
        y = ny;
      }

      // Fork: 30% chance of a branch from a random midpoint
      const forks = [];
      if (Math.random() > 0.7) {
        const forkIdx = Math.floor(segments.length * (0.3 + Math.random() * 0.4));
        const seg = segments[forkIdx];
        if (seg) {
          let fx = seg.x2;
          let fy = seg.y2;
          const forkLen = 3 + Math.floor(Math.random() * 5);
          for (let j = 0; j < forkLen; j++) {
            const fnx = fx + (Math.random() - 0.5) * 60 + (Math.random() > 0.5 ? 20 : -20);
            const fny = fy + segH * 0.7;
            forks.push({ x1: fx, y1: fy, x2: fnx, y2: fny });
            fx = fnx;
            fy = fny;
          }
        }
      }

      return {
        segments: [...segments, ...forks],
        life: 1.0,   // starts fully opaque
        decay: 0.04 + Math.random() * 0.06,
        width: 1.5 + Math.random() * 1.5,
      };
    };

    // Spawn bolts at interval
    const spawnInterval = setInterval(() => {
      if (Math.random() > 0.45) {
        boltsRef.current.push(createBolt());
      }
    }, frequency);

    // Render loop
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      boltsRef.current = boltsRef.current.filter((bolt) => {
        bolt.life -= bolt.decay;
        if (bolt.life <= 0) return false;

        ctx.save();
        ctx.globalAlpha = bolt.life;
        ctx.strokeStyle = color;
        ctx.lineWidth = bolt.width;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 + bolt.life * 15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        bolt.segments.forEach((seg, i) => {
          if (i === 0) ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        });
        ctx.stroke();

        // Draw a thinner inner core for brightness
        ctx.globalAlpha = bolt.life * 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = bolt.width * 0.4;
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.restore();
        return true;
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(spawnInterval);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [color, frequency]);

  return (
    <div className="electric-overlay">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default ElectricOverlay;
