import { useEffect, useRef, useMemo } from 'react';
import sounds from '../utils/sounds';
import { getPlayerRole } from '../utils/gameLogic';
import './DeathReveal.css';

function DeathReveal({ player, game, eliminatedBy, onContinue }) {
  const soundPlayed = useRef(false);
  
  // Decrypt the player's role
  const myRole = useMemo(() => getPlayerRole(player, game), [player, game]);

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
            {myRole === 'mafia' ? '🔪 Mafia' : 
             myRole === 'detective' ? '🔍 Detective' : 
             myRole === 'doctor' ? '💉 Doctor' : 
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

