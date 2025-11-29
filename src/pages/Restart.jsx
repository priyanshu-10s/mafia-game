import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { gameService, LOBBIES } from '../services/gameService';
import './Restart.css';

function Restart() {
  const { user } = useAuth();
  const { game, isHost, loading, lobbyId } = useGame();
  const navigate = useNavigate();
  const [restarting, setRestarting] = useState(false);
  const [message, setMessage] = useState('');

  const lobbyInfo = LOBBIES.find(l => l.id === lobbyId);

  const handleRestart = async () => {
    if (!isHost) {
      setMessage('Only the host can restart the game');
      return;
    }

    if (!lobbyId) {
      setMessage('No lobby selected');
      return;
    }

    if (!confirm('Are you sure you want to restart the game? This will reset all progress.')) {
      return;
    }

    setRestarting(true);
    setMessage('');

    try {
      await gameService.resetGame(user.uid, lobbyId);
      setMessage('Game restarted successfully!');
      setTimeout(() => {
        navigate('/lobby');
      }, 1500);
    } catch (error) {
      console.error('Restart error:', error);
      setMessage('Failed to restart: ' + error.message);
      setRestarting(false);
    }
  };

  if (loading) {
    return (
      <div className="restart-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="restart-container">
        <div className="restart-content">
          <h1>🔄 Restart Game</h1>
          <div className="restart-message error">
            Please sign in first
          </div>
          <button className="btn-back" onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!lobbyId) {
    return (
      <div className="restart-container">
        <div className="restart-content">
          <h1>🔄 Restart Game</h1>
          <div className="restart-message error">
            No lobby selected
          </div>
          <button className="btn-back" onClick={() => navigate('/select-lobby')}>
            Select a Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="restart-container">
        <div className="restart-content">
          {lobbyInfo && (
            <div className="lobby-badge">
              {lobbyInfo.icon} {lobbyInfo.name}
            </div>
          )}
          <h1>🔄 Restart Game</h1>
          <div className="restart-message error">
            ⚠️ Only the host can restart the game
          </div>
          <div className="info-box">
            <p>Current host: <strong>{game?.players?.[game?.hostId]?.name || 'Unknown'}</strong></p>
            <p>Ask them to restart the game, or use the admin panel to reassign host.</p>
          </div>
          <button className="btn-back" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="restart-container">
      <div className="restart-content">
        {lobbyInfo && (
          <div className="lobby-badge">
            {lobbyInfo.icon} {lobbyInfo.name}
          </div>
        )}
        <h1>🔄 Restart Game</h1>
        
        <div className="warning-box">
          <div className="warning-icon">⚠️</div>
          <h2>Are you sure?</h2>
          <p>This will:</p>
          <ul>
            <li>End the current game in {lobbyInfo?.name || 'this lobby'}</li>
            <li>Reset all roles and game progress</li>
            <li>Keep all players in the lobby</li>
            <li>Preserve game settings</li>
          </ul>
        </div>

        {game && (
          <div className="game-info">
            <h3>Current Game Status</h3>
            <div className="status-row">
              <span>Status:</span>
              <span>{game.status}</span>
            </div>
            <div className="status-row">
              <span>Round:</span>
              <span>{game.round || 0}</span>
            </div>
            <div className="status-row">
              <span>Players:</span>
              <span>{Object.keys(game.players || {}).length}</span>
            </div>
          </div>
        )}

        {message && (
          <div className={`restart-message ${message.includes('Failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <button 
          className="btn-restart"
          onClick={handleRestart}
          disabled={restarting}
        >
          {restarting ? 'Restarting...' : '🔄 Restart Game'}
        </button>

        <button className="btn-back" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default Restart;
