import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import sounds from '../utils/sounds';
import './NightResults.css';

function NightResults({ game, killedPlayer, onContinue }) {
  const { user } = useAuth();
  const [show, setShow] = useState(true);
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (!soundPlayed.current) {
      if (killedPlayer) {
        sounds.death();
      }
      soundPlayed.current = true;
    }
  }, [killedPlayer]);
  
  const alivePlayers = Object.values(game.players || {}).filter(p => p.isAlive).sort((a, b) => a.name.localeCompare(b.name));
  const deadPlayers = Object.values(game.players || {}).filter(p => !p.isAlive).sort((a, b) => a.name.localeCompare(b.name));
  
  const currentPlayer = game.players?.[user?.uid];
  const isDetective = currentPlayer?.role === 'detective';
  
  const getInvestigationResult = () => {
    if (!isDetective || !game.lastActions) return null;
    
    const detectiveAction = game.lastActions[user.uid];
    if (!detectiveAction?.targetId) return null;
    
    const investigatedPlayer = game.players[detectiveAction.targetId];
    if (!investigatedPlayer) return null;
    
    return {
      name: investigatedPlayer.name,
      role: investigatedPlayer.role,
      isMafia: investigatedPlayer.role === 'mafia'
    };
  };
  
  const investigationResult = getInvestigationResult();

  const handleContinue = () => {
    setShow(false);
    if (onContinue) onContinue();
  };

  if (!show) return null;

  return (
    <div className="night-results-container">
      <div className="night-results-content">
        <div className="phase-badge">☀️ Round {game.round} - DAY</div>
        
        <h1 className="results-title">☀️ The Sun Rises...</h1>
        
        <div className="death-announcement">
          {killedPlayer ? (
            <>
              <div className="coffin-icon">⚰️</div>
              <h2 className="killed-name">{killedPlayer.name} was killed!</h2>
              {game.settings?.revealOnDeath && (
                <p className="killed-role">They were a {killedPlayer.role}</p>
              )}
            </>
          ) : (
            <>
              <div className="safe-icon">🌅</div>
              <h2 className="safe-text">No one died tonight!</h2>
              <p className="safe-subtext">The doctor may have saved someone...</p>
            </>
          )}
        </div>

        {investigationResult && (
          <div className="investigation-result">
            <div className="investigation-icon">🔍</div>
            <h3>Your Investigation:</h3>
            <p>
              <strong>{investigationResult.name}</strong> is{' '}
              <span className={investigationResult.isMafia ? 'mafia-result' : 'innocent-result'}>
                {investigationResult.isMafia ? 'MAFIA! 😈' : `a ${investigationResult.role}`}
              </span>
            </p>
          </div>
        )}

        <div className="players-status">
          <h3>Alive Players: {alivePlayers.length}</h3>
          <div className="alive-players">
            {alivePlayers.map(p => (
              <span key={p.uid} className="player-tag" style={{ borderColor: p.color }}>
                {p.name}
              </span>
            ))}
          </div>
          
          {deadPlayers.length > 0 && (
            <>
              <div className="divider" />
              <div className="dead-players">
                {deadPlayers.map(p => (
                  <span key={p.uid} className="player-tag dead">
                    ❌ {p.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="btn-continue" onClick={handleContinue}>
          Start Discussion
        </button>
      </div>
    </div>
  );
}

export default NightResults;

