import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import './DayPhase.css';

function DayPhase({ game, player }) {
  const { user } = useAuth();
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [voteCounts, setVoteCounts] = useState({});

  const alivePlayers = Object.values(game.players || {}).filter(p => p.isAlive);

  useEffect(() => {
    if (game.votes && game.votes[user.uid]) {
      setSubmitted(true);
      setSelectedTarget(game.votes[user.uid].targetId);
    }

    const counts = {};
    if (game.votes) {
      Object.values(game.votes).forEach(vote => {
        if (vote.targetId) {
          counts[vote.targetId] = (counts[vote.targetId] || 0) + 1;
        }
      });
    }
    setVoteCounts(counts);
  }, [game.votes, user.uid]);

  const handleVote = async () => {
    if (!selectedTarget) return;

    try {
      await gameService.submitVote(user.uid, selectedTarget);
      setSubmitted(true);
    } catch (error) {
      console.error('Vote error:', error);
      alert(error.message || 'Failed to submit vote');
    }
  };

  const getVoteIndicators = (playerId) => {
    if (!game.votes) return [];
    return Object.entries(game.votes)
      .filter(([uid, vote]) => vote.targetId === playerId)
      .map(([uid]) => game.players[uid]?.color)
      .filter(Boolean);
  };

  return (
    <div className="day-phase-container">
      <div className="day-phase-content">
        <h1 className="phase-title">☀️ Day Phase</h1>
        <p className="phase-subtitle">Round {game.round} - Discussion & Voting</p>

        <div className="voting-section">
          <h2 className="section-title">Vote to Eliminate</h2>

          <div className="players-list">
            {alivePlayers.map((p) => {
              const votes = getVoteIndicators(p.uid);
              const isSelected = selectedTarget === p.uid;
              
              return (
                <button
                  key={p.uid}
                  className={`player-vote-card ${isSelected ? 'selected' : ''}`}
                  style={{ borderLeftColor: p.color }}
                  onClick={() => !submitted && p.uid !== user.uid && setSelectedTarget(p.uid)}
                  disabled={submitted || p.uid === user.uid}
                >
                  <div className="player-info">
                    {p.photoURL && (
                      <img src={p.photoURL} alt={p.name} className="player-avatar" />
                    )}
                    <div className="player-details">
                      <div className="player-name">
                        {p.name}
                        {p.uid === user.uid && <span className="you-badge">You</span>}
                      </div>
                      {votes.length > 0 && (
                        <div className="vote-indicators">
                          {votes.map((color, idx) => (
                            <span
                              key={idx}
                              className="vote-dot"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <span className="vote-count">{votes.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="selected-badge">✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!submitted ? (
          <button
            className="btn-vote"
            onClick={handleVote}
            disabled={!selectedTarget}
          >
            Confirm Vote
          </button>
        ) : (
          <div className="submitted-message">
            ✓ Vote submitted. Waiting for other players...
          </div>
        )}
      </div>
    </div>
  );
}

export default DayPhase;

