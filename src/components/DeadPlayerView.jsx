import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import './DeadPlayerView.css';

function DeadPlayerView({ game, player }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const alivePlayers = Object.values(game.players || {}).filter(p => p.isAlive).sort((a, b) => a.name.localeCompare(b.name));

  const handleLeave = async () => {
    try {
      await gameService.leaveGame(user.uid);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Leave error:', error);
    }
  };

  return (
    <div className="dead-view-container">
      <div className="dead-view-content">
        <div className="phase-info">
          Round {game.round} - {game.phase === 'night' ? '🌙 NIGHT' : '☀️ DAY'}
        </div>

        <div className="death-banner">
          {player.isSpectator ? (
            <>
              <div className="coffin-icon">👁️</div>
              <h1>Spectator Mode</h1>
              <p>You joined while the game was in progress</p>
            </>
          ) : (
            <>
              <div className="coffin-icon">⚰️</div>
              <h1>You Are Dead</h1>
              <p>You were eliminated in Round {player.eliminatedRound || game.round}</p>
            </>
          )}
        </div>

        <div className="spectator-info">
          <p>You can spectate but cannot vote or perform actions.</p>
          <p className="watch-text">Watch the game unfold!</p>
        </div>

        <div className="game-status">
          <h3>Current Status:</h3>
          <ul>
            <li>Round: {game.round}</li>
            <li>Phase: {game.phase === 'night' ? 'Night' : 'Day'}</li>
            <li>Alive Players: {alivePlayers.length}</li>
          </ul>
        </div>

        <div className="alive-list">
          <h3>Still Alive:</h3>
          <div className="players-row">
            {alivePlayers.map(p => (
              <span key={p.uid} className="player-tag" style={{ borderColor: p.color }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <button className="btn-leave" onClick={handleLeave}>
          Leave Game
        </button>
      </div>
    </div>
  );
}

export default DeadPlayerView;

