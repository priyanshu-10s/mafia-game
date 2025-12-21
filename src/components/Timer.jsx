import { useState, useEffect } from 'react';
import { getServerTime } from '../utils/serverTime';
import './Timer.css';

function Timer({ endTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - getServerTime());
      setTimeLeft(remaining);
      
      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isLow = timeLeft > 0 && timeLeft < 30000;

  if (!endTime) {
    return (
      <div className="timer timer-loading">
        ⏱️ --:--
      </div>
    );
  }

  return (
    <div className={`timer ${isLow ? 'timer-low' : ''}`}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}

export default Timer;
