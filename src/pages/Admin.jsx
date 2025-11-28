import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Admin.css';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

function Admin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

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
            <button type="submit" className="btn-admin">Assign Host</button>
          </form>
          {message && (
            <div className={`admin-message ${message.includes('Failed') ? 'error' : 'success'}`}>
              {message}
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

