import { useState } from 'react';
import { createDummyUsers, removeDummyUsers, dummyUsersVote, DUMMY_USERS, LOBBIES } from './createDummyUsers';
import './DummyUserPanel.css';

function DummyUserPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedLobby, setSelectedLobby] = useState('lobby_1');

  const handleCreate = async () => {
    setLoading(true);
    setMessage('');
    try {
      await createDummyUsers(selectedLobby);
      setMessage(`✅ Created ${DUMMY_USERS.length} dummy users in ${getLobbyName(selectedLobby)}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    if (!confirm(`Remove all dummy users from ${getLobbyName(selectedLobby)}?`)) return;
    
    setLoading(true);
    setMessage('');
    try {
      await removeDummyUsers(selectedLobby);
      setMessage(`✅ Dummy users removed from ${getLobbyName(selectedLobby)}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleVote = async () => {
    setLoading(true);
    setMessage('');
    try {
      const count = await dummyUsersVote(selectedLobby);
      setMessage(`✅ ${count} dummy users voted randomly in ${getLobbyName(selectedLobby)}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  const getLobbyName = (lobbyId) => {
    const lobby = LOBBIES.find(l => l.id === lobbyId);
    return lobby ? `${lobby.icon} ${lobby.name}` : lobbyId;
  };

  return (
    <div className="dummy-panel">
      <h2>🧪 Test Utilities</h2>
      <p className="dummy-description">
        Create dummy users for local testing. Select a lobby and add test users.
      </p>

      <div className="lobby-selector">
        <label>Select Lobby:</label>
        <select 
          value={selectedLobby} 
          onChange={(e) => setSelectedLobby(e.target.value)}
          className="lobby-select"
        >
          {LOBBIES.map(lobby => (
            <option key={lobby.id} value={lobby.id}>
              {lobby.icon} {lobby.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dummy-users-list">
        <h3>Dummy Users:</h3>
        <ul>
          {DUMMY_USERS.map(user => (
            <li key={user.uid}>
              <span className="user-color" style={{ backgroundColor: user.color }}></span>
              <strong>{user.name}</strong> ({user.email})
            </li>
          ))}
        </ul>
      </div>

      <div className="dummy-actions">
        <button 
          className="btn-create"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Dummy Users'}
        </button>
        
        <button 
          className="btn-vote"
          onClick={handleVote}
          disabled={loading}
        >
          {loading ? 'Voting...' : '🎲 Random Vote (All Dummies)'}
        </button>
        
        <button 
          className="btn-remove"
          onClick={handleRemove}
          disabled={loading}
        >
          {loading ? 'Removing...' : 'Remove Dummy Users'}
        </button>
      </div>

      {message && (
        <div className={`dummy-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="dummy-note">
        <strong>Note:</strong> This panel is only for development. Remove the test-utils folder before production.
      </div>
    </div>
  );
}

export default DummyUserPanel;
