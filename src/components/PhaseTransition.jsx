import { useState, useEffect } from 'react';
import sounds from '../utils/sounds';
import './PhaseTransition.css';

function PhaseTransition({ phase, onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Play phase sound
    if (phase === 'night') {
      sounds.night();
    } else if (phase === 'day') {
      sounds.day();
    }

    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  if (!visible) return null;

  const isNight = phase === 'night';

  return (
    <div className={`phase-transition ${isNight ? 'night' : 'day'}`}>
      <div className="phase-transition-content">
        <div className="phase-icon">
          {isNight ? '🌙' : '☀️'}
        </div>
        <h1 className="phase-text">
          {isNight ? 'Night Falls...' : 'The Sun Rises...'}
        </h1>
        <p className="phase-subtext">
          {isNight ? 'The town sleeps' : 'Time for discussion'}
        </p>
      </div>
    </div>
  );
}

export default PhaseTransition;

