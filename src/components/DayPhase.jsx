import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import Timer from './Timer';
import './DayPhase.css';

function DayPhase({ game, player }) {
  const { user } = useAuth();
  const [selectedTarget, setSelectedTarget] = useState(null);

  const alivePlayers = Object.values(game.players || {})
    .filter(p => p.isAlive)
    .sort((a, b) => a.name.localeCompare(b.name));
  const votes = game.votes || {};
  const aliveCount = alivePlayers.length;
  const votedCount = Object.keys(votes).length;
  const waitingCount = aliveCount - votedCount;
  const hasVoted = !!votes[user.uid];

  useEffect(() => {
    const myVote = votes[user.uid];
    if (myVote) {
      setSelectedTarget(myVote.targetId);
    } else {
      setSelectedTarget(null);  // Reset when vote is removed
    }
  }, [votes, user.uid]);

  const submitVote = useCallback(async (targetId) => {
    try {
      console.log('Submitting vote:', targetId);
      await gameService.submitVote(user.uid, targetId);
      console.log('Vote saved successfully:', targetId);
    } catch (error) {
      console.error('Vote error:', error);
      alert('Failed to save vote: ' + error.message);
    }
  }, [user.uid]);

  const handleSelectPlayer = async (playerId) => {
    if (playerId === user.uid) return;
    setSelectedTarget(playerId);
    await submitVote(playerId);
  };

  const handleNoVote = async () => {
    setSelectedTarget('skip');
    await submitVote('skip');
  };

  const getVoteCount = (playerId) => {
    return Object.values(votes).filter(v => v.targetId === playerId).length;
  };

  const getVoteIndicators = (playerId) => {
    return Object.entries(votes)
      .filter(([uid, vote]) => vote.targetId === playerId)
      .map(([uid]) => game.players[uid]?.color)
      .filter(Boolean);
  };

  return (
    <div className="day-phase-container">
      <div className="day-phase-content">
        <div className="phase-header">
          <div className="phase-info">
            <span className="round-badge">Round {game.round}</span>
            <span className="phase-name">☀️ DAY VOTING</span>
          </div>
          <Timer endTime={game.dayEndTime} />
        </div>

        <h1 className="phase-title">Vote to Eliminate</h1>

        <div className="players-list">
          {alivePlayers.map((p) => {
            const voteCount = getVoteCount(p.uid);
            const voteColors = getVoteIndicators(p.uid);
            const isSelected = selectedTarget === p.uid;
            const isYou = p.uid === user.uid;
            
            return (
              <button
                key={p.uid}
                className={`player-vote-card ${isSelected ? 'selected' : ''} ${isYou ? 'is-you' : ''}`}
                style={{ borderLeftColor: p.color }}
                onClick={() => handleSelectPlayer(p.uid)}
                disabled={isYou}
              >
                <div className="player-info">
                  {p.photoURL && (
                    <img src={p.photoURL} alt={p.name} className="player-avatar" />
                  )}
                  <div className="player-details">
                    <div className="player-name">
                      {p.name}
                      {isYou && <span className="you-badge">You</span>}
                    </div>
                    <div className="vote-info">
                      <span className="vote-count">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                      {voteColors.length > 0 && (
                        <div className="vote-indicators">
                          {voteColors.map((color, idx) => (
                            <span key={idx} className="vote-dot" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {isSelected && <div className="selected-badge">✓</div>}
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
          
          <div className="confirmed-status">
            Voted: {votedCount}/{aliveCount}
            {waitingCount > 0 && hasVoted && (
              <span className="waiting-flash"> ⚡ Waiting for {waitingCount}...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DayPhase;
