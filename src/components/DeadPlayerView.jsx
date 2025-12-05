import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { gameService } from '../services/gameService';
import Timer from './Timer';
import './DeadPlayerView.css';

function DeadPlayerView({ game, player }) {
  const { user, logout } = useAuth();
  const { lobbyId, clearLobby } = useGame();
  const navigate = useNavigate();

  const alivePlayers = Object.values(game.players || {}).filter(p => p.isAlive).sort((a, b) => a.name.localeCompare(b.name));
  const votes = game.votes || {};
  const aliveCount = alivePlayers.length;
  const votedCount = Object.keys(votes).length;
  const isDayPhase = game.phase === 'day';

  const handleChangeLobby = async () => {
    try {
      await gameService.leaveGame(user.uid, lobbyId);
      clearLobby();
      navigate('/select-lobby');
    } catch (error) {
      console.error('Leave error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await gameService.leaveGame(user.uid, lobbyId);
      clearLobby();
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
    <div className="dead-view-container">
      <div className="dead-view-content">
        <div className="phase-header-spectator">
          <div className="phase-info">
            Round {game.round} - {game.phase === 'night' ? '🌙 NIGHT' : '☀️ DAY'}
          </div>
          {isDayPhase && game.dayEndTime && <Timer endTime={game.dayEndTime} />}
        </div>

        <div className="death-banner compact">
          {player.isSpectator ? (
            <>
              <span className="status-icon">👁️</span>
              <span className="status-text">Spectating</span>
            </>
          ) : (
            <>
              <span className="status-icon">⚰️</span>
              <span className="status-text">Eliminated R{player.eliminatedRound || game.round}</span>
            </>
          )}
        </div>

        {isDayPhase ? (
          <div className="spectator-voting">
            <h2 className="voting-title">🗳️ Live Voting</h2>
            
            <div className="spectator-players-list">
              {alivePlayers.map((p) => {
                const voteCount = getVoteCount(p.uid);
                const voteColors = getVoteIndicators(p.uid);
                
                return (
                  <div
                    key={p.uid}
                    className="spectator-player-card"
                    style={{ borderLeftColor: p.color }}
                  >
                    <div className="player-info">
                      {p.photoURL && (
                        <img src={p.photoURL} alt={p.name} className="player-avatar" />
                      )}
                      <div className="player-details">
                        <div className="player-name">{p.name}</div>
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
                  </div>
                );
              })}
            </div>

            <div className="vote-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(votedCount / aliveCount) * 100}%` }}
                />
              </div>
              <span className="progress-text">{votedCount}/{aliveCount} voted</span>
            </div>
          </div>
        ) : (
          <div className="night-status">
            <div className="night-icon">🌙</div>
            <h2>Night Phase</h2>
            <p>The mafia is making their move...</p>
            <div className="alive-count">{aliveCount} players remaining</div>
          </div>
        )}

        <div className="dead-actions">
          <button className="btn-change-lobby" onClick={handleChangeLobby}>
            Change Lobby
          </button>
          <button className="btn-leave" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeadPlayerView;
