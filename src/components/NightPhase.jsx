import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
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

  useEffect(() => {
    if (game.actions && game.actions[user.uid]) {
      setSubmitted(true);
      setSelectedTarget(game.actions[user.uid].targetId);
    }
  }, [game.actions, user.uid]);

  const handleSubmit = async () => {
    if (!selectedTarget && hasAction) return;

    try {
      if (hasAction) {
        await gameService.submitAction(user.uid, player.role, selectedTarget);
      } else {
        await gameService.submitAction(user.uid, 'vote', selectedTarget || null);
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Submit action error:', error);
      alert(error.message || 'Failed to submit action');
    }
  };

  return (
    <div className="night-phase-container">
      <div className="night-phase-content">
        <h1 className="phase-title">🌙 Night Phase</h1>
        <p className="phase-subtitle">Round {game.round}</p>

        <div className="role-toggle">
          <button 
            className={`btn-toggle ${showRole ? 'active' : ''}`}
            onClick={() => setShowRole(!showRole)}
          >
            {showRole ? '👁️ Hide' : '👁️‍🗨️ Show'} Role
          </button>
        </div>

        {showRole && (
          <div className="role-info-card">
            <div className="role-emoji">{roleInfo.emoji}</div>
            <div className="role-name">{roleInfo.name}</div>
            <div className="role-action">{roleInfo.action}</div>
          </div>
        )}

        <div className="target-selection">
          <h2 className="selection-title">
            {hasAction ? `Select target to ${roleInfo.action.toLowerCase()}` : 'Select a player'}
          </h2>

          <div className="players-grid">
            {alivePlayers.map((p) => (
              <button
                key={p.uid}
                className={`player-card ${selectedTarget === p.uid ? 'selected' : ''}`}
                style={{ borderColor: p.color }}
                onClick={() => !submitted && setSelectedTarget(p.uid)}
                disabled={submitted}
              >
                {p.photoURL && (
                  <img src={p.photoURL} alt={p.name} className="player-avatar" />
                )}
                <div className="player-name">{p.name}</div>
                {selectedTarget === p.uid && (
                  <div className="selected-indicator">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {!submitted ? (
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={hasAction && !selectedTarget}
          >
            {hasAction ? `Confirm ${roleInfo.action}` : 'Confirm Vote'}
          </button>
        ) : (
          <div className="submitted-message">
            ✓ Action submitted. Waiting for other players...
          </div>
        )}
      </div>
    </div>
  );
}

export default NightPhase;

