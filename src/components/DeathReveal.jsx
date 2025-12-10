import { useEffect, useRef } from 'react';
import sounds from '../utils/sounds';
import './DeathReveal.css';

function DeathReveal({ player, eliminatedBy, onContinue }) {
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (!soundPlayed.current) {
      sounds.death();
      soundPlayed.current = true;
    }
  }, []);

  const getMessage = () => {
    if (eliminatedBy === 'mafia') {
      return 'You were killed by the Mafia during the night...';
    } else if (eliminatedBy === 'vote') {
      return 'The town voted to eliminate you...';
    } else if (eliminatedBy === 'inactive') {
      return 'You were removed for inactivity...';
    }
    return 'You have been eliminated...';
  };

  return (
    <div className="death-reveal-container">
      <div className="death-reveal-content">
        <div className="death-icon">💀</div>
        
        <h1 className="death-title">You Died</h1>
        
        <p className="death-message">{getMessage()}</p>
        
        <div className="player-info">
          <span className="player-name" style={{ borderColor: player.color }}>
            {player.name}
          </span>
          <span className="player-role">
            {player.role === 'mafia' ? '🔪 Mafia' : 
             player.role === 'detective' ? '🔍 Detective' : 
             player.role === 'doctor' ? '💉 Doctor' : 
             '👤 Villager'}
          </span>
        </div>

        <p className="spectator-note">
          You can continue to spectate the game
        </p>

        <button className="btn-continue" onClick={onContinue}>
          Continue as Spectator
        </button>
      </div>
    </div>
  );
}

export default DeathReveal;

