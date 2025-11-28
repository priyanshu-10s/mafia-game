import { useState } from 'react';
import { createDummyUsers, removeDummyUsers, DUMMY_USERS } from './createDummyUsers';
import './DummyUserPanel.css';

function DummyUserPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setMessage('');
    try {
      await createDummyUsers();
      setMessage(`✅ Created ${DUMMY_USERS.length} dummy users`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    if (!confirm('Remove all dummy users?')) return;
    
    setLoading(true);
    setMessage('');
    try {
      await removeDummyUsers();
      setMessage('✅ Dummy users removed');
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="dummy-panel">
      <h2>🧪 Test Utilities</h2>
      <p className="dummy-description">
        Create dummy users for local testing. These users will be added to the current game.
      </p>

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

