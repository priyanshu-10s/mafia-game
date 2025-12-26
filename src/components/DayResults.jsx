import { useState, useEffect, useRef, useMemo } from 'react';
import sounds from '../utils/sounds';
import { getPlayerRole } from '../utils/gameLogic';
import './DayResults.css';

function DayResults({ game, eliminatedPlayer, voteBreakdown, onContinue }) {
  const [show, setShow] = useState(true);
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (!soundPlayed.current) {
      // Play night transition sound
      sounds.night();
      // Also play death sound if someone was eliminated
      if (eliminatedPlayer) {
        setTimeout(() => sounds.death(), 500);
      }
      soundPlayed.current = true;
    }
  }, [eliminatedPlayer]);

  const handleContinue = () => {
    setShow(false);
    if (onContinue) onContinue();
  };

  if (!show) return null;

  const sortedVotes = Object.entries(voteBreakdown)
    .map(([uid, count]) => ({
      player: game.players[uid],
      count
    }))
    .filter(v => v.player)
    .sort((a, b) => b.count - a.count);

  // Decrypt roles for counting (only used when revealOnDeath is true)
  const aliveMafia = Object.values(game.players).filter(p => p.isAlive && getPlayerRole(p, game) === 'mafia').length;
  const aliveVillagers = Object.values(game.players).filter(p => p.isAlive && getPlayerRole(p, game) !== 'mafia').length;
  
  // Get eliminated player's decrypted role
  const eliminatedRole = eliminatedPlayer ? getPlayerRole(eliminatedPlayer, game) : null;

  return (
    <div className="day-results-container">
      <div className="day-results-content">
        <div className="phase-badge">Round {game.round} - RESULT</div>
        
        <h1 className="results-title">Voting Results</h1>
        
        <div className="elimination-announcement">
          {eliminatedPlayer ? (
            <>
              <h2 className="eliminated-name">
                {eliminatedPlayer.name} was eliminated
              </h2>
              <p className="vote-total">with {voteBreakdown[eliminatedPlayer.uid] || 0} votes</p>
              {game.settings?.revealOnDeath && eliminatedRole && (
                <div className={`role-reveal ${eliminatedRole === 'mafia' ? 'mafia' : 'villager'}`}>
                  ⚖️ They were {eliminatedRole === 'mafia' ? 'MAFIA!' : `a ${eliminatedRole}`}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="no-elimination">No one was eliminated</h2>
              <p className="vote-total">Tie in votes</p>
            </>
          )}
        </div>

        <div className="vote-breakdown">
          <h3>Vote Breakdown:</h3>
          <ul>
            {sortedVotes.map(({ player, count }) => (
              <li key={player.uid} className={player.uid === eliminatedPlayer?.uid ? 'eliminated' : ''}>
                <span className="vote-player" style={{ borderColor: player.color }}>
                  {player.name}
                </span>
                <span className="vote-count">{count} vote{count !== 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        </div>

        {game.settings?.revealOnDeath && (
          <div className="remaining-info">
            Remaining: {aliveMafia} Mafia, {aliveVillagers} Villagers
          </div>
        )}

        <button className="btn-continue" onClick={handleContinue}>
          Continue to Night
        </button>
      </div>
    </div>
  );
}

export default DayResults;

