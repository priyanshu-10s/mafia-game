import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import Timer from './Timer';
import './NightPhase.css';

const ROLE_INFO = {
  mafia: { name: 'Mafia', emoji: '🔫', action: 'Eliminate' },
  detective: { name: 'Detective', emoji: '🔍', action: 'Investigate' },
  doctor: { name: 'Doctor', emoji: '💉', action: 'Save' },
  villager: { name: 'Villager', emoji: '👤', action: 'Vote' }
};

function NightPhase({ game, player }) {
  const { user } = useAuth();
  const [showRole, setShowRole] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const alivePlayers = Object.values(game.players || {})
    .filter(p => p.isAlive && p.uid !== user.uid)
    .sort((a, b) => a.name.localeCompare(b.name));
  const roleInfo = ROLE_INFO[player.role] || ROLE_INFO.villager;
  const isMafia = player.role === 'mafia';

  const mafiaMembers = isMafia 
    ? Object.values(game.players || {}).filter(p => p.role === 'mafia' && p.uid !== user.uid && p.isAlive)
    : [];

  const actions = game.actions || {};
  const aliveCount = Object.values(game.players || {}).filter(p => p.isAlive).length;
  const actedCount = Object.keys(actions).length;
  const waitingCount = aliveCount - actedCount;
  const hasVoted = !!actions[user.uid];

  useEffect(() => {
    const myAction = actions[user.uid];
    if (myAction) {
      setSelectedTarget(myAction.targetId);
    } else {
      setSelectedTarget(null);  // Reset when action is removed
    }
  }, [actions, user.uid]);

  const submitAction = useCallback(async (targetId) => {
    try {
      console.log('Submitting action:', targetId);
      await gameService.submitAction(user.uid, player.role, targetId);
      console.log('Action saved successfully:', targetId);
    } catch (error) {
      console.error('Submit action error:', error);
      alert('Failed to save action: ' + error.message);
    }
  }, [user.uid, player.role]);

  const handleSelectPlayer = async (playerId) => {
    setSelectedTarget(playerId);
    await submitAction(playerId);
  };

  const handleNoVote = async () => {
    setSelectedTarget('skip');
    await submitAction('skip');
  };

  const getRandomPartnerVote = () => {
    if (isMafia) return null;
    
    // Only show fake votes if there are 2+ mafia (to match mafia experience)
    const numMafia = game.settings?.numMafia || 2;
    if (numMafia < 2) return null;
    
    const otherAlivePlayers = Object.values(game.players || {}).filter(
      p => p.isAlive && p.uid !== user.uid
    );
    
    if (otherAlivePlayers.length < 2) return null;
    
    // Generate deterministic but FAKE random values based on user + round
    // This is completely random - not based on any real votes
    const seed = (game.round || 1) * 1000 + user.uid.charCodeAt(0) + (user.uid.charCodeAt(1) || 0);
    
    // Pick a random "fake partner" (just for their color)
    const partnerIndex = seed % otherAlivePlayers.length;
    const fakePartner = otherAlivePlayers[partnerIndex];
    
    // Pick a random target (different from fake partner)
    const possibleTargets = otherAlivePlayers.filter(p => p.uid !== fakePartner.uid);
    if (possibleTargets.length === 0) return null;
    
    const targetIndex = (seed * 7) % possibleTargets.length;
    const fakeTarget = possibleTargets[targetIndex];
    
    return {
      player: fakePartner,
      targetId: fakeTarget.uid,
      targetName: fakeTarget.name
    };
  };

  const getVoteIndicators = (playerId) => {
    if (isMafia) {
      return Object.entries(actions)
        .filter(([uid, action]) => {
          const p = game.players[uid];
          return p?.role === 'mafia' && action.targetId === playerId;
        })
        .map(([uid]) => game.players[uid]?.color)
        .filter(Boolean);
    } else {
      const partnerVote = getRandomPartnerVote();
      if (partnerVote && partnerVote.targetId === playerId) {
        return [partnerVote.player.color];
      }
      return [];
    }
  };

  return (
    <div className="night-phase-container">
      <div className="night-phase-content">
        <div className="phase-header">
          <div className="phase-info">
            <span className="round-badge">Round {game.round}</span>
            <span className="phase-name">🌙 NIGHT</span>
          </div>
          <Timer endTime={game.nightEndTime} />
        </div>

        <h1 className="phase-title">🌙 The Town Sleeps...</h1>

        <div className="role-toggle">
          <button 
            className={`btn-toggle ${showRole ? 'active' : ''}`}
            onClick={() => setShowRole(!showRole)}
          >
            {showRole ? '👁️ Hide Role' : '👁️‍🗨️ Show Role'}
          </button>
        </div>

        {showRole && (
          <div className="role-info-card">
            <div className="role-emoji">{roleInfo.emoji}</div>
            <div className="role-name">{roleInfo.name}</div>
            <div className="role-action">{roleInfo.action}</div>
            {isMafia && mafiaMembers.length > 0 && (
              <div className="mafia-team">
                <p>Fellow Mafia:</p>
                {mafiaMembers.map(m => (
                  <span key={m.uid} className="mafia-member" style={{ borderColor: m.color }}>
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="target-selection">
          <h2 className="selection-title">Choose a player:</h2>

          <div className="players-grid">
            {alivePlayers.map((p) => {
              const votes = getVoteIndicators(p.uid);
              const isSelected = selectedTarget === p.uid;
              
              return (
                <button
                  key={p.uid}
                  className={`player-card ${isSelected ? 'selected' : ''}`}
                  style={{ borderColor: p.color }}
                  onClick={() => handleSelectPlayer(p.uid)}
                >
                  {p.photoURL && (
                    <img src={p.photoURL} alt={p.name} className="player-avatar" />
                  )}
                  <div className="player-name">{p.name}</div>
                  {votes.length > 0 && (
                    <div className="vote-indicators">
                      {votes.map((color, idx) => (
                        <span key={idx} className="vote-dot" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}
                  {isSelected && <div className="selected-indicator">✓</div>}
                </button>
              );
            })}
          </div>

          {selectedTarget && (
            <button 
              className="btn-no-vote"
              onClick={handleNoVote}
            >
              🚫 Undo Vote
            </button>
          )}
        </div>

        <div className="vote-status">
          {selectedTarget && (
            <div className="your-vote">
              Your Vote: <strong>{game.players[selectedTarget]?.name}</strong>
            </div>
          )}
          {!selectedTarget && (
            <div className="your-vote not-voted">
              You haven't voted yet
            </div>
          )}
        </div>

        <div className="action-area">
          <div className="vote-count-status">
            Voted: {actedCount}/{aliveCount}
            {waitingCount > 0 && hasVoted && (
              <span className="waiting-flash"> ⚡ Waiting for {waitingCount}...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NightPhase;
