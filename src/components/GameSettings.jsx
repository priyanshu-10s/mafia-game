import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gameService } from '../services/gameService';
import './GameSettings.css';

function GameSettings({ game }) {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(game.settings || {
    numMafia: 2,
    hasDetective: true,
    hasDoctor: true,
    dayTimer: 5,
    nightTimer: 1,
    revealOnDeath: false
  });

  const handleSave = async () => {
    try {
      await gameService.updateSettings(user.uid, settings);
      setShowSettings(false);
    } catch (error) {
      alert(error.message || 'Failed to update settings');
    }
  };

  return (
    <>
      <button 
        className="btn-settings"
        onClick={() => setShowSettings(true)}
      >
        ⚙️ Game Settings
      </button>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚙️ Game Settings</h2>

            <div className="settings-section">
              <h3>Basic</h3>
              
              <div className="setting-item">
                <label>Number of Mafia</label>
                <div className="mafia-buttons">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      className={settings.numMafia === num ? 'active' : ''}
                      onClick={() => setSettings({...settings, numMafia: num})}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-item">
                <label>Special Roles</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.hasDetective}
                    onChange={(e) => setSettings({...settings, hasDetective: e.target.checked})}
                  />
                  Detective
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.hasDoctor}
                    onChange={(e) => setSettings({...settings, hasDoctor: e.target.checked})}
                  />
                  Doctor
                </label>
              </div>

              <div className="setting-item">
                <label>Phase Timers (minutes)</label>
                <div className="timer-inputs">
                  <div>
                    <label>Day:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.dayTimer}
                      onChange={(e) => setSettings({...settings, dayTimer: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label>Night:</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={settings.nightTimer}
                      onChange={(e) => setSettings({...settings, nightTimer: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Advanced</h3>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.revealOnDeath}
                  onChange={(e) => setSettings({...settings, revealOnDeath: e.target.checked})}
                />
                Reveal role when player dies
              </label>
            </div>

            <div className="settings-actions">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GameSettings;

