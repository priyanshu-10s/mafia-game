import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Admin.css';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

function Admin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [game, setGame] = useState(null);
  const [showPlayers, setShowPlayers] = useState(false);

  useEffect(() => {
    if (!authenticated || !db) return;

    const gameRef = doc(db, 'games', 'current_game');
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setGame(snapshot.data());
      } else {
        setGame(null);
      }
    });

    return () => unsubscribe();
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
      const gameRef = doc(db, 'games', 'current_game');
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        setMessage('No game found. Create a game first.');
        return;
      }

      const gameData = gameSnap.data();
      const players = gameData.players || {};
      
      const hostPlayer = Object.values(players).find(p => p.email === email);
      
      if (!hostPlayer) {
        setMessage('Player with this email not found in game');
        return;
      }

      await updateDoc(gameRef, {
        hostId: hostPlayer.uid
      });

      setMessage(`Host assigned to ${hostPlayer.name} (${email})`);
      setEmail('');
    } catch (error) {
      console.error('Assign host error:', error);
      setMessage('Failed to assign host: ' + error.message);
    }
  };

  const players = game?.players ? Object.values(game.players) : [];
  const hostPlayer = players.find(p => p.uid === game?.hostId);

  const getStatusText = (status) => {
    switch (status) {
      case 'lobby': return 'In Lobby';
      case 'night': return 'Night Phase';
      case 'day': return 'Day Phase';
      case 'ended': return 'Game Ended';
      default: return 'Unknown';
    }
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
          <form onSubmit={handleAssignHost}>
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
            <div className={`admin-message ${message.includes('Failed') || message.includes('not found') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="admin-section">
          <h2>Current Game Status</h2>
          {game ? (
            <div className="game-status">
              <div className="status-row">
                <span className="status-label">Status:</span>
                <span className="status-value">{getStatusText(game.status)}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Players:</span>
                <span className="status-value">{players.length}/20</span>
              </div>
              <div className="status-row">
                <span className="status-label">Host:</span>
                <span className="status-value">{hostPlayer?.email || 'Not assigned'}</span>
              </div>
              {game.round > 0 && (
                <div className="status-row">
                  <span className="status-label">Round:</span>
                  <span className="status-value">{game.round}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="no-game">No active game</p>
          )}

          <button 
            className="btn-view-players"
            onClick={() => setShowPlayers(!showPlayers)}
          >
            {showPlayers ? 'Hide Players' : 'View All Players'}
          </button>

          {showPlayers && players.length > 0 && (
            <div className="players-list">
              {players.map(p => (
                <div key={p.uid} className="player-row" style={{ borderLeftColor: p.color }}>
                  <span className="player-name">{p.name}</span>
                  <span className="player-email">{p.email}</span>
                  {p.uid === game?.hostId && <span className="host-badge">Host</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn-back" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default Admin;
