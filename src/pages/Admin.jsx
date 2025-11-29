import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { gameService, LOBBIES } from '../services/gameService';
import './Admin.css';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

function Admin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [lobbiesData, setLobbiesData] = useState({});
  const [selectedLobby, setSelectedLobby] = useState(LOBBIES[0].id);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showPlayers, setShowPlayers] = useState({});

  useEffect(() => {
    if (!authenticated || !db) return;

    // Subscribe to all lobbies
    const unsubscribes = LOBBIES.map(lobby => {
      const gameRef = doc(db, 'games', lobby.id);
      return onSnapshot(gameRef, (snapshot) => {
        setLobbiesData(prev => ({
          ...prev,
          [lobby.id]: snapshot.exists() ? snapshot.data() : null
        }));
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [authenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setMessage('');
    } else {
      setMessage('Incorrect password');
    }
  };

  const handleAssignHost = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter an email');
      return;
    }

    try {
      const hostPlayer = await gameService.assignHost(selectedLobby, email);
      setMessage(`Host assigned to ${hostPlayer.name} in ${getLobbyName(selectedLobby)}`);
      setEmail('');
    } catch (error) {
      console.error('Assign host error:', error);
      setMessage('Failed: ' + error.message);
    }
  };

  const getLobbyName = (lobbyId) => {
    return LOBBIES.find(l => l.id === lobbyId)?.name || lobbyId;
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'lobby': return 'In Lobby';
      case 'playing': return 'Playing';
      case 'ended': return 'Ended';
      default: return 'Empty';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'lobby': return 'status-lobby';
      case 'playing': return 'status-playing';
      case 'ended': return 'status-ended';
      default: return 'status-empty';
    }
  };

  const togglePlayers = (lobbyId) => {
    setShowPlayers(prev => ({
      ...prev,
      [lobbyId]: !prev[lobbyId]
    }));
  };

  if (!authenticated) {
    return (
      <div className="admin-container">
        <div className="admin-login">
          <h1>🔐 Admin Panel</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
            />
            <button type="submit" className="btn-admin">Login</button>
            {message && <div className="admin-message error">{message}</div>}
          </form>
          <button className="btn-back" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-panel">
        <h1>⚙️ Admin Panel</h1>
        
        <div className="admin-section">
          <h2>Assign Host</h2>
          <form onSubmit={handleAssignHost} className="assign-host-form">
            <select 
              value={selectedLobby} 
              onChange={(e) => setSelectedLobby(e.target.value)}
              className="admin-select"
            >
              {LOBBIES.map(lobby => (
                <option key={lobby.id} value={lobby.id}>
                  {lobby.icon} {lobby.name}
                </option>
              ))}
            </select>
            <input
              type="email"
              placeholder="Player email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
            />
            <button type="submit" className="btn-admin">Make Host</button>
          </form>
          {message && (
            <div className={`admin-message ${message.includes('Failed') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="admin-section">
          <h2>All Lobbies Status</h2>
          <div className="lobbies-overview">
            {LOBBIES.map(lobby => {
              const game = lobbiesData[lobby.id];
              const players = game?.players ? Object.values(game.players).sort((a, b) => a.name.localeCompare(b.name)) : [];
              const hostPlayer = players.find(p => p.uid === game?.hostId);

              return (
                <div key={lobby.id} className="lobby-status-card">
                  <div className="lobby-header">
                    <span className="lobby-icon">{lobby.icon}</span>
                    <span className="lobby-name">{lobby.name}</span>
                    <span className={`status-pill ${getStatusClass(game?.status)}`}>
                      {getStatusText(game?.status)}
                    </span>
                  </div>

                  <div className="lobby-details">
                    <div className="detail-row">
                      <span className="detail-label">Players:</span>
                      <span className="detail-value">{players.length}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Host:</span>
                      <span className="detail-value">{hostPlayer?.name || 'None'}</span>
                    </div>
                    {game?.status === 'playing' && (
                      <>
                        <div className="detail-row">
                          <span className="detail-label">Phase:</span>
                          <span className="detail-value">{game.phase}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Round:</span>
                          <span className="detail-value">{game.round}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button 
                    className="btn-toggle-players"
                    onClick={() => togglePlayers(lobby.id)}
                  >
                    {showPlayers[lobby.id] ? 'Hide Players' : 'Show Players'}
                  </button>

                  {showPlayers[lobby.id] && players.length > 0 && (
                    <div className="players-list">
                      {players.map(p => (
                        <div key={p.uid} className="player-row" style={{ borderLeftColor: p.color }}>
                          <span className="player-name">{p.name}</span>
                          <span className="player-email">{p.email}</span>
                          {p.uid === game?.hostId && <span className="host-badge">Host</span>}
                          {game?.status === 'playing' && (
                            <span className={`alive-badge ${p.isAlive ? 'alive' : 'dead'}`}>
                              {p.isAlive ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {players.length === 0 && (
                    <p className="no-players">No players in this lobby</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button className="btn-back" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default Admin;
