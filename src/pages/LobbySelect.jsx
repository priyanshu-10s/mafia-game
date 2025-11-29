import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { gameService, LOBBIES } from '../services/gameService';
import './LobbySelect.css';

function LobbySelect() {
  const { user, logout, loading: authLoading } = useAuth();
  const { selectLobby } = useGame();
  const navigate = useNavigate();
  const [lobbiesStatus, setLobbiesStatus] = useState({});
  const [currentUserLobby, setCurrentUserLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadLobbiesStatus();
      // Refresh every 5 seconds
      const interval = setInterval(loadLobbiesStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadLobbiesStatus = async () => {
    try {
      const statuses = await gameService.getAllLobbiesStatus();
      setLobbiesStatus(statuses);
      
      // Find which lobby the user is currently in
      if (user) {
        const userLobby = await gameService.findUserLobby(user.uid);
        setCurrentUserLobby(userLobby);
      }
    } catch (error) {
      console.error('Failed to load lobbies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async (lobbyId) => {
    if (!user || joining) return;
    
    // If switching lobbies, confirm with user
    if (currentUserLobby && currentUserLobby !== lobbyId) {
      const currentLobbyName = LOBBIES.find(l => l.id === currentUserLobby)?.name || currentUserLobby;
      if (!confirm(`You're currently in ${currentLobbyName}. Switch to this lobby?`)) {
        return;
      }
    }
    
    setJoining(lobbyId);
    try {
      const player = await gameService.joinGame(user, lobbyId);
      selectLobby(lobbyId);
      
      // If joined as spectator (late joiner), go directly to game
      if (player.isSpectator) {
        navigate('/game');
      } else {
        navigate('/lobby');
      }
    } catch (error) {
      console.error('Join lobby error:', error);
      alert(error.message || 'Failed to join lobby');
      setJoining(null);
    }
  };

  const handleContinue = () => {
    if (currentUserLobby) {
      selectLobby(currentUserLobby);
      const status = lobbiesStatus[currentUserLobby];
      if (status?.status === 'playing' || status?.status === 'ended') {
        navigate('/game');
      } else {
        navigate('/lobby');
      }
    }
  };

  const handleLogout = async () => {
    try {
      // Leave current lobby if in one
      if (currentUserLobby) {
        await gameService.leaveGame(user.uid, currentUserLobby);
      }
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.status) {
      case 'lobby':
        return <span className="status-badge waiting">Waiting</span>;
      case 'playing':
        return <span className="status-badge playing">In Game</span>;
      case 'ended':
        return <span className="status-badge ended">Ended</span>;
      default:
        return <span className="status-badge empty">Empty</span>;
    }
  };

  const getJoinButtonText = (lobbyId, status) => {
    if (currentUserLobby === lobbyId) return 'Continue';
    if (status?.status === 'playing') return 'Spectate';
    if (status?.status === 'ended') return 'View Results';
    return 'Join';
  };

  if (authLoading || loading) {
    return (
      <div className="lobby-select-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading lobbies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-select-container">
      <div className="lobby-select-content">
        <h1 className="page-title">🎭 Choose a Lobby</h1>
        <p className="welcome-text">Welcome, {user?.displayName}!</p>

        {currentUserLobby && (
          <div className="current-lobby-notice">
            <span>You're currently in </span>
            <strong>{LOBBIES.find(l => l.id === currentUserLobby)?.name}</strong>
            <button className="btn-continue-quick" onClick={handleContinue}>
              Continue →
            </button>
          </div>
        )}

        <div className="lobbies-grid">
          {LOBBIES.map((lobby) => {
            const status = lobbiesStatus[lobby.id];
            const isJoining = joining === lobby.id;
            const isCurrentLobby = currentUserLobby === lobby.id;
            
            return (
              <div key={lobby.id} className={`lobby-card ${isCurrentLobby ? 'current' : ''}`}>
                {isCurrentLobby && <div className="current-indicator">You're here</div>}
                <div className="lobby-header">
                  <span className="lobby-icon">{lobby.icon}</span>
                  <h2 className="lobby-name">{lobby.name}</h2>
                </div>
                
                <div className="lobby-info">
                  {getStatusBadge(status)}
                  <div className="player-count">
                    <span className="count-icon">👥</span>
                    <span>{status?.playerCount || 0} players</span>
                  </div>
                  {status?.hostName && (
                    <div className="host-info">
                      <span className="host-icon">👑</span>
                      <span>{status.hostName}</span>
                    </div>
                  )}
                </div>

                <button
                  className={`btn-join ${isJoining ? 'loading' : ''} ${isCurrentLobby ? 'current' : ''}`}
                  onClick={() => isCurrentLobby ? handleContinue() : handleJoinLobby(lobby.id)}
                  disabled={joining !== null}
                >
                  {isJoining ? (
                    <>
                      <span className="btn-spinner"></span>
                      Joining...
                    </>
                  ) : (
                    getJoinButtonText(lobby.id, status)
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button className="btn-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default LobbySelect;
