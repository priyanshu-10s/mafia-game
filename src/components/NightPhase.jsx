import { useState, useEffect } from 'react';
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
  const [submitted, setSubmitted] = useState(false);

  const alivePlayers = Object.values(game.players || {}).filter(p => p.isAlive && p.uid !== user.uid);
  const roleInfo = ROLE_INFO[player.role] || ROLE_INFO.villager;
  const hasAction = ['mafia', 'detective', 'doctor'].includes(player.role);
  const isMafia = player.role === 'mafia';

  const mafiaMembers = isMafia 
    ? Object.values(game.players || {}).filter(p => p.role === 'mafia' && p.uid !== user.uid && p.isAlive)
    : [];

  const actions = game.actions || {};
  const aliveCount = Object.values(game.players || {}).filter(p => p.isAlive).length;
  const votedCount = Object.keys(actions).length;
  const waitingCount = aliveCount - votedCount;

  useEffect(() => {
    if (actions[user.uid]) {
      setSubmitted(true);
      setSelectedTarget(actions[user.uid].targetId);
    }
  }, [actions, user.uid]);

  const getMafiaVotes = () => {
    if (!isMafia) return [];
    return mafiaMembers.map(m => {
      const action = actions[m.uid];
      return {
        player: m,
        targetId: action?.targetId,
        targetName: action?.targetId ? game.players[action.targetId]?.name : null
      };
    });
  };

  const getRandomPartnerVote = () => {
    if (isMafia) return null;
    
    const otherAlivePlayers = Object.values(game.players || {}).filter(
      p => p.isAlive && p.uid !== user.uid
    );
    
    if (otherAlivePlayers.length === 0) return null;
    
    const seedIndex = (game.round || 1) + user.uid.charCodeAt(0);
    const randomIndex = seedIndex % otherAlivePlayers.length;
    const randomPartner = otherAlivePlayers[randomIndex];
    
    const partnerAction = actions[randomPartner?.uid];
    if (!partnerAction?.targetId) return null;
    
    return {
      player: randomPartner,
      targetId: partnerAction.targetId,
      targetName: game.players[partnerAction.targetId]?.name
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

  const handleSubmit = async () => {
    if (!selectedTarget && hasAction) return;

    try {
      await gameService.submitAction(user.uid, player.role, selectedTarget || 'skip');
      setSubmitted(true);
    } catch (error) {
      console.error('Submit action error:', error);
      alert(error.message || 'Failed to submit action');
    }
  };

  const mafiaVotes = getMafiaVotes();
  const randomPartnerVote = getRandomPartnerVote();

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
                  onClick={() => !submitted && setSelectedTarget(p.uid)}
                  disabled={submitted}
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
        </div>

        <div className="vote-status">
          {selectedTarget && (
            <div className="your-vote">
              Your Vote: <strong>{game.players[selectedTarget]?.name}</strong>
            </div>
          )}
          
          {isMafia && mafiaVotes.length > 0 && (
            <div className="mafia-votes">
              {mafiaVotes.map(({ player: m, targetName }) => (
                <div key={m.uid} className="mafia-vote-item">
                  <span className="vote-color" style={{ backgroundColor: m.color }} />
                  <span>{m.name}</span>
                  <span className="vote-arrow">→</span>
                  <span>{targetName || "hasn't voted yet"}</span>
                </div>
              ))}
            </div>
          )}
          
          {!isMafia && randomPartnerVote && (
            <div className="partner-vote">
              <span className="vote-color" style={{ backgroundColor: randomPartnerVote.player.color }} />
              <span>{randomPartnerVote.player.name}</span>
              <span className="vote-arrow">→</span>
              <span>{randomPartnerVote.targetName}</span>
            </div>
          )}
        </div>

        <div className="action-area">
          {waitingCount > 0 && waitingCount <= 3 && submitted && (
            <div className="waiting-status">
              ⚡ Waiting for {waitingCount} player{waitingCount > 1 ? 's' : ''}...
            </div>
          )}
          
          {!submitted ? (
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={hasAction && !selectedTarget}
            >
              Confirm {roleInfo.action}
            </button>
          ) : (
            <div className="submitted-message">
              ✓ Action submitted. Waiting for others...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NightPhase;
