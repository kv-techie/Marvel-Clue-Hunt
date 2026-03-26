import React from 'react';
import HackerText from './HackerText';
import '../styles/MarvelLoader.css';

const STONES = [
  { color: '#e74c3c', name: 'Reality', delay: 0 },
  { color: '#f39c12', name: 'Soul',    delay: 0.33 },
  { color: '#f1c40f', name: 'Mind',    delay: 0.66 },
  { color: '#2ecc71', name: 'Time',    delay: 1.0 },
  { color: '#ff7a59', name: 'Space',   delay: 1.33 },
  { color: '#9b59b6', name: 'Power',   delay: 1.66 },
];

const MarvelLoader = ({ text = 'Assembling the interface...' }) => (
  <div className="marvel-loader">
    {/* Ambient background glow */}
    <div className="ml-ambient" />

    {/* Orbit ring */}
    <div className="ml-orbit-container">
      <div className="ml-core" />
      <div className="ml-core-ring" />

      {STONES.map((stone, i) => (
        <div
          key={stone.name}
          className="ml-stone-orbit"
          style={{
            '--stone-color': stone.color,
            '--orbit-delay': `${stone.delay}s`,
            '--orbit-index': i,
          }}
        >
          <div className="ml-stone">
            <div className="ml-stone-trail" />
          </div>
        </div>
      ))}
    </div>

    <p className="ml-text">
      <HackerText text={text} speed={40} />
    </p>
  </div>
);

export default MarvelLoader;
