import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { gameService } from '../services/gameService';
import GameSettings from '../components/GameSettings';
import './Lobby.css';

function Lobby() {
  const { user, logout } = useAuth();
  const { game, player, isHost, loading } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (game?.status === 'playing') {
      navigate('/game');
    }
  }, [game, navigate]);

  useEffect(() => {
    if (!loading && (!game || !player)) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, game, player, navigate]);

  const handleStartGame = async () => {
    try {
      await gameService.startGame(user.uid);
    } catch (error) {
      alert(error.message || 'Failed to start game');
    }
  };

  const handleKickPlayer = async (targetUserId) => {
    if (!confirm('Are you sure you want to kick this player?')) return;
    
    try {
      await gameService.kickPlayer(user.uid, targetUserId);
    } catch (error) {
      alert(error.message || 'Failed to kick player');
    }
  };

  const handleLeaveGame = async () => {
    if (!confirm('Are you sure you want to leave?')) return;
    
    try {
      await gameService.leaveGame(user.uid);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Leave game error:', error);
    }
  };

  if (loading) {
    return (
      <div className="lobby-container">
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!game || !player) {
    return (
      <div className="lobby-container">
        <div className="loading-state">
          <p>No game found. Redirecting...</p>
        </div>
      </div>
    );
  }

  const players = Object.values(game.players || {}).sort((a, b) => a.name.localeCompare(b.name));
  const canStart = players.length >= 4;

  return (
    <div className="lobby-container">
      <div className="lobby-content">
        <h1 className="lobby-title">Waiting for Players</h1>
        
        <div className="player-count">
          Players ({players.length})
        </div>

        <div className="players-list">
          {players.map((p) => (
            <div 
              key={p.uid} 
              className={`player-item ${p.uid === user.uid ? 'current-player' : ''}`}
              style={{ borderLeftColor: p.color }}
            >
              <div className="player-info">
                {p.photoURL && (
                  <img src={p.photoURL} alt={p.name} className="player-avatar" />
                )}
                <div className="player-details">
                  <div className="player-name">
                    {p.name}
                    {p.uid === game.hostId && <span className="host-badge">Host</span>}
                    {p.uid === user.uid && <span className="you-badge">You</span>}
                  </div>
                  <div className="player-status">
                    {p.connectionStatus === 'disconnected' ? (
                      <span className="status-disconnected">⚠️ Disconnected</span>
                    ) : (
                      <span className="status-online">✓ Online</span>
                    )}
                  </div>
                </div>
              </div>
              {isHost && p.uid !== user.uid && (
                <button 
                  className="kick-btn"
                  onClick={() => handleKickPlayer(p.uid)}
                >
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>

        {isHost && (
          <>
            <GameSettings game={game} />
            <button 
              className="btn-start"
              onClick={handleStartGame}
              disabled={!canStart}
            >
              {canStart ? 'Start Game' : `Need ${4 - players.length} more player${4 - players.length > 1 ? 's' : ''}`}
            </button>
          </>
        )}

        {!isHost && (
          <div className="waiting-message">
            Waiting for host to start the game...
          </div>
        )}

        <button className="btn-leave" onClick={handleLeaveGame}>
          Leave Game
        </button>
      </div>
    </div>
  );
}

export default Lobby;
